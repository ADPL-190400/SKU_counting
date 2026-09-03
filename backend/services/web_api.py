"""
Dang nhap qua API xac thuc chung cua cong ty (aiot-api.m2m-sol.co.jp) -
GIONG HET co che dung trong PROCESS_INSPECTION/web_api.py (du an anh em
cua sku_counting), de dung chung 1 tai khoan cho ca 2 app AI camera.

sku_counting KHONG tu luu mat khau nguoi dung o dau ca - moi lan dang
nhap deu goi thang API nay, chi giu lai token trong session server-side.
"""

import requests

API_BASE = "https://aiot-api.m2m-sol.co.jp/api/v1"


def login(email: str, password: str) -> str | None:
    """
    Dang nhap qua API cong ty. Tra ve bearer token neu thanh cong, None
    neu sai tai khoan/mat khau hoac loi ket noi (chi in ly do chi tiet ra
    log server - xem api/auth.py - KHONG lo ra ngoai cho nguoi dung).
    """
    try:
        res = requests.post(
            f"{API_BASE}/auth/login",
            data={"email": email, "password": password},
            timeout=10,
        )
        res_json = res.json()
    except Exception as exc:
        print(f"[web_api] Loi ket noi API dang nhap: {exc}")
        return None

    if res_json.get("success") is True:
        return res_json["data"]["token"]

    print(f"[web_api] Dang nhap that bai: {res_json.get('message', res_json)}")
    return None
