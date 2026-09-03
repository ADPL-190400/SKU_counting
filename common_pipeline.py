"""
============================================================
MODULE DUNG CHUNG: NGUON ANH (CAMERA/ANH TINH) + PIPELINE SAM2
============================================================

Gom cac ham/lop dung chung giua sam2_mask_view.py, enroll_samples.py va
live_classify.py, de tranh copy-paste va fix bug 1 noi ma quen noi khac:

  - RealSenseFrameSource / ImageFrameSource / select_roi: lay khung hinh
    tu camera RealSense (chi stream mau) HOAC tu 1 anh tinh, cung 1
    interface get_frame()/close().
  - resize_for_sam2 / load_sam2 / generate_masks / filter_background_masks
    / merge_nested_masks / draw_masks_overlay: pipeline segment vat the
    bang SAM2 (da kiem chung trong sam2_mask_view.py) - tach mask, loc
    mask nen (qua lon so voi ROI), gop mask long nhau (1 vat bi tach
    thanh nhieu mask chong lan do NMS cua SAM2 chi so sanh IoU bounding
    box, khong bat duoc truong hop 1 mask nho nam gon trong 1 mask lon).
  - pad_bbox: mo rong 1 bbox them padding roi clip ve bien anh (dung khi
    crop vat the de dua vao DINOv3 - giu them ngu canh xung quanh).
"""

import sys

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
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
except ImportError:
    print("[LOI] Chua cai SAM2. Cai tu source: git clone "
          "https://github.com/facebookresearch/sam2.git && cd sam2 && pip install -e .")
    sys.exit(1)


# ====================================================================
# NGUON ANH: CAMERA REALSENSE HOAC ANH TINH (cung 1 interface get_frame())
# ====================================================================
class RealSenseFrameSource:
    """Lay frame tu camera RealSense (chi stream mau, khong dung depth)."""

    def __init__(self, width: int = 1280, height: int = 720, fps: int = 30):
        try:
            import pyrealsense2 as rs
        except ImportError:
            print("[LOI] Chua cai pyrealsense2. Cai bang lenh: pip install pyrealsense2")
            sys.exit(1)

        self._rs = rs
        self.pipeline = rs.pipeline()
        config = rs.config()
        config.enable_stream(rs.stream.color, width, height, rs.format.bgr8, fps)
        self.pipeline.start(config)

    def get_frame(self):
        """Lay 1 frame anh mau (BGR, numpy) tu RealSense, tra ve None neu loi."""
        frames = self.pipeline.wait_for_frames()
        color_frame = frames.get_color_frame()
        if not color_frame:
            return None
        return np.asanyarray(color_frame.get_data())

    def close(self):
        self.pipeline.stop()


class ImageFrameSource:
    """Nguon anh tinh (1 file) - get_frame() luon tra ve cung 1 anh, de
    dung chung code voi RealSenseFrameSource ma khong can camera."""

    def __init__(self, image_path: str):
        image = cv2.imread(image_path)
        if image is None:
            print(f"[LOI] Khong doc duoc anh: {image_path}")
            sys.exit(1)
        self.image = image
        print(f"[INFO] Da doc anh: {image_path} (kich thuoc {image.shape[1]}x{image.shape[0]})")

    def get_frame(self):
        return self.image.copy()

    def close(self):
        pass


def select_roi(frame_source):
    """
    Cho nguoi dung keo chuot chon 1 vung ROI tren khung hinh, tra ve
    (x0, y0, x1, y1). Neu khong chon thi dung toan bo khung hinh.
    """
    print("[INFO] Chon ROI: keo chuot ve khung quanh vung can quet, "
          "nhan ENTER/SPACE de xac nhan, 'c' de huy (dung toan khung hinh).")

    frame = None
    while frame is None:
        frame = frame_source.get_frame()

    window_name = "Chon ROI - keo chuot roi nhan ENTER"
    x, y, w, h = cv2.selectROI(window_name, frame, fromCenter=False, showCrosshair=True)
    cv2.destroyWindow(window_name)

    frame_h, frame_w = frame.shape[:2]
    if w == 0 or h == 0:
        print("[INFO] Khong chon ROI, dung toan bo khung hinh.")
        return 0, 0, frame_w, frame_h

    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(frame_w, int(x + w)), min(frame_h, int(y + h))
    print(f"[INFO] Da chon ROI: ({x0}, {y0}) -> ({x1}, {y1})")
    return x0, y0, x1, y1


# ====================================================================
# PIPELINE SAM2: SEGMENT -> LOC NEN -> GOP MASK LONG NHAU
# ====================================================================
def resize_for_sam2(image_bgr: np.ndarray, max_side: int) -> np.ndarray:
    """Thu nho anh neu canh dai nhat vuot qua max_side (giu ty le), de
    tranh SAM2 xu ly anh qua lon lam tran VRAM."""
    h, w = image_bgr.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return image_bgr
    scale = max_side / longest
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    return cv2.resize(image_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)


def load_sam2(model_id: str, device: str, points_per_side: int,
              pred_iou_thresh: float, stability_score_thresh: float):
    """Tai SAM2AutomaticMaskGenerator truc tiep tu Hugging Face Hub."""
    print(f"[SAM2] Dang tai model '{model_id}' (device={device}) "
          f"- lan dau se tu dong tai checkpoint, can Internet...")
    mask_generator = SAM2AutomaticMaskGenerator.from_pretrained(
        model_id,
        device=device,
        points_per_side=points_per_side,
        pred_iou_thresh=pred_iou_thresh,
        stability_score_thresh=stability_score_thresh,
    )
    print("[SAM2] Tai model thanh cong.")
    return mask_generator


