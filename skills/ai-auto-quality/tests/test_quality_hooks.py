from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from change_tracker import ChangeTracker, load_structured_file  # noqa: E402
from post_quality_hook import run_post_quality_hook  # noqa: E402


class AutoQualityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_root = Path(__file__).resolve().parents[1]
        self.rules = load_structured_file(self.skill_root / "config" / "quality_rules.yaml")

    def test_tracker_records_touched_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            tracker = ChangeTracker(workspace_root=workspace, rules=self.rules)
            tracker.start("task-1")
            tracker.record("task-1", ["app/api/users/route.ts"])
            tracker.record("task-1", ["components/UserCard.tsx", "app/api/users/route.ts"])
            snapshot = tracker.snapshot("task-1")
            self.assertEqual(
                snapshot["touched_files"],
                ["app/api/users/route.ts", "components/UserCard.tsx"],
            )

    def test_post_quality_routes_fix_now_for_small_issues(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            file_path = workspace / "app" / "api" / "users" / "route.ts"
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(
                (
                    "export async function GET() {\n"
                    "  try {\n"
                    "    return await fetch('/api/users').catch(() => null);\n"
                    "  } catch (error) {\n"
                    "    return null;\n"
                    "  }\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            output = run_post_quality_hook(
                task_id="task-fix",
                result_text="Completed API update with validation tests checked.",
                changed_files=["app/api/users/route.ts"],
                skill_root=self.skill_root,
                workspace_root=workspace,
                finalize=True,
            )

            self.assertEqual(output["action"], "fix_now")
            self.assertTrue(output["pass"])
            self.assertIn("셀프 체크 리마인더", output["reminder_message"])

    def test_post_quality_routes_escalate_on_critical(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            file_path = workspace / "app" / "api" / "billing" / "route.ts"
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(
                (
                    "const apiKey = '12345678901234567890';\n"
                    "export async function POST() {\n"
                    "  return fetch('/api/billing');\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            output = run_post_quality_hook(
                task_id="task-escalate",
                result_text="Completed billing route update.",
                changed_files=["app/api/billing/route.ts"],
                skill_root=self.skill_root,
                workspace_root=workspace,
                finalize=True,
            )

            self.assertEqual(output["action"], "escalate")
            self.assertFalse(output["pass"])
            self.assertGreaterEqual(output["severity_counts"]["critical"], 1)


if __name__ == "__main__":
    unittest.main()
