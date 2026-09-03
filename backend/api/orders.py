import json

from fastapi import APIRouter, HTTPException

from backend.config import ORDERS_PATH

router = APIRouter()


def _load_orders() -> dict:
    with open(ORDERS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/orders/{code}")
def get_order(code: str):
    orders = _load_orders()
    if code not in orders:
        raise HTTPException(status_code=404, detail=f"Order code not found: {code}")
    return {"code": code, "products": orders[code]["products"]}
