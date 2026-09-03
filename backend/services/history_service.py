"""
Luu/doc lich su inspection vao history.json. Moi order_code chi giu 1
record (ghi de neu code da ton tai) - dung cho HistoryRecord schema.
"""

import json
import os
import threading

from backend.config import HISTORY_PATH

_lock = threading.Lock()


def _read_all() -> dict:
    if not os.path.exists(HISTORY_PATH):
        return {}
    with open(HISTORY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_all(data: dict) -> None:
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save(code: str, record: dict) -> None:
    with _lock:
        data = _read_all()
        data[code] = record  # ghi de record cu neu code da ton tai
        _write_all(data)


def get(code: str) -> dict | None:
    with _lock:
        return _read_all().get(code)


def list_all() -> dict:
    with _lock:
        return _read_all()
