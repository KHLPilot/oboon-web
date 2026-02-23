from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import sys


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from run_chain import HookChain  # noqa: E402


class HookChainTests(unittest.TestCase):
    def setUp(self) -> None:
        self.chain_root = Path(__file__).resolve().parents[1]

    def test_pre_chain_creates_session_and_selected_manuals(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            route = workspace / "app" / "api" / "users" / "route.ts"
            route.parent.mkdir(parents=True, exist_ok=True)
            route.write_text(
                (
                    "export async function GET() {\n"
                    "  try {\n"
                    "    return await fetch('/api/users');\n"
                    "  } catch (error) {\n"
                    "    throw error;\n"
                    "  }\n"
                    "}\n"
                ),
                encoding="utf-8",
            )
            chain = HookChain(chain_skill_root=self.chain_root, workspace_root=workspace)
            result = chain.run_pre(
                task_id="chain-pre-1",
                request_text="새 기능 만들어줘. 백엔드 API 구현해줘",
                changed_files=["app/api/users/route.ts"],
            )

            self.assertEqual(result["phase"], "pre")
            self.assertTrue(result["should_block"])
            self.assertIn("backend", result["selected_manuals"])

            session_file = workspace / ".ai-chain" / "sessions" / "chain-pre-1.json"
            self.assertTrue(session_file.exists())
            session_payload = json.loads(session_file.read_text(encoding="utf-8"))
            self.assertIn("selected_manuals", session_payload)
            self.assertIn("backend", session_payload["selected_manuals"])

    def test_post_chain_uses_stored_manuals_and_returns_ok(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            route = workspace / "app" / "api" / "orders" / "route.ts"
            route.parent.mkdir(parents=True, exist_ok=True)
            route.write_text(
                (
                    "export async function POST() {\n"
                    "  try {\n"
                    "    return await fetch('/api/orders', {\n"
                    "      headers: { Authorization: 'Bearer token' }\n"
                    "    }).catch(() => null);\n"
                    "  } catch (error) {\n"
                    "    return null;\n"
                    "  }\n"
                    "}\n"
                ),
                encoding="utf-8",
            )

            chain = HookChain(chain_skill_root=self.chain_root, workspace_root=workspace)
            pre_result = chain.run_pre(
                task_id="chain-post-ok",
                request_text="API 기능 구현해줘",
                changed_files=["app/api/orders/route.ts"],
            )
            self.assertIn("backend", pre_result["selected_manuals"])

            post_result = chain.run_post(
                task_id="chain-post-ok",
                result_text=(
                    "Completed: Confirm project plan with reviewer\n"
                    "Decision: Keep auth header because API is protected\n"
                    "Next: Add UI validation test"
                ),
                changed_files=[],
                completed_items=[],
                new_items=[],
                selected_manuals_override=[],
            )

            self.assertEqual(post_result["phase"], "post")
            self.assertEqual(post_result["status"], "ok")
            self.assertEqual(post_result["action"], "fix_now")
            self.assertIn("ai-agent-team:run_agent_pipeline", post_result["order"])
            self.assertIn("ai_agent_team_post", post_result["outputs"])
            self.assertTrue(post_result["outputs"]["ai_agent_team_post"]["pass"])

    def test_post_chain_escalates_on_critical_findings(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
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

            chain = HookChain(chain_skill_root=self.chain_root, workspace_root=workspace)
            chain.run_pre(
                task_id="chain-post-escalate",
                request_text="결제 API 추가해줘",
                changed_files=["app/api/billing/route.ts"],
            )

            post_result = chain.run_post(
                task_id="chain-post-escalate",
                result_text="Completed billing API update",
                changed_files=["app/api/billing/route.ts"],
                completed_items=[],
                new_items=[],
                selected_manuals_override=[],
            )

            self.assertEqual(post_result["action"], "escalate")
            self.assertTrue(post_result["needs_attention"])
            self.assertEqual(post_result["status"], "needs_attention")
            self.assertFalse(post_result["outputs"]["ai_agent_team_post"]["pass"])


if __name__ == "__main__":
    unittest.main()
