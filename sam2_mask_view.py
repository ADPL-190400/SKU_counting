"""
============================================================
CONG CU XEM MASK TAO BOI SAM2 (Automatic Mask Generator)
============================================================

Muc dich: CHI DE XEM/DANH GIA chat luong mask ma SAM2 tach duoc - tren
video tu camera RealSense HOAC tren 1 anh tinh co san - CHUA tich hop
vao pipeline dem/tach vat the. Dung script nay de quyet dinh SAM2 co
dang tich hop tiep khong, truoc khi ghep voi U2Net.

Cach dung: chon ROI, roi nhan 's' (hoac SPACE) moi khi muon chay SAM2
tren khung hinh hien tai (SAM2 tuong doi nang, nen chay theo yeu cau
thay vi lien tuc moi frame).

============================================================
NGUON ANH: CAMERA (mac dinh) HOAC FILE ANH TINH
============================================================
    Chay tu thu muc goc cua du an (ben ngoai sku_counting/), vi venv nam o do:

    Mac dinh (khong truyen gi) -> dung camera RealSense:
        venv\\Scripts\\python.exe sku_counting\\sam2_mask_view.py

    Truyen duong dan anh -> dung anh tinh do thay vi camera (tien khi
    khong co camera trong tay, hoac muon test lai cung 1 anh nhieu lan):
        venv\\Scripts\\python.exe sku_counting\\sam2_mask_view.py duong/dan/toi/anh.jpg

============================================================
HUONG DAN CAI DAT THU VIEN
============================================================
    pip install opencv-python numpy torch pyrealsense2

    (torch can CUDA neu muon chay GPU, vi du:
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
    Chi co CPU thi cai binh thuong: pip install torch torchvision)

    SAM2 khong co tren PyPI, phai cai tu source:
        git clone https://github.com/facebookresearch/sam2.git
        cd sam2
        pip install -e .
    (Chay script nay tu thu muc KHAC voi thu muc "sam2" vua clone.)

============================================================
DIEU KHIEN TRONG LUC CHAY
============================================================
    s / SPACE : chay SAM2 tren khung hinh hien tai trong ROI
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
    draw_masks_overlay,
)


# ====================================================================
# CONFIG
# ====================================================================
STREAM_WIDTH = 1280
STREAM_HEIGHT = 720
STREAM_FPS = 30

# Cac bien the SAM2.1 (nhanh -> chinh xac):
#   facebook/sam2.1-hiera-tiny, -small, -base-plus, -large
SAM2_MODEL_ID = "facebook/sam2.1-hiera-small"

# Cang cao cang bat duoc vat nho/chi tiet hon nhung CHAY CHAM HON NHIEU
# (points_per_side**2 diem lay mau). Giam xuong neu cho lau qua.
SAM2_POINTS_PER_SIDE = 16
SAM2_PRED_IOU_THRESH = 0.8
SAM2_STABILITY_SCORE_THRESH = 0.9

MIN_AREA = 300  # dien tich (px) toi thieu de giu 1 mask

# Canh dai nhat (px) cho anh dua vao SAM2. Anh tinh (vd anh chup tu dien
# thoai) co the rat lon (vd 5712x4284) - dua thang vao SAM2 se lam VRAM
# GPU no tung (OutOfMemoryError) vi automatic mask generator xu ly hau
# ky (loc/upscale mask) o DUNG do phan giai anh dau vao. Neu ROI dua vao
# lon hon nguong nay, se tu dong resize xuong truoc khi chay SAM2.
SAM2_MAX_SIDE = 1280

# Loc mask NEN: bo mask co dien tich > ty le nay so voi ca ROI (ban/khay
# nen thuong la mask lon nhat trong anh).
MAX_AREA_RATIO = 0.5

# Gop mask LONG NHAU (1 vat bi SAM2 tach thanh nhieu mask chong lan -
# vd 1 mask la ca vat, 1 mask khac chi la nhan/logo/1 phan cua no):
# neu (dien tich phan giao) / (dien tich mask NHO hon) > nguong nay,
# coi mask nho la 1 PHAN cua mask lon, chi giu lai mask lon.
MASK_CONTAINMENT_THRESH = 0.85


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

    cv2.namedWindow("SAM2 Mask Viewer - Live", cv2.WINDOW_NORMAL)
    cv2.namedWindow("SAM2 Mask Viewer - Result", cv2.WINDOW_NORMAL)

    print("[INFO] San sang. Nhan 's'/SPACE de chay SAM2, 'r' chon lai ROI, 'q'/ESC de thoat.")

    try:
        while True:
            frame = frame_source.get_frame()
            if frame is None:
                print("[CANH BAO] Khong doc duoc frame.")
                continue

            display = frame.copy()
            cv2.rectangle(display, (roi_x0, roi_y0), (roi_x1, roi_y1), (0, 200, 255), 1)
            cv2.putText(display, "Nhan 's'/SPACE de chay SAM2", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            cv2.imshow("SAM2 Mask Viewer - Live", display)

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
                elapsed = time.time() - t0
                raw_count = len(masks_info)

                masks_info = filter_background_masks(masks_info, roi_bgr.shape[:2], MAX_AREA_RATIO)
                after_bg_count = len(masks_info)

                masks_info = merge_nested_masks(masks_info, MASK_CONTAINMENT_THRESH)

                print(f"[SAM2] Xong trong {elapsed:.2f}s: {raw_count} mask tho -> "
                      f"bo {raw_count - after_bg_count} mask nen -> "
                      f"gop {after_bg_count - len(masks_info)} mask long nhau "
                      f"-> con {len(masks_info)} vat.")

                result = draw_masks_overlay(roi_bgr, masks_info)
                cv2.putText(result, f"Masks: {len(masks_info)}  |  {elapsed:.2f}s",
                            (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.imshow("SAM2 Mask Viewer - Result", result)

    finally:
        frame_source.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
