#!/usr/bin/env python3
from __future__ import annotations

import fnmatch
import json
import re
from pathlib import Path
from typing import Any


def load_structured_file(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Config is not valid JSON and PyYAML is unavailable."
            ) from exc
        parsed = yaml.safe_load(raw)
    if not isinstance(parsed, dict):
        raise RuntimeError("Config root must be an object.")
    return parsed


def parse_json_array(raw: str, arg_name: str) -> list[str]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON array.") from exc
    if not isinstance(parsed, list):
        raise ValueError(f"{arg_name} must be a JSON array.")
    return [str(item) for item in parsed]


def parse_json_object(raw: str, arg_name: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{arg_name} must be a JSON object.") from exc
    if not isinstance(parsed, dict):
        raise ValueError(f"{arg_name} must be a JSON object.")
    return parsed


def read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def filter_files_by_globs(paths: list[str], globs: list[str]) -> list[str]:
    if not globs:
        return paths
    output: list[str] = []
    for item in paths:
        if any(fnmatch.fnmatch(item, pattern) for pattern in globs):
            output.append(item)
    return output


def contains_any(text: str, patterns: list[str]) -> list[str]:
    haystack = text.lower()
    matched: list[str] = []
    for pattern in patterns:
        if pattern.lower() in haystack:
            matched.append(pattern)
    return matched


def regex_match_any(text: str, patterns: list[str]) -> list[str]:
    matched: list[str] = []
    for pattern in patterns:
        if re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE):
            matched.append(pattern)
    return matched


def get_nested_value(payload: dict[str, Any], dotted_key: str, default: Any = None) -> Any:
    current: Any = payload
    for key in dotted_key.split("."):
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current

