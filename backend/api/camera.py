import time
from typing import Optional

import cv2
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.config import save_config
from backend.services.camera_service import CameraUnavailableError

router = APIRouter()


@router.post("/camera/start")
def start_camera(request: Request):
    svc = request.app.state.camera_service
    try:
        svc.start()
    except CameraUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"running": True}


@router.post("/camera/stop")
def stop_camera(request: Request):
    request.app.state.camera_service.stop()
    return {"running": False}


@router.get("/camera/status")
def camera_status(request: Request):
    svc = request.app.state.camera_service
    return {"running": svc.is_running}


class RoiUpdate(BaseModel):
    roi: Optional[tuple[int, int, int, int]] = None


@router.get("/camera/roi")
def get_roi(request: Request):
    return {"roi": request.app.state.config.get("roi")}


@router.post("/camera/roi")
def set_roi(body: RoiUpdate, request: Request):
    if body.roi is not None:
        x0, y0, x1, y1 = body.roi
        if x0 < 0 or y0 < 0 or x1 <= x0 or y1 <= y0:
            raise HTTPException(status_code=400, detail="ROI khong hop le (can x1>x0, y1>y0, khong am).")

    cfg = request.app.state.config
    cfg["roi"] = list(body.roi) if body.roi is not None else None
    save_config(cfg)
    return {"roi": cfg["roi"]}


def _mjpeg_frames(svc):
    while True:
        try:
            frame = svc.get_frame()
        except CameraUnavailableError:
            break
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            continue
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
        time.sleep(1 / 15)


@router.get("/camera/stream")
def camera_stream(request: Request):
    svc = request.app.state.camera_service
    if not svc.is_running:
        raise HTTPException(status_code=503, detail="Camera chua duoc khoi dong. Goi /api/camera/start truoc.")
    return StreamingResponse(_mjpeg_frames(svc), media_type="multipart/x-mixed-replace; boundary=frame")
