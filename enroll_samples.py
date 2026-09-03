"""
============================================================
CONG CU 1: THU MAU + GAN NHAN VAT THE
============================================================

Muc dich: chup anh mau (camera RealSense hoac anh tinh), chon ROI, dung
SAM2 de tach tung vat the trong ROI, roi nguoi dung go NHAN (label) cho
tung vat -> luu thanh dataset co nhan tren dia, tich luy dan qua nhieu
lan chup (nhieu goc do/anh sang) de dung cho live_classify.py sau nay.

============================================================
NGUON ANH: CAMERA (mac dinh) HOAC FILE ANH TINH
============================================================
    Chay tu thu muc goc cua du an (ben ngoai sku_counting/), vi venv nam o do:

    Mac dinh (khong truyen gi) -> dung camera RealSense:
        venv\\Scripts\\python.exe sku_counting\\enroll_samples.py

    Truyen duong dan anh -> dung anh tinh do thay vi camera:
        venv\\Scripts\\python.exe sku_counting\\enroll_samples.py duong/dan/toi/anh.jpg

============================================================
HUONG DAN CAI DAT THU VIEN
============================================================
    pip install opencv-python numpy torch pyrealsense2

    (torch can CUDA neu muon chay GPU, vi du:
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
    Chi co CPU thi cai binh thuong: pip install torch torchvision)

    SAM2: xem huong dan cai dat o dau file common_pipeline.py

============================================================
DIEU KHIEN TRONG LUC CHAY
============================================================
    s / SPACE : chay SAM2 tach vat trong ROI hien tai, roi lan luot hoi
                nhan cho tung vat (o terminal)
    r         : chon lai ROI
    q / ESC   : thoat

    Khi dang go nhan cho tung vat (o terminal):
        Enter (de trong) : dung lai nhan vua go truoc do (tien loi khi
                            1 lan chup co nhieu vat cung 1 san pham)
        '-'              : bo qua vat nay, khong luu
        'q'               : dung gan nhan cho cac vat con lai trong dot
                            nay, quay ve man hinh live (cac vat da luu
                            truoc do trong dot van duoc giu)
        (van con lai)     : dung lam nhan moi cho vat nay
============================================================
"""

import os
import re
import sys
import time
import unicodedata

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
    crop_masked_object,
)


# ====================================================================
# CONFIG
# ====================================================================
STREAM_WIDTH = 1280
STREAM_HEIGHT = 720
STREAM_FPS = 30

DATASET_DIR = "dataset"

SAM2_MODEL_ID = "facebook/sam2.1-hiera-small"
SAM2_POINTS_PER_SIDE = 16
SAM2_PRED_IOU_THRESH = 0.8
SAM2_STABILITY_SCORE_THRESH = 0.9

MIN_AREA = 300
SAM2_MAX_SIDE = 1280
MAX_AREA_RATIO = 0.5
MASK_CONTAINMENT_THRESH = 0.85

BBOX_PADDING_RATIO = 0.10   # mo rong bbox khi crop, giu them ngu canh
CROP_DISPLAY_MIN_SIDE = 200  # phong to anh hien thi neu crop qua nho (khong anh huong anh luu)


# ====================================================================
# HAM PHU TRO: NHAN + LUU CROP
# ====================================================================
def sanitize_label(raw: str) -> str:
    """
    Chuan hoa 1 chuoi nhan thanh ten thu muc an toan: bo dau, thuong hoa,
    khoang trang -> '_', ky tu khac chu/so -> '_'. VD 'Coca Cola' va
    'coca-cola' se gom chung 1 thu muc - co y de gan nhan lai qua nhieu
    lan chup van tich luy dung 1 cho.
    """
    text = raw.strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^a-z0-9_-]", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or "nhan_trong"


def unique_crop_path(dataset_dir: str, label: str, session_ts: str, obj_idx: int) -> str:
    """Duong dan file crop, kem vong lap chong trung ten (hiem khi xay ra
    giua 2 dot chup khac nhau cung 1 giay)."""
    label_dir = os.path.join(dataset_dir, label)
    os.makedirs(label_dir, exist_ok=True)

    base_name = f"{label}_{session_ts}_{obj_idx:03d}"
    path = os.path.join(label_dir, base_name + ".png")
    suffix = 1
    while os.path.exists(path):
        path = os.path.join(label_dir, f"{base_name}_{suffix}.png")
        suffix += 1
    return path


