"""
FastAPI app. Nap SAM2 + DINOv3 + dataset MOT LAN khi startup (lifespan),
giu trong app.state de tat ca request dung chung, khong load lai moi
inspection.

Chay tu thu muc sku_counting/:
    uvicorn backend.main:app --port 8000

Luu y: --reload de dev nhung khi doi code se load lai SAM2/DINOv3 tren
GPU trong luc worker cu chua giai phong CUDA context xong, de bi treo -
neu dung --reload va thay server khong phan hoi sau khi sua file, hay
Ctrl+C va chay lai lenh tren (khong --reload) cho on dinh.
"""

import logging
import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from backend.api import auth, camera, history, inspection, orders, settings, sku
from backend.config import DATASET_DIR, RESULTS_DIR, load_config
from backend.services import auth_service
from backend.services.camera_service import CameraService
from backend.vision.feature_matcher import Dinov3Matcher
from backend.vision.inspection_engine import InspectionEngine
from backend.vision.object_detector import Sam2DinoDetector, YoloDetector
from backend.vision.segmenter import Sam2Segmenter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sku_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = load_config()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Server startup - device=%s", device)

    logger.info("Loading SAM2 (%s)...", cfg["sam2_model_id"])
    segmenter = Sam2Segmenter(cfg, device)

    logger.info("Loading DINOv3 (%s) + reference dataset...", cfg["dinov3_model_id"])
    matcher = Dinov3Matcher(cfg, device)

    # segmenter/matcher luon nap du dung backend nao cho inspection - trang
    # SKU Management can SAM2 de chup+tach vat luc them mau, khong lien quan
    # toi detection_backend. sam2_dino luon "re" (chi wrap lai segmenter/
    # matcher da nap san) nen dua vao cache luon; yolo thi de lazy - chi nap
    # khi nguoi dung thuc su chuyen sang (xem /api/settings/detection-backend),
    # tranh ton VRAM/thoi gian khoi dong neu khong dung toi.
    detector_cache = {"sam2_dino": Sam2DinoDetector(segmenter, matcher)}
    if cfg.get("detection_backend") == "yolo":
        logger.info("Loading YOLO (%s)...", cfg["yolo_model_path"])
        detector_cache["yolo"] = YoloDetector(cfg["yolo_model_path"], device, cfg)
    active_detector = detector_cache.get(cfg.get("detection_backend"), detector_cache["sam2_dino"])

    app.state.config = cfg
    app.state.device = device
    app.state.detector_cache = detector_cache
    app.state.camera_service = CameraService(cfg)
    app.state.segmenter = segmenter
    app.state.matcher = matcher
    app.state.inspection_engine = InspectionEngine(cfg, active_detector, RESULTS_DIR)

    logger.info("READY")
    yield

    app.state.camera_service.stop()


app = FastAPI(title="SKU Verification Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route /api/* can duoc dang nhap (session["user"]), tru login/health - giong
# @app.before_request cua PROCESS_INSPECTION (kiem tra session.get("user")).
AUTH_EXEMPT_PATHS = {"/api/login", "/api/health"}

# TAM THOI TAT: API xac thuc cong ty (aiot-api.m2m-sol.co.jp) dang tra 502
# (server ho loi/down), nen khong ai dang nhap duoc va toan bo app bi chan.
# Dat lai True khi ho bao server da hoat dong lai.
AUTH_ENABLED = False


@app.middleware("http")
async def require_auth(request: Request, call_next):
    path = request.url.path
    if AUTH_ENABLED and path.startswith("/api/") and path not in AUTH_EXEMPT_PATHS:
        if not request.session.get("user"):
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    return await call_next(request)


# Duoc add SAU CUNG de la middleware NGOAI CUNG (Starlette: middleware them
# sau se bao middleware them truoc) - dam bao request.session da duoc giai
# ma tu cookie TRUOC KHI require_auth() o tren doc no.
app.add_middleware(SessionMiddleware, secret_key=auth_service.load_or_create_secret_key(), max_age=12 * 3600)

# Ca 2 thu muc nay bi gitignore hoan toan (git khong luu thu muc rong) -
# tren 1 clone moi tinh se chua ton tai, va app.mount() chay luc IMPORT
# MODULE (truoc ca lifespan, noi InspectionEngine.__init__ moi tu tao
# RESULTS_DIR) nen phai dam bao ton tai o day, khong thi StaticFiles() bao
# loi "Directory does not exist" ngay khi khoi dong.
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")
app.mount("/dataset", StaticFiles(directory=DATASET_DIR), name="dataset")

app.include_router(auth.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(camera.router, prefix="/api")
app.include_router(inspection.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(sku.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
