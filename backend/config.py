"""
Backend config: tat ca gia tri co the chinh (model id, threshold, dataset/camera path...)
duoc doc tu backend/data/config.json khi startup - KHONG hard-code trong code, de sau nay
co the them trang Settings ma khong phai sua backend.
"""

import json
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
RESULTS_DIR = os.path.join(BACKEND_DIR, "results")
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)  # sku_counting/

CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
ORDERS_PATH = os.path.join(DATA_DIR, "orders.json")
HISTORY_PATH = os.path.join(DATA_DIR, "history.json")
USERS_PATH = os.path.join(DATA_DIR, "users.json")
SECRET_KEY_PATH = os.path.join(DATA_DIR, "session_secret.key")
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")

DEFAULT_CONFIG = {
    "sam2_model_id": "facebook/sam2.1-hiera-small",
    "sam2_points_per_side": 16,
    "sam2_pred_iou_thresh": 0.8,
    "sam2_stability_score_thresh": 0.9,
    "sam2_max_side": 1280,
    "min_area": 300,
    "max_area_ratio": 0.5,
    "mask_containment_thresh": 0.85,
    "bbox_padding_ratio": 0.10,

    "dinov3_model_id": "facebook/dinov3-vitb16-pretrain-lvd1689m",
    "similarity_threshold": 0.6,
    "unknown_label": "unknown",

    "camera_source": "static",  # "realsense" | "static"
    "static_image_path": "",
    "stream_width": 1280,
    "stream_height": 720,
    "stream_fps": 30,

    "roi": None,  # [x0, y0, x1, y1] pixel trong frame goc, None = toan khung hinh
}


def load_config() -> dict:
    """Doc config.json, dien cac gia tri thieu bang DEFAULT_CONFIG."""
    cfg = dict(DEFAULT_CONFIG)
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg.update(json.load(f))
    return cfg


def save_config(cfg: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
