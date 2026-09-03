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

from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from backend.config import save_config

router = APIRouter()

TUNABLE_KEYS = [
    "similarity_threshold",
    "min_area",
    "max_area_ratio",
    "mask_containment_thresh",
    "bbox_padding_ratio",
]


class SettingsUpdate(BaseModel):
    similarity_threshold: Optional[float] = Field(default=None, ge=0, le=1)
    min_area: Optional[int] = Field(default=None, ge=0)
    max_area_ratio: Optional[float] = Field(default=None, gt=0, le=1)
    mask_containment_thresh: Optional[float] = Field(default=None, ge=0, le=1)
    bbox_padding_ratio: Optional[float] = Field(default=None, ge=0, le=1)


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
