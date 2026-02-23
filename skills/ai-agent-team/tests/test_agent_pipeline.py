from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from run_agent_pipeline import run_agent_pipeline  # noqa: E402


class AgentPipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_root = Path(__file__).resolve().parents[1]
        self.context_pass = {
            "quality_post": {"pass": True},
            "manual_post": {"pass": True},
            "memory_post": {"pass": True, "completed_items": ["api validation implemented"]},
        }

    def _create_memory_files(self, workspace: Path) -> None:
        memory_root = workspace / ".ai-memory"
        memory_root.mkdir(parents=True, exist_ok=True)
        (memory_root / "plan.md").write_text("# Plan\nStatus: APPROVED\n", encoding="utf-8")
        (memory_root / "context.md").write_text("# Context\n", encoding="utf-8")
        (memory_root / "checklist.md").write_text("# Checklist\n", encoding="utf-8")

    def test_pipeline_passes_when_reports_are_clean(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            self._create_memory_files(workspace)
            route = workspace / "app" / "api" / "users" / "route.ts"
            route.parent.mkdir(parents=True, exist_ok=True)
            route.write_text(
                (
                    "export async function GET() {\n"
                    "  try {\n"
                    "    return await fetch('/api/users', {\n"
                    "      headers: { Authorization: 'Bearer token' }\n"
                    "    }).catch(() => null);\n"
                    "  } catch (error) {\n"
                    "    return null;\n"
                    "  }\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            output = run_agent_pipeline(
                task_id="team-pass",
                request_text="implement api",
                result_text="Completed: user API update with validation via pnpm lint and pnpm build",
                changed_files=["app/api/users/route.ts"],
                context=self.context_pass,
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertTrue(output["pass"])
            self.assertEqual(output["gate"]["status"], "pass")
            self.assertEqual(output["gate"]["action"], "pass")

    def test_pipeline_escalates_on_critical_security(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            self._create_memory_files(workspace)
            route = workspace / "app" / "api" / "billing" / "route.ts"
            route.parent.mkdir(parents=True, exist_ok=True)
            route.write_text(
                (
                    "const apiKey = '12345678901234567890';\n"
                    "export async function POST() {\n"
                    "  return fetch('/api/billing');\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            output = run_agent_pipeline(
                task_id="team-escalate",
                request_text="billing api",
                result_text="Completed billing update",
                changed_files=["app/api/billing/route.ts"],
                context=self.context_pass,
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertFalse(output["pass"])
            self.assertEqual(output["gate"]["action"], "escalate")
            self.assertGreaterEqual(output["summary"]["escalate_reports"], 1)

    def test_pipeline_returns_fix_now_for_limited_findings(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            self._create_memory_files(workspace)
            route = workspace / "app" / "api" / "orders" / "route.ts"
            route.parent.mkdir(parents=True, exist_ok=True)
            route.write_text(
                (
                    "export async function POST() {\n"
                    "  return fetch('/api/orders');\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            output = run_agent_pipeline(
                task_id="team-fix-loop",
                request_text="orders api",
                result_text="Completed orders update with validation via pnpm lint",
                changed_files=["app/api/orders/route.ts"],
                context=self.context_pass,
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertFalse(output["pass"])
            self.assertEqual(output["gate"]["status"], "needs_attention")
            self.assertEqual(output["gate"]["action"], "fix_now")


if __name__ == "__main__":
    unittest.main()
