"""
Xem/chinh cac tham so co the tune truc tiep luc dang chay (giong
/api/settings cua PROCESS_INSPECTION: tune threshold khong can restart
server). Chi cho phep sua cac key AN TOAN de doi runtime - khong dung de
doi model id / cac tham so da "dong cung" SAM2AutomaticMaskGenerator luc
load model (points_per_side, pred_iou_thresh, stability_score_thresh).

app.state.config la 1 dict duy nhat duoc Sam2Segmenter/Dinov3Matcher/
InspectionEngine giu chung 1 tham chieu (xem main.py) - sua tai cho o day
(cfg.update, KHONG gan lai bien) se co hieu luc ngay cho lan inspection
tiep theo ma khong can load lai model.
"""

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from backend.config import save_config
from backend.vision.object_detector import YoloDetector

router = APIRouter()

TUNABLE_KEYS = [
    "similarity_threshold",
    "min_area",
    "max_area_ratio",
    "mask_containment_thresh",
    "bbox_padding_ratio",
    "min_unknown_score",
    "yolo_conf_threshold",
]


class SettingsUpdate(BaseModel):
    similarity_threshold: Optional[float] = Field(default=None, ge=0, le=1)
    min_area: Optional[int] = Field(default=None, ge=0)
    max_area_ratio: Optional[float] = Field(default=None, gt=0, le=1)
    mask_containment_thresh: Optional[float] = Field(default=None, ge=0, le=1)
    bbox_padding_ratio: Optional[float] = Field(default=None, ge=0, le=1)
    min_unknown_score: Optional[float] = Field(default=None, ge=0, le=1)
    yolo_conf_threshold: Optional[float] = Field(default=None, ge=0, le=1)


@router.get("/settings")
def get_settings(request: Request):
    cfg = request.app.state.config
    return {k: cfg[k] for k in TUNABLE_KEYS}


@router.post("/settings")
def update_settings(body: SettingsUpdate, request: Request):
    cfg = request.app.state.config
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    cfg.update(updates)
    save_config(cfg)
    return {k: cfg[k] for k in TUNABLE_KEYS}


class DetectionBackendUpdate(BaseModel):
    detection_backend: Literal["sam2_dino", "yolo"]


@router.get("/settings/detection-backend")
def get_detection_backend(request: Request):
    cfg = request.app.state.config
    return {
        "detection_backend": cfg.get("detection_backend", "sam2_dino"),
        "yolo_available": bool(cfg.get("yolo_model_path")),
    }


@router.post("/settings/detection-backend")
def set_detection_backend(body: DetectionBackendUpdate, request: Request):
    """Doi detector dang dung NGAY LUC CHAY, khong can restart server - tach
    rieng khoi /settings (o tren) vi thao tac nay co the phai nap model
    (YOLO lan dau) thay vi chi cfg.update don gian. Ket qua duoc cache lai
    trong app.state.detector_cache nen doi qua lai sau do la tuc thi."""
    cfg = request.app.state.config
    cache = request.app.state.detector_cache
    backend = body.detection_backend

    if backend not in cache:
        if not cfg.get("yolo_model_path"):
            raise HTTPException(status_code=400, detail="Chưa cấu hình yolo_model_path trong config.json.")
        try:
            cache[backend] = YoloDetector(cfg["yolo_model_path"], request.app.state.device, cfg)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Không nạp được model YOLO: {exc}") from exc

    request.app.state.inspection_engine.set_detector(cache[backend])
    cfg["detection_backend"] = backend
    save_config(cfg)
    return {"detection_backend": backend}
