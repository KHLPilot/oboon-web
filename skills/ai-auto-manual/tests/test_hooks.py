from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import sys


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from post_hook import run_post_hook  # noqa: E402
from pre_hook import run_pre_hook  # noqa: E402


class HookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_root = Path(__file__).resolve().parents[1]

    def test_pre_hook_keyword_intent_path_and_content_match(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            route_file = workspace / "app" / "api" / "users" / "route.ts"
            route_file.parent.mkdir(parents=True, exist_ok=True)
            route_file.write_text(
                (
                    "export async function GET() {\n"
                    "  try {\n"
                    "    return await fetch('/api/users', {\n"
                    "      headers: { Authorization: 'Bearer token' }\n"
                    "    });\n"
                    "  } catch (error) {\n"
                    "    throw error;\n"
                    "  }\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            component_file = workspace / "components" / "ProfileCard.tsx"
            component_file.parent.mkdir(parents=True, exist_ok=True)
            component_file.write_text("export const ProfileCard = () => null;\n", encoding="utf-8")

            request = "\ubc31\uc5d4\ub4dc API \uae30\ub2a5 \ucd94\uac00\ud574\uc918"
            changed_files = ["app/api/users/route.ts", "components/ProfileCard.tsx"]

            result = run_pre_hook(
                request_text=request,
                changed_files=changed_files,
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertIn("backend", result["selected_manuals"])
            self.assertIn("security", result["selected_manuals"])
            self.assertIn("frontend", result["selected_manuals"])
            self.assertEqual(result["required_reading"]["order"][0], "manuals/index.md")

    def test_pre_hook_detects_missing_try_catch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            route_file = workspace / "app" / "api" / "payments" / "route.ts"
            route_file.parent.mkdir(parents=True, exist_ok=True)
            route_file.write_text(
                (
                    "export async function POST() {\n"
                    "  const response = await fetch('/api/payments');\n"
                    "  return response;\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            result = run_pre_hook(
                request_text="API implement",
                changed_files=["app/api/payments/route.ts"],
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertIn("error-handling", result["selected_manuals"])
            self.assertTrue(
                any(
                    reason["rule_id"] == "missing_try_catch_content"
                    for reason in result["reasons"]
                )
            )

    def test_post_hook_reports_missing_items(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            route_file = workspace / "app" / "api" / "orders" / "route.ts"
            route_file.parent.mkdir(parents=True, exist_ok=True)
            route_file.write_text(
                (
                    "export async function POST() {\n"
                    "  const response = await fetch('/api/orders');\n"
                    "  return response;\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            result = run_post_hook(
                result_text="Implemented API endpoint.",
                changed_files=["app/api/orders/route.ts"],
                selected_manuals=["backend", "security", "error-handling"],
                skill_root=self.skill_root,
                workspace_root=workspace,
            )

            self.assertFalse(result["pass"])
            self.assertGreaterEqual(len(result["missing_items"]), 2)
            self.assertIn("Please review these quality gaps", result["reminder_message"])


if __name__ == "__main__":
    unittest.main()