def generate_masks(mask_generator, frame_bgr: np.ndarray, min_area: int):
    """
    Chay SAM2 automatic mask generator tren 1 anh BGR.
    Tra ve list cac dict {"mask": bool (H,W), "bbox": (x,y,w,h), "area": int},
    da loc bo mask qua nho, sap xep dien tich giam dan.
    """
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    raw_masks = mask_generator.generate(frame_rgb)

    results = []
    for m in raw_masks:
        area = int(m["area"])
        if area < min_area:
            continue
        x, y, w, h = (int(v) for v in m["bbox"])  # SAM2 tra bbox dang XYWH
        results.append({"mask": m["segmentation"], "bbox": (x, y, w, h), "area": area})

    results.sort(key=lambda d: d["area"], reverse=True)
    return results


def filter_background_masks(masks_info: list, roi_shape, max_area_ratio: float) -> list:
    """Bo cac mask qua lon so voi ca ROI - thuong la nen/ban/khay chu
    khong phai 1 vat the rieng le."""
    roi_area = roi_shape[0] * roi_shape[1]
    return [m for m in masks_info if m["area"] <= max_area_ratio * roi_area]


def merge_nested_masks(masks_info: list, containment_thresh: float) -> list:
    """
    Loai cac mask la 1 PHAN nam LONG trong 1 mask khac (nguyen nhan
    chinh khien 1 vat bi tach thanh nhieu mask chong lan: NMS cua SAM2
    chi so sanh IoU cua BOUNDING BOX nen khong bat duoc truong hop 1
    mask nho nam gon trong 1 mask lon - 2 box do dien tich chenh lech
    nen IoU box van thap).

    Duyet tu mask LON nhat, mask nao co (giao voi 1 mask da giu lai) /
    (dien tich chinh no) > containment_thresh thi bi coi la 1 phan cua
    mask do va bi loai, chi giu lai mask lon hon.
    """
    sorted_masks = sorted(masks_info, key=lambda m: m["area"], reverse=True)
    kept = []
    for cand in sorted_masks:
        is_nested = False
        for parent in kept:
            inter = np.count_nonzero(cand["mask"] & parent["mask"])
            if inter / max(cand["area"], 1) > containment_thresh:
                is_nested = True
                break
        if not is_nested:
            kept.append(cand)
    return kept


def draw_masks_overlay(base_bgr: np.ndarray, masks_info: list) -> np.ndarray:
    """
    Ve tung mask len anh nen bang 1 mau rieng (blend trong suot) + duong
    vien + so thu tu, de de phan biet tung mask bang mat.
    """
    overlay = base_bgr.copy()
    rng = np.random.default_rng(12345)  # seed co dinh -> mau on dinh giua cac lan chay

    for idx, info in enumerate(masks_info):
        mask = info["mask"]
        color = tuple(int(c) for c in rng.integers(60, 255, size=3))

        colored = np.zeros_like(base_bgr)
        colored[mask] = color
        overlay = np.where(mask[:, :, None], cv2.addWeighted(overlay, 0.5, colored, 0.5, 0), overlay)

        mask_u8 = (mask.astype(np.uint8)) * 255
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, contours, -1, color, 2)

        x, y, w, h = info["bbox"]
        cv2.putText(overlay, f"#{idx + 1}", (x, max(0, y - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    return overlay


def pad_bbox(x, y, w, h, frame_w, frame_h, padding_ratio):
    """Mo rong 1 bbox them padding_ratio moi chieu, roi clip ve bien anh."""
    pad_w = int(w * padding_ratio)
    pad_h = int(h * padding_ratio)
    x0 = max(0, x - pad_w)
    y0 = max(0, y - pad_h)
    x1 = min(frame_w, x + w + pad_w)
    y1 = min(frame_h, y + h + pad_h)
    return x0, y0, x1, y1


def crop_masked_object(frame_bgr: np.ndarray, info: dict, frame_w: int, frame_h: int,
                        padding_ratio: float, bg_color=(255, 255, 255)) -> np.ndarray:
    """
    Cat 1 vat the DUNG THEO HINH DANG MASK (segmentation cua SAM2) thay vi
    nguyen ca hinh chu nhat bbox: truoc khi crop, moi pixel NGOAI mask cua
    vat nay (nen, hoac 1 vat khac lot vao trong bbox) duoc thay bang mau
    nen trung tinh (mac dinh trang) - phan padding quanh vat cung bi "lam
    sach" theo cach nay, chi con dung silhouette that cua vat + nen trang.

    Truoc day (pad_bbox + cat thang tu roi_bgr) giu nguyen ca nen/vat ben
    canh nam trong hinh chu nhat bbox, co the lam nhieu embedding DINOv3
    khi vat khong phai hinh chu nhat hoac nam sat vat khac.

    info: 1 phan tu masks_info tu generate_masks() - can co "mask" (bool
    array cung kich thuoc frame_bgr) va "bbox" (x, y, w, h).
    """
    x, y, w, h = info["bbox"]
    x0, y0, x1, y1 = pad_bbox(x, y, w, h, frame_w, frame_h, padding_ratio)

    masked = frame_bgr.copy()
    masked[~info["mask"]] = bg_color
    return masked[y0:y1, x0:x1]
