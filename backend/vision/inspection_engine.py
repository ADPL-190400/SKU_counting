"""
Dieu phoi 1 lan inspection: ROI -> segment -> crop+match -> dem so luong
-> ve anh overlay ket qua. Segmenter/FeatureMatcher la 2 interface doc
lap (xem segmenter.py / feature_matcher.py) nen co the thay SAM2/DINOv3
sau nay ma khong sua ham nay.
"""

import os
import time

import cv2
import numpy as np

from .feature_matcher import FeatureMatcher
from .segmenter import Segmenter


def draw_result_overlay(base_bgr: np.ndarray, masks_info: list, matches: list, unknown_label: str) -> np.ndarray:
    overlay = base_bgr.copy()
    for idx, (info, m) in enumerate(zip(masks_info, matches)):
        label, score = m["label"], m["score"]
        color = (0, 0, 255) if label == unknown_label else (0, 200, 0)

        mask_u8 = (info["mask"].astype(np.uint8)) * 255
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, contours, -1, color, 2)

        x, y, w, h = info["bbox"]
        cv2.rectangle(overlay, (x, y), (x + w, y + h), color, 1)
        cv2.putText(overlay, f"#{idx + 1} {label} ({score:.2f})", (x, max(0, y - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    return overlay


class InspectionEngine:
    def __init__(self, cfg: dict, segmenter: Segmenter, matcher: FeatureMatcher, results_dir: str):
        self._cfg = cfg
        self._segmenter = segmenter
        self._matcher = matcher
        self._results_dir = results_dir
        os.makedirs(results_dir, exist_ok=True)

    def run(self, frame_bgr: np.ndarray, roi: tuple, order_code: str,
            allowed_labels: list[str] | None = None) -> dict:
        """
        roi: (x0, y0, x1, y1) pixel trong frame_bgr.
        allowed_labels: danh sach SKU cua don hang dang kiem tra - neu co,
            chi so khop trong pham vi nay (xem FeatureMatcher.extract_and_match).
        Tra ve dict: objects[], detected_counts{}, unknown_count, image_path,
        timing{sam2, dinov3, matching, total} (ms).
        """
        x0, y0, x1, y1 = roi
        roi_bgr = frame_bgr[y0:y1, x0:x1]

        t_start = time.time()
        roi_bgr = self._segmenter.prepare(roi_bgr)

        t0 = time.time()
        masks_info = self._segmenter.segment(roi_bgr)
        t_sam2 = time.time() - t0

        matches = self._matcher.extract_and_match(roi_bgr, masks_info, allowed_labels=allowed_labels)
        match_timing = getattr(self._matcher, "last_timing_ms", {"dinov3": 0.0, "matching": 0.0})

        unknown_label = self._cfg["unknown_label"]
        objects = []
        detected_counts: dict[str, int] = {}
        unknown_count = 0
        for idx, (info, m) in enumerate(zip(masks_info, matches)):
            label = m["label"]
            objects.append({
                "id": idx + 1,
                "sku": label,
                "score": m["score"],
                "bbox": info["bbox"],
                "top_candidates": m["top_candidates"],
            })
            if label == unknown_label:
                unknown_count += 1
            else:
                detected_counts[label] = detected_counts.get(label, 0) + 1

        overlay = draw_result_overlay(roi_bgr, masks_info, matches, unknown_label)
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
                "sam2": t_sam2 * 1000,
                "dinov3": match_timing["dinov3"],
                "matching": match_timing["matching"],
                "total": total * 1000,
            },
        }
