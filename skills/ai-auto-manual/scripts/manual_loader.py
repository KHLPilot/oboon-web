#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from typing import Any


class ManualLoader:
    def __init__(self, skill_root: Path) -> None:
        self.skill_root = Path(skill_root)
        self.manual_root = self.skill_root / "manuals"
        self.index_path = self.manual_root / "index.md"

    def load_index(self) -> str:
        return self.index_path.read_text(encoding="utf-8")

    def load_chapters(
        self, manual_ids: list[str], manual_catalog: dict[str, Any]
    ) -> dict[str, dict[str, str]]:
        output: dict[str, dict[str, str]] = {}
        for manual_id in manual_ids:
            metadata = manual_catalog.get(manual_id)
            if not metadata:
                continue
            relative_path = metadata.get("path")
            if not relative_path:
                continue
            abs_path = self.skill_root / Path(relative_path)
            if not abs_path.exists():
                continue
            output[manual_id] = {
                "title": metadata.get("title", manual_id),
                "path": abs_path.relative_to(self.skill_root).as_posix(),
                "content": abs_path.read_text(encoding="utf-8"),
            }
        return output

    def build_summary(
        self, index_text: str, selected_manuals: list[str], manual_catalog: dict[str, Any]
    ) -> str:
        overview = self._extract_overview(index_text)
        if not selected_manuals:
            return (
                f"{overview} No chapter matched specialized rules, so use index baseline checklist only."
            )
        titles = [
            manual_catalog.get(manual_id, {}).get("title", manual_id)
            for manual_id in selected_manuals
        ]
        title_blob = ", ".join(titles)
        return f"{overview} Required chapters: {title_blob}."

    def _extract_overview(self, index_text: str) -> str:
        for line in index_text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("#"):
                continue
            return stripped
        return "Read index checklist before implementation."
