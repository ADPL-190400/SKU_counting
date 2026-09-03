"""
Tao/doc secret key ky session cookie (giong flask_secret.key cua
PROCESS_INSPECTION) - luu tren dia de restart server khong lam mat hieu
luc cookie dang dang nhap cua nguoi dung. Viec xac thuc tai khoan/mat
khau tu no ban giao het cho web_api.py (goi API cong ty), khong co gi de
luu cuc bo o day nua.
"""

import os
import secrets

from backend.config import DATA_DIR, SECRET_KEY_PATH


def load_or_create_secret_key() -> str:
    if os.path.exists(SECRET_KEY_PATH):
        with open(SECRET_KEY_PATH, "r", encoding="utf-8") as f:
            return f.read().strip()
    os.makedirs(DATA_DIR, exist_ok=True)
    key = secrets.token_hex(32)
    with open(SECRET_KEY_PATH, "w", encoding="utf-8") as f:
        f.write(key)
    return key
