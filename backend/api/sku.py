"""
Quan ly dataset SKU qua web: xem danh sach nhan + so mau, chup + tach vat
(SAM2) de preview crop, gan nhan va luu, xoa mau/nhan. Day la ban web cua
enroll_samples.py - dung LAI cac ham gan nhan/luu file cua no
(sanitize_label, unique_crop_path, save_crop) qua _path_shim, de dataset
tao boi CLI va Web UI hoan toan tuong thich nhau.
"""

import base64
import os
import shutil
import time

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from backend.config import DATASET_DIR
from backend.vision import _path_shim  # noqa: F401

from common_pipeline import crop_masked_object
from enroll_samples import BBOX_PADDING_RATIO, sanitize_label, save_crop

router = APIRouter()


def _label_dir(label: str) -> str:
    """An toan hoa 1 label thanh duong dan thu muc, dam bao van con nam
    trong DATASET_DIR (chan path traversal tu input nguoi dung)."""
    safe = sanitize_label(label)
    path = os.path.abspath(os.path.join(DATASET_DIR, safe))
    if os.path.commonpath([path, os.path.abspath(DATASET_DIR)]) != os.path.abspath(DATASET_DIR):
        raise HTTPException(status_code=400, detail="Ten SKU khong hop le.")
    return path


def _sample_path(label: str, filename: str) -> str:
    """Giong _label_dir nhung cho 1 file mau cu the - chi chap nhan
    basename (khong '/', '..') de tranh ghi/xoa file ngoai y muon."""
    label_path = _label_dir(label)
    safe_name = os.path.basename(filename)
    path = os.path.abspath(os.path.join(label_path, safe_name))
    if os.path.commonpath([path, label_path]) != label_path:
        raise HTTPException(status_code=400, detail="Ten file khong hop le.")
    return path


def _list_samples(label: str) -> list[str]:
    label_path = os.path.join(DATASET_DIR, label)
    if not os.path.isdir(label_path):
        return []
    return sorted(
        f for f in os.listdir(label_path)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))
    )


def _sku_info(label: str) -> dict:
    samples = _list_samples(label)
    thumbnail_url = f"/dataset/{label}/{samples[0]}" if samples else None
    return {"sku": label, "sample_count": len(samples), "thumbnail_url": thumbnail_url}


@router.get("/skus")
def list_skus():
    if not os.path.isdir(DATASET_DIR):
        return []
    labels = sorted(
        d for d in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, d))
    )
    return [_sku_info(label) for label in labels]


@router.get("/sku/{label}/samples")
def list_sku_samples(label: str):
    safe_dir = _label_dir(label)
    safe_label = os.path.basename(safe_dir)
    samples = _list_samples(safe_label)
    if not samples:
        raise HTTPException(status_code=404, detail=f"Khong tim thay SKU: {label}")
    return {
        "sku": safe_label,
        "samples": [{"filename": f, "url": f"/dataset/{safe_label}/{f}"} for f in samples],
    }


class CaptureRequest(BaseModel):
    roi: tuple[int, int, int, int] | None = None


@router.post("/sku/capture")
def capture_crops(body: CaptureRequest, request: Request):
    camera_service = request.app.state.camera_service
    segmenter = request.app.state.segmenter

    from backend.services.camera_service import CameraUnavailableError

    try:
        frame = camera_service.get_frame()
    except CameraUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    cfg = request.app.state.config
    frame_h, frame_w = frame.shape[:2]
    roi = body.roi or (tuple(cfg["roi"]) if cfg.get("roi") else None) or (0, 0, frame_w, frame_h)
    x0, y0, x1, y1 = roi
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(frame_w, x1), min(frame_h, y1)
    roi_bgr = frame[y0:y1, x0:x1]
    roi_bgr = segmenter.prepare(roi_bgr)
    masks_info = segmenter.segment(roi_bgr)

    roi_h, roi_w = roi_bgr.shape[:2]
    crops = []
    for idx, info in enumerate(masks_info):
        crop = crop_masked_object(roi_bgr, info, roi_w, roi_h, BBOX_PADDING_RATIO)
        if crop.size == 0:
            continue
        ok, buf = cv2.imencode(".jpg", crop)
        if not ok:
            continue
        crops.append({
            "index": idx,
            "image_base64": "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii"),
            "bbox": info["bbox"],
        })

    return {"crops": crops}


@router.post("/sku/upload-capture")
def upload_capture_crops(request: Request, files: list[UploadFile] = File(...)):
    """Nhu /sku/capture nhung nguon anh la file nguoi dung tai len (anh
    toan canh, khong phai anh da crop san) thay vi frame camera - dung
    chung 1 luong SAM2 segment + mask-crop, khong ap ROI (anh tai len da
    la ca canh roi)."""
    segmenter = request.app.state.segmenter

    crops = []
    skipped_filenames = []
    idx = 0
    for f in files:
        content = f.file.read()
        arr = np.frombuffer(content, dtype=np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            skipped_filenames.append(f.filename or "?")
            continue

        img_bgr = segmenter.prepare(img_bgr)
        masks_info = segmenter.segment(img_bgr)
        img_h, img_w = img_bgr.shape[:2]

        for info in masks_info:
            crop = crop_masked_object(img_bgr, info, img_w, img_h, BBOX_PADDING_RATIO)
            if crop.size == 0:
                continue
            ok, buf = cv2.imencode(".jpg", crop)
            if not ok:
                continue
            crops.append({
                "index": idx,
                "image_base64": "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii"),
                "bbox": info["bbox"],
            })
            idx += 1

    return {"crops": crops, "skipped_filenames": skipped_filenames}


class SaveSampleRequest(BaseModel):
    label: str
    image_base64: str


@router.post("/sku/samples")
def save_sample(body: SaveSampleRequest, request: Request):
    label = sanitize_label(body.label)
    if not label:
        raise HTTPException(status_code=400, detail="Thieu ten SKU.")

    raw = body.image_base64.split(",", 1)[-1]  # bo phan "data:image/jpeg;base64,"
    try:
        img_bytes = base64.b64decode(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Anh khong hop le: {exc}") from exc

    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    crop_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if crop_bgr is None:
        raise HTTPException(status_code=400, detail="Khong doc duoc anh.")

    session_ts = time.strftime("%Y%m%d_%H%M%S")
    save_crop(DATASET_DIR, label, crop_bgr, session_ts, 1)

    request.app.state.matcher.reload_dataset()
    return _sku_info(label)


@router.delete("/sku/{label}/samples/{filename}")
def delete_sample(label: str, filename: str, request: Request):
    path = _sample_path(label, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Khong tim thay file mau.")
    os.remove(path)
    request.app.state.matcher.reload_dataset()
    return {"ok": True}


@router.delete("/sku/{label}")
def delete_sku(label: str, request: Request):
    path = _label_dir(label)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail=f"Khong tim thay SKU: {label}")
    shutil.rmtree(path)
    request.app.state.matcher.reload_dataset()
    return {"ok": True}
