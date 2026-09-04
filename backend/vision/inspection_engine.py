"""
Dieu phoi 1 lan inspection: ROI -> detect (segment+match hoac YOLO truc
tiep) -> dem so luong -> ve anh overlay ket qua. ObjectDetector la interface
doc lap (xem object_detector.py) nen co the doi SAM2+DINOv3 sang YOLO (hoac
backend khac sau nay) ma khong sua ham nay.
"""

import os
import time

import cv2
import numpy as np

from .object_detector import ObjectDetector


def draw_result_overlay(base_bgr: np.ndarray, detections: list, unknown_label: str) -> np.ndarray:
    overlay = base_bgr.copy()
    for idx, d in enumerate(detections):
        label, score = d["label"], d["score"]
        color = (0, 0, 255) if label == unknown_label else (0, 200, 0)

        if d["mask"] is not None:
            mask_u8 = (d["mask"].astype(np.uint8)) * 255
            contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(overlay, contours, -1, color, 2)

        x, y, w, h = d["bbox"]
        cv2.rectangle(overlay, (x, y), (x + w, y + h), color, 1)
        cv2.putText(overlay, f"#{idx + 1} {label} ({score:.2f})", (x, max(0, y - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    return overlay


class InspectionEngine:
    def __init__(self, cfg: dict, detector: ObjectDetector, results_dir: str):
        self._cfg = cfg
        self._detector = detector
        self._results_dir = results_dir
        os.makedirs(results_dir, exist_ok=True)

    def set_detector(self, detector: ObjectDetector) -> None:
        """Doi detector dang dung ngay luc chay (vd chuyen sam2_dino <-> yolo
        khong can restart server - xem /api/settings/detection-backend)."""
        self._detector = detector

    def run(self, frame_bgr: np.ndarray, roi: tuple, order_code: str,
            allowed_labels: list[str] | None = None) -> dict:
        """
        roi: (x0, y0, x1, y1) pixel trong frame_bgr.
        allowed_labels: danh sach SKU cua don hang dang kiem tra - neu co,
            chi so khop trong pham vi nay (xem ObjectDetector.detect() - tuy
            backend co the bo qua tham so nay, vd YoloDetector).
        Tra ve dict: objects[], detected_counts{}, unknown_count, image_path,
        timing{sam2, dinov3, matching, total} (ms).
        """
        x0, y0, x1, y1 = roi
        roi_bgr = frame_bgr[y0:y1, x0:x1]

        t_start = time.time()
        roi_bgr = self._detector.prepare(roi_bgr)

        detections, timing_ms = self._detector.detect(roi_bgr, allowed_labels=allowed_labels)

        unknown_label = self._cfg["unknown_label"]
        min_unknown_score = self._cfg.get("min_unknown_score", 0.0)
        # Vat "unknown" diem qua thap thuong chi la mask vun/nen tu SAM2,
        # khong phai vat la thuc su - loai het truoc khi dung de dem/ve,
        # tranh gay nhieu ket qua bang nhung mask khong dang tin cay.
        detections = [
            d for d in detections
            if not (d["label"] == unknown_label and d["score"] < min_unknown_score)
        ]

        objects = []
        detected_counts: dict[str, int] = {}
        unknown_count = 0
        for idx, d in enumerate(detections):
            label = d["label"]
            objects.append({
                "id": idx + 1,
                "sku": label,
                "score": d["score"],
                "bbox": d["bbox"],
                "top_candidates": d["top_candidates"],
            })
            if label == unknown_label:
                unknown_count += 1
            else:
                detected_counts[label] = detected_counts.get(label, 0) + 1

        overlay = draw_result_overlay(roi_bgr, detections, unknown_label)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        image_name = f"{order_code}_{timestamp}.png"
        image_path = os.path.join(self._results_dir, image_name)
        cv2.imwrite(image_path, overlay)

        total = time.time() - t_start

        return {
            "objects": objects,
            "detected_counts": detected_counts,
            "unknown_count": unknown_count,
            "image_name": image_name,
            "timestamp": timestamp,
            "timing_ms": {
                **timing_ms,
                "total": total * 1000,
            },
        }
