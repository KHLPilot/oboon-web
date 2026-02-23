from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from memory_store import MemoryStore, load_structured_file  # noqa: E402
from post_task_hook import run_post_task_hook  # noqa: E402
from pre_plan_hook import run_pre_plan_hook  # noqa: E402
from pre_task_hook import run_pre_task_hook  # noqa: E402


class WorkMemoryHookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_root = Path(__file__).resolve().parents[1]
        self.rules = load_structured_file(self.skill_root / "config" / "memory_rules.yaml")

    def test_pre_plan_creates_docs_for_large_task(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            result = run_pre_plan_hook(
                request_text="새 기능 만들어줘. 백엔드 API와 프론트엔드 UI 전체 흐름 구현해줘",
                changed_files=["app/api/orders/route.ts", "components/OrderForm.tsx"],
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertTrue(result["is_large_task"])
            self.assertTrue(result["should_block"])
            self.assertEqual(len(result["created_documents"]), 3)
            self.assertTrue((workspace / ".ai-memory" / "plan.md").exists())
            self.assertTrue((workspace / ".ai-memory" / "context.md").exists())
            self.assertTrue((workspace / ".ai-memory" / "checklist.md").exists())

    def test_pre_task_blocks_when_plan_not_approved(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            store = MemoryStore(skill_root=self.skill_root, workspace_root=workspace, rules=self.rules)
            store.ensure_documents()

            result = run_pre_task_hook(
                request_text="다음 작업 진행",
                changed_files=[],
                skill_root=self.skill_root,
                workspace_root=workspace,
            )
            self.assertTrue(result["should_block"])
            self.assertEqual(result["plan_status"], "DRAFT")
            self.assertTrue(any("승인" in message or "APPROVED" in message for message in result["messages"]))

    def test_post_task_updates_checklist_and_context(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            store = MemoryStore(skill_root=self.skill_root, workspace_root=workspace, rules=self.rules)
            store.ensure_documents()

            docs = store.load_documents()
            docs["plan"] = docs["plan"].replace("Status: DRAFT", "Status: APPROVED")
            store.save_documents({"plan": docs["plan"]})

            result_text = (
                "Completed: Confirm project plan with reviewer\n"
                "Decision: Keep schema unchanged because migration risk is high\n"
                "Next: Implement first API task\n"
                "Validation: pnpm lint and pnpm build checked"
            )
            output = run_post_task_hook(
                result_text=result_text,
                changed_files=["app/api/orders/route.ts"],
                completed_items=[],
                new_items=[],
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertTrue(output["pass"])
            self.assertIn("Confirm project plan with reviewer", output["completed_items"])

            updated_docs = store.load_documents()
            self.assertIn("Session Updates", updated_docs["context"])
            self.assertIn("Decision", updated_docs["context"])
            self.assertIn("- [x] Confirm project plan with reviewer", updated_docs["checklist"])


if __name__ == "__main__":
    unittest.main()
