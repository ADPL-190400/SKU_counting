import json
import time

from fastapi import APIRouter, HTTPException, Request

from backend.config import ORDERS_PATH
from backend.models.schemas import InspectionRequest
from backend.services import history_service, verification_service
from backend.services.camera_service import CameraUnavailableError

router = APIRouter()


def _load_orders() -> dict:
    with open(ORDERS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/inspection")
def run_inspection(body: InspectionRequest, request: Request):
    orders = _load_orders()
    order = orders.get(body.order_code)
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order code not found: {body.order_code}")

    camera_service = request.app.state.camera_service
    engine = request.app.state.inspection_engine
    cfg = request.app.state.config

    try:
        frame = camera_service.get_frame()
    except CameraUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    frame_h, frame_w = frame.shape[:2]
    roi = body.roi or (tuple(cfg["roi"]) if cfg.get("roi") else None) or (0, 0, frame_w, frame_h)
    x0, y0, x1, y1 = roi
    roi = (max(0, x0), max(0, y0), min(frame_w, x1), min(frame_h, y1))

    products = order["products"]
    required_skus = [p["sku"] for p in products]

    try:
        result = engine.run(frame, roi, body.order_code, allowed_labels=required_skus)
    except Exception as exc:  # SAM2/DINOv3 inference failure (e.g. CUDA OOM)
        raise HTTPException(status_code=500, detail=f"Loi khi chay inspection pipeline: {exc}") from exc

    t0 = time.time()
    rows, overall = verification_service.verify(
        products, result["detected_counts"], result["unknown_count"]
    )
    verification_ms = (time.time() - t0) * 1000

    required = {p["sku"]: p["required_quantity"] for p in products}
    image_url = f"/results/{result['image_name']}"

    processing_time_ms = {
        "total": result["timing_ms"]["total"],
        "sam2": result["timing_ms"]["sam2"],
        "dinov3": result["timing_ms"]["dinov3"],
        "matching": result["timing_ms"]["matching"],
        "verification": verification_ms,
    }

    response = {
        "code": body.order_code,
        "result": overall,
        "required": required,
        "detected": result["detected_counts"],
        "unknown": result["unknown_count"],
        "objects": result["objects"],
        "verification": rows,
        "image_url": image_url,
        "processing_time_ms": processing_time_ms,
        "timestamp": result["timestamp"],
    }

    operator = request.session.get("user", "unknown")
    history_service.save(body.order_code, {
        "code": body.order_code,
        "timestamp": result["timestamp"],
        "result": overall,
        "required": required,
        "detected": result["detected_counts"],
        "unknown_count": result["unknown_count"],
        "image": image_url,
        "processing_time_ms": processing_time_ms["total"],
        "threshold": cfg["similarity_threshold"],
        "operator": operator,
    })

    return response
