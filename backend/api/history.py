from fastapi import APIRouter

from backend.services import history_service

router = APIRouter()


@router.get("/history")
def list_history():
    """Tra ve tat ca record, moi lan inspection MOI NHAT theo tung order_code
    (history_service da overwrite-by-code), sap xep timestamp giam dan."""
    records = history_service.list_all()
    return sorted(records.values(), key=lambda r: r["timestamp"], reverse=True)
