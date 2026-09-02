"""
============================================================
CONG CU 2: PHAN LOAI TRUC TIEP (SAM2 + DINOv3)
============================================================

Muc dich: giong sam2_mask_view.py (camera hoac anh tinh, chon ROI, nhan
phim de chay) nhung sau khi SAM2 tach vat xong, moi vat duoc crop, trich
feature DINOv3, so khop cosine similarity voi TOAN BO cac nhan da luu
bang enroll_samples.py -> gan nhan gan nhat (hoac "unknown" neu diem
thap) va hien thi + dem so luong theo tung nhan.

============================================================
NGUON ANH: CAMERA (mac dinh) HOAC FILE ANH TINH
============================================================
    Chay tu thu muc goc cua du an (ben ngoai sku_counting/), vi venv nam o do:

    Mac dinh (khong truyen gi) -> dung camera RealSense:
        venv\\Scripts\\python.exe sku_counting\\live_classify.py

    Truyen duong dan anh -> dung anh tinh do thay vi camera:
        venv\\Scripts\\python.exe sku_counting\\live_classify.py duong/dan/toi/anh.jpg

============================================================
HUONG DAN CAI DAT THU VIEN
============================================================
    pip install opencv-python numpy torch pyrealsense2 pillow "transformers>=4.56.0"

    (torch can CUDA neu muon chay GPU, vi du:
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
    Chi co CPU thi cai binh thuong: pip install torch torchvision)

    SAM2: xem huong dan cai dat o dau file common_pipeline.py
    DINOv3 can dang nhap Hugging Face - xem huong dan o dau file common_dino.py

    Truoc khi chay: da co dataset gan nhan (chay enroll_samples.py truoc).

============================================================
DIEU KHIEN TRONG LUC CHAY
============================================================
    s / SPACE : chay SAM2 tach vat + DINOv3 phan loai tren ROI hien tai
    r         : chon lai ROI
    q / ESC   : thoat
============================================================
"""

import sys
import time

try:
    import cv2
except ImportError:
    print("[LOI] Chua cai OpenCV. Cai bang lenh: pip install opencv-python")
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("[LOI] Chua cai NumPy. Cai bang lenh: pip install numpy")
    sys.exit(1)

try:
    import torch
except ImportError:
    print("[LOI] Chua cai PyTorch. Cai bang lenh: pip install torch (xem huong dan GPU o dau file)")
    sys.exit(1)

from common_pipeline import (
    RealSenseFrameSource,
    ImageFrameSource,
    select_roi,
    resize_for_sam2,
    load_sam2,
    generate_masks,
    filter_background_masks,
    merge_nested_masks,
    pad_bbox,
)
from common_dino import DINOFeatureExtractor, LabelMatcher


# ====================================================================
# CONFIG
# ====================================================================
STREAM_WIDTH = 1280
STREAM_HEIGHT = 720
STREAM_FPS = 30

DATASET_DIR = "dataset"

DINOV3_MODEL_ID = "facebook/dinov3-vitb16-pretrain-lvd1689m"

SAM2_MODEL_ID = "facebook/sam2.1-hiera-small"
SAM2_POINTS_PER_SIDE = 16
SAM2_PRED_IOU_THRESH = 0.8
SAM2_STABILITY_SCORE_THRESH = 0.9

MIN_AREA = 300
SAM2_MAX_SIDE = 1280
MAX_AREA_RATIO = 0.5
MASK_CONTAINMENT_THRESH = 0.85

BBOX_PADDING_RATIO = 0.10
SIMILARITY_THRESHOLD = 0.6
UNKNOWN_LABEL = "unknown"


# ====================================================================
# HAM PHU TRO
# ====================================================================
def classify_objects(extractor: DINOFeatureExtractor, matcher: LabelMatcher,
                      roi_bgr: np.ndarray, masks_info: list):
    """
    Voi tung vat trong masks_info: crop (co padding) -> BGR->RGB -> trich
    feature DINOv3 THEO LO (1 lan forward cho ca list, nhanh hon lap tung
    cai) -> so khop voi tat ca nhan. Tra ve list (label, similarity) cung
    thu tu voi masks_info; similarity < SIMILARITY_THRESHOLD -> UNKNOWN_LABEL.
    """
    if len(masks_info) == 0:
        return []

    roi_h, roi_w = roi_bgr.shape[:2]
    crops_rgb = []
    for info in masks_info:
        x, y, w, h = info["bbox"]
        x0, y0, x1, y1 = pad_bbox(x, y, w, h, roi_w, roi_h, BBOX_PADDING_RATIO)
        crop = roi_bgr[y0:y1, x0:x1]
        crops_rgb.append(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))

    features = extractor.extract_features_batch(crops_rgb)
    matches = matcher.match_batch(features)

    results = []
    for label, sim in matches:
        if sim < SIMILARITY_THRESHOLD:
            results.append((UNKNOWN_LABEL, sim))
        else:
            results.append((label, sim))
    return results