def save_crop(dataset_dir: str, label: str, crop_bgr: np.ndarray, session_ts: str, obj_idx: int) -> str:
    path = unique_crop_path(dataset_dir, label, session_ts, obj_idx)
    cv2.imwrite(path, crop_bgr)
    return path


def label_batch_interactively(roi_bgr: np.ndarray, masks_info: list,
                               dataset_dir: str, last_label):
    """
    Voi tung vat trong masks_info, hien anh crop + hoi nhan o terminal,
    luu vao dataset_dir/<nhan>/... Tra ve (last_label_moi, so_da_luu, so_bo_qua).
    """
    roi_h, roi_w = roi_bgr.shape[:2]
    session_ts = time.strftime("%Y%m%d_%H%M%S")
    window_name = "Gan nhan - Object"

    saved_count = 0
    skipped_count = 0

    for i, info in enumerate(masks_info):
        crop = crop_masked_object(roi_bgr, info, roi_w, roi_h, BBOX_PADDING_RATIO)
        if crop.size == 0:
            continue

        display_crop = crop
        longest = max(crop.shape[0], crop.shape[1])
        if longest < CROP_DISPLAY_MIN_SIDE:
            scale = CROP_DISPLAY_MIN_SIDE / longest
            display_crop = cv2.resize(crop, (int(crop.shape[1] * scale), int(crop.shape[0] * scale)))

        cv2.imshow(window_name, display_crop)
        cv2.waitKey(1)  # bat buoc: pump 1 lan de cua so thuc su ve truoc khi input() block

        prompt_default = last_label if last_label else "(chua co)"
        prompt = (f"Nhan cho vat #{i + 1}/{len(masks_info)} [{prompt_default}] "
                  f"(Enter=dung lai, '-'=bo qua, 'q'=dung dot nay): ")
        raw = input(prompt).strip()

        if raw.lower() == "q":
            print("[INFO] Dung gan nhan cho cac vat con lai trong dot nay.")
            break
        elif raw == "-":
            skipped_count += 1
            continue
        elif raw == "":
            if not last_label:
                print("[CANH BAO] Chua co nhan nao truoc do de dung lai, bo qua vat nay.")
                skipped_count += 1
                continue
            label = last_label
        else:
            label = sanitize_label(raw)
            last_label = label

        path = save_crop(dataset_dir, label, crop, session_ts, i + 1)
        saved_count += 1
        print(f"[INFO] Da luu: {path}")

    cv2.destroyWindow(window_name)
    return last_label, saved_count, skipped_count


# ====================================================================
# MAIN
# ====================================================================
def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Su dung device: {device}")
    if device == "cpu":
        print("[CANH BAO] Khong tim thay GPU - SAM2 se cham hon nhieu tren CPU.")

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

    cv2.namedWindow("Thu mau - Live", cv2.WINDOW_NORMAL)

    print(f"[INFO] Dataset se luu vao thu muc: {os.path.abspath(DATASET_DIR)}")
    print("[INFO] San sang. Nhan 's'/SPACE de tach + gan nhan vat, 'r' chon lai ROI, 'q'/ESC de thoat.")

    last_label = None

    try:
        while True:
            frame = frame_source.get_frame()
            if frame is None:
                print("[CANH BAO] Khong doc duoc frame.")
                continue

            display = frame.copy()
            cv2.rectangle(display, (roi_x0, roi_y0), (roi_x1, roi_y1), (0, 200, 255), 1)
            cv2.putText(display, "Nhan 's'/SPACE de tach + gan nhan vat", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            cv2.imshow("Thu mau - Live", display)

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

                if len(masks_info) == 0:
                    print("[INFO] Khong tach duoc vat nao trong ROI nay.")
                    continue

                print(f"[SAM2] Tach duoc {len(masks_info)} vat. Bat dau gan nhan...")
                last_label, saved, skipped = label_batch_interactively(
                    roi_bgr, masks_info, DATASET_DIR, last_label
                )
                print(f"[INFO] Da luu {saved} anh, bo qua {skipped}.")

    finally:
        frame_source.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
