#!/usr/bin/env python3
from __future__ import annotations

import fnmatch
import json
import re
from pathlib import Path
from typing import Any


class RuleConfigError(RuntimeError):
    pass


def load_structured_file(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ModuleNotFoundError as exc:
            raise RuleConfigError(
                "rules file is not valid JSON and PyYAML is not installed."
            ) from exc
        parsed = yaml.safe_load(text)
        if not isinstance(parsed, dict):
            raise RuleConfigError("rules file root must be an object.")
        return parsed


class RuleEngine:
    def __init__(self, config_path: Path, workspace_root: Path | None = None) -> None:
        self.config_path = Path(config_path)
        self.workspace_root = Path(workspace_root or Path.cwd())
        self.config = load_structured_file(self.config_path)
        self.manuals = self.config.get("manuals", {})
        self.weights = self.config.get("weights", {})

    def manual_catalog(self) -> dict[str, Any]:
        return dict(self.manuals)

    def analyze_pre(self, request_text: str, changed_files: list[str]) -> dict[str, Any]:
        normalized_files = [self._normalize_path(value) for value in changed_files]
        file_contents = self._read_files(normalized_files)
        scores = {manual_id: 0 for manual_id in self.manuals}
        reasons: list[dict[str, Any]] = []

        self._apply_text_rules(
            rule_set=self.config.get("keyword_rules", []),
            criterion="keyword",
            request_text=request_text,
            scores=scores,
            reasons=reasons,
        )
        self._apply_text_rules(
            rule_set=self.config.get("intent_rules", []),
            criterion="intent",
            request_text=request_text,
            scores=scores,
            reasons=reasons,
        )
        self._apply_path_rules(
            rule_set=self.config.get("path_rules", []),
            changed_files=normalized_files,
            scores=scores,
            reasons=reasons,
        )
        self._apply_content_rules(
            rule_set=self.config.get("content_rules", []),
            file_contents=file_contents,
            scores=scores,
            reasons=reasons,
        )

        selected = [
            manual_id
            for manual_id, score in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
            if score > 0
        ]

        return {
            "selected_manuals": selected,
            "scores": scores,
            "reasons": reasons,
        }

    def evaluate_post(
        self,
        result_text: str,
        changed_files: list[str],
        selected_manuals: list[str],
    ) -> dict[str, Any]:
        normalized_files = [self._normalize_path(value) for value in changed_files]
        file_contents = self._read_files(normalized_files)
        selected_set = set(selected_manuals)
        checks: list[dict[str, Any]] = []
        missing_items: list[str] = []

        for check in self.config.get("post_checks", []):
            applies_to = set(check.get("applies_to", []))
            if applies_to and selected_set.isdisjoint(applies_to):
                continue

            scope = check.get("scope", "result")
            scope_text, evaluated_files = self._build_scope_text(
                scope=scope,
                result_text=result_text,
                file_contents=file_contents,
                file_globs=check.get("file_globs", []),
            )

            matched_patterns = self._match_patterns(
                patterns=check.get("patterns", []),
                target_text=scope_text,
                matcher="regex",
                case_sensitive=False,
            )
            condition = check.get("condition", "must_match")
            is_pass = self._evaluate_condition(condition, matched_patterns)

            check_result = {
                "id": check.get("id", "unknown"),
                "category": check.get("category", "general"),
                "scope": scope,
                "condition": condition,
                "pass": is_pass,
                "matched_patterns": matched_patterns,
                "evaluated_files": evaluated_files,
                "message": check.get("message", ""),
            }
            checks.append(check_result)

            if not is_pass and check.get("message"):
                missing_items.append(check["message"])

        unique_missing = list(dict.fromkeys(missing_items))
        return {
            "checks": checks,
            "missing_items": unique_missing,
            "pass": len(unique_missing) == 0,
        }

    def _apply_text_rules(
        self,
        rule_set: list[dict[str, Any]],
        criterion: str,
        request_text: str,
        scores: dict[str, int],
        reasons: list[dict[str, Any]],
    ) -> None:
        for rule in rule_set:
            matcher = rule.get("matcher", "contains")
            case_sensitive = bool(rule.get("case_sensitive", False))
            matches = self._match_patterns(
                patterns=rule.get("patterns", []),
                target_text=request_text,
                matcher=matcher,
                case_sensitive=case_sensitive,
            )
            if not matches:
                continue
            score = int(rule.get("score", self.weights.get(criterion, 1)))
            self._record_reason(
                rule=rule,
                criterion=criterion,
                score=score,
                scores=scores,
                reasons=reasons,
                detail={"matched": matches},
            )

    def _apply_path_rules(
        self,
        rule_set: list[dict[str, Any]],
        changed_files: list[str],
        scores: dict[str, int],
        reasons: list[dict[str, Any]],
    ) -> None:
        for rule in rule_set:
            matcher = rule.get("matcher", "glob")
            patterns = rule.get("patterns", [])
            case_sensitive = bool(rule.get("case_sensitive", False))
            matched_files: list[str] = []
            for file_path in changed_files:
                for pattern in patterns:
                    if self._path_match(file_path, pattern, matcher, case_sensitive):
                        matched_files.append(file_path)
                        break
            if not matched_files:
                continue
            score = int(rule.get("score", self.weights.get("path", 1)))
            self._record_reason(
                rule=rule,
                criterion="path",
                score=score,
                scores=scores,
                reasons=reasons,
                detail={"matched_files": sorted(set(matched_files))},
            )

    def _apply_content_rules(
        self,
        rule_set: list[dict[str, Any]],
        file_contents: dict[str, str],
        scores: dict[str, int],
        reasons: list[dict[str, Any]],
    ) -> None:
        for rule in rule_set:
            filtered = self._filter_files_by_globs(
                file_contents=file_contents, file_globs=rule.get("file_globs", [])
            )
            if not filtered:
                continue
            pattern = rule.get("pattern", "")
            matched_files = [
                file_path
                for file_path, content in filtered.items()
                if re.search(pattern, content, flags=re.IGNORECASE | re.MULTILINE)
            ]
            condition = rule.get("condition", "present")
            triggered = bool(matched_files) if condition == "present" else not bool(matched_files)
            if not triggered:
                continue

            score = int(rule.get("score", self.weights.get("content", 1)))
            detail: dict[str, Any] = {
                "description": rule.get("description", ""),
                "checked_files": sorted(filtered.keys()),
            }
            if matched_files:
                detail["matched_files"] = sorted(matched_files)

            self._record_reason(
                rule=rule,
                criterion=rule.get("criterion", "content"),
                score=score,
                scores=scores,
                reasons=reasons,
                detail=detail,
            )

    def _record_reason(
        self,
        rule: dict[str, Any],
        criterion: str,
        score: int,
        scores: dict[str, int],
        reasons: list[dict[str, Any]],
        detail: dict[str, Any],
    ) -> None:
        for manual_id in rule.get("manuals", []):
            if manual_id not in scores:
                continue
            scores[manual_id] += score
            payload = {
                "manual": manual_id,
                "criterion": criterion,
                "rule_id": rule.get("id", "unknown"),
                "score": score,
            }
            payload.update(detail)
            reasons.append(payload)

    def _read_files(self, changed_files: list[str]) -> dict[str, str]:
        output: dict[str, str] = {}
        for rel_path in changed_files:
            abs_path = self._resolve_file(rel_path)
            if not abs_path.exists() or not abs_path.is_file():
                continue
            try:
                content = abs_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = abs_path.read_text(encoding="utf-8", errors="ignore")
            output[rel_path] = content
        return output

    def _resolve_file(self, path_value: str) -> Path:
        candidate = Path(path_value)
        if candidate.is_absolute():
            return candidate
        return self.workspace_root / candidate

    def _normalize_path(self, path_value: str) -> str:
        candidate = Path(path_value)
        if candidate.is_absolute():
            try:
                return candidate.relative_to(self.workspace_root).as_posix()
            except ValueError:
                return candidate.as_posix()
        return candidate.as_posix()

    def _match_patterns(
        self,
        patterns: list[str],
        target_text: str,
        matcher: str,
        case_sensitive: bool,
    ) -> list[str]:
        if not target_text:
            return []

        matches: list[str] = []
        for pattern in patterns:
            if matcher == "contains":
                haystack = target_text if case_sensitive else target_text.lower()
                needle = pattern if case_sensitive else pattern.lower()
                if needle in haystack:
                    matches.append(pattern)
            elif matcher == "regex":
                flags = 0 if case_sensitive else re.IGNORECASE | re.MULTILINE
                if re.search(pattern, target_text, flags=flags):
                    matches.append(pattern)
            else:
                raise RuleConfigError(f"unsupported matcher: {matcher}")
        return matches

    def _path_match(
        self, file_path: str, pattern: str, matcher: str, case_sensitive: bool
    ) -> bool:
        if matcher == "glob":
            return fnmatch.fnmatch(file_path, pattern)
        if matcher == "contains":
            haystack = file_path if case_sensitive else file_path.lower()
            needle = pattern if case_sensitive else pattern.lower()
            return needle in haystack
        if matcher == "regex":
            flags = 0 if case_sensitive else re.IGNORECASE
            return re.search(pattern, file_path, flags=flags) is not None
        raise RuleConfigError(f"unsupported path matcher: {matcher}")

    def _filter_files_by_globs(
        self, file_contents: dict[str, str], file_globs: list[str]
    ) -> dict[str, str]:
        if not file_globs:
            return dict(file_contents)
        output: dict[str, str] = {}
        for file_path, content in file_contents.items():
            if any(fnmatch.fnmatch(file_path, pattern) for pattern in file_globs):
                output[file_path] = content
        return output

    def _build_scope_text(
        self,
        scope: str,
        result_text: str,
        file_contents: dict[str, str],
        file_globs: list[str],
    ) -> tuple[str, list[str]]:
        filtered_files = self._filter_files_by_globs(
            file_contents=file_contents, file_globs=file_globs
        )
        files_text = "\n\n".join(filtered_files.values())
        if scope == "result":
            return result_text, []
        if scope == "files":
            return files_text, sorted(filtered_files.keys())
        if scope == "result_or_files":
            return f"{result_text}\n\n{files_text}".strip(), sorted(filtered_files.keys())
        if scope == "result_and_files":
            return f"{result_text}\n\n{files_text}".strip(), sorted(filtered_files.keys())
        raise RuleConfigError(f"unsupported check scope: {scope}")

    def _evaluate_condition(self, condition: str, matched_patterns: list[str]) -> bool:
        if condition == "must_match":
            return bool(matched_patterns)
        if condition == "must_not_match":
            return not bool(matched_patterns)
        raise RuleConfigError(f"unsupported check condition: {condition}")