def draw_classification_overlay(base_bgr: np.ndarray, masks_info: list, labels_sims: list) -> np.ndarray:
    """Ve contour + bbox + nhan + similarity cho tung vat da phan loai."""
    overlay = base_bgr.copy()

    for info, (label, sim) in zip(masks_info, labels_sims):
        color = (0, 0, 255) if label == UNKNOWN_LABEL else (0, 255, 0)

        mask_u8 = (info["mask"].astype(np.uint8)) * 255
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, contours, -1, color, 2)

        x, y, w, h = info["bbox"]
        cv2.rectangle(overlay, (x, y), (x + w, y + h), color, 1)
        cv2.putText(overlay, f"{label} ({sim:.2f})", (x, max(0, y - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    return overlay


def summarize_counts(labels_sims: list) -> dict:
    counts = {}
    for label, _ in labels_sims:
        counts[label] = counts.get(label, 0) + 1
    return counts


# ====================================================================
# MAIN
# ====================================================================
def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Su dung device: {device}")
    if device == "cpu":
        print("[CANH BAO] Khong tim thay GPU - SAM2/DINOv3 se cham hon nhieu tren CPU.")

    extractor = DINOFeatureExtractor(DINOV3_MODEL_ID, device)
    extractor.load_model()
    matcher = LabelMatcher.from_dataset_dir(extractor, DATASET_DIR)

    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    if image_path:
        frame_source = ImageFrameSource(image_path)
    else:
        print("[INFO] Dang khoi dong camera RealSense...")
        frame_source = RealSenseFrameSource(STREAM_WIDTH, STREAM_HEIGHT, STREAM_FPS)

    roi_x0, roi_y0, roi_x1, roi_y1 = select_roi(frame_source)

    mask_generator = load_sam2(
        SAM2_MODEL_ID, device,
        SAM2_POINTS_PER_SIDE, SAM2_PRED_IOU_THRESH, SAM2_STABILITY_SCORE_THRESH,
    )

    cv2.namedWindow("Phan loai - Live", cv2.WINDOW_NORMAL)
    cv2.namedWindow("Phan loai - Ket qua", cv2.WINDOW_NORMAL)

    print("[INFO] San sang. Nhan 's'/SPACE de phan loai, 'r' chon lai ROI, 'q'/ESC de thoat.")

    try:
        while True:
            frame = frame_source.get_frame()
            if frame is None:
                print("[CANH BAO] Khong doc duoc frame.")
                continue

            display = frame.copy()
            cv2.rectangle(display, (roi_x0, roi_y0), (roi_x1, roi_y1), (0, 200, 255), 1)
            cv2.putText(display, "Nhan 's'/SPACE de phan loai", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            cv2.imshow("Phan loai - Live", display)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                break
            elif key == ord('r'):
                roi_x0, roi_y0, roi_x1, roi_y1 = select_roi(frame_source)
            elif key in (ord('s'), ord(' ')):
                roi_bgr = frame[roi_y0:roi_y1, roi_x0:roi_x1]
                if roi_bgr.size == 0:
                    continue

                roi_bgr = resize_for_sam2(roi_bgr, SAM2_MAX_SIDE)

                print(f"[SAM2] Dang chay segmentation (kich thuoc {roi_bgr.shape[1]}x{roi_bgr.shape[0]})...")
                t0 = time.time()
                try:
                    masks_info = generate_masks(mask_generator, roi_bgr, MIN_AREA)
                except torch.cuda.OutOfMemoryError:
                    torch.cuda.empty_cache()
                    print(f"[LOI] Het VRAM GPU khi chay SAM2 tren anh {roi_bgr.shape[1]}x{roi_bgr.shape[0]}. "
                          f"Hay chon ROI nho hon (nhan 'r'), hoac giam SAM2_MAX_SIDE / "
                          f"SAM2_POINTS_PER_SIDE trong file.")
                    continue

                masks_info = filter_background_masks(masks_info, roi_bgr.shape[:2], MAX_AREA_RATIO)
                masks_info = merge_nested_masks(masks_info, MASK_CONTAINMENT_THRESH)

                labels_sims = classify_objects(extractor, matcher, roi_bgr, masks_info)
                elapsed = time.time() - t0

                counts = summarize_counts(labels_sims)
                counts_str = ", ".join(f"{label}: {n}" for label, n in sorted(counts.items())) or "(khong co vat)"
                print(f"[KET QUA] {len(masks_info)} vat trong {elapsed:.2f}s -> {counts_str}")

                result = draw_classification_overlay(roi_bgr, masks_info, labels_sims)
                cv2.putText(result, f"Vat: {len(masks_info)}  |  {elapsed:.2f}s",
                            (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                for i, (label, count) in enumerate(sorted(counts.items())):
                    cv2.putText(result, f"{label}: {count}", (10, 50 + i * 22),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.imshow("Phan loai - Ket qua", result)

    finally:
        frame_source.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
