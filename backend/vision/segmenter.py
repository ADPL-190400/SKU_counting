"""
Segmenter interface + SAM2 implementation. Boc lai common_pipeline.py
(khong sua logic) sau lung 1 interface doc lap, de sau nay co the thay
SAM2 bang U2Net/YOLO-Seg/Grounded-SAM ma khong dong den caller
(inspection_engine.py).
"""

from abc import ABC, abstractmethod

from . import _path_shim  # noqa: F401  (them project root vao sys.path)

from common_pipeline import (
    filter_background_masks,
    generate_masks,
    load_sam2,
    merge_nested_masks,
    resize_for_sam2,
)


class Segmenter(ABC):
    def prepare(self, roi_bgr):
        """Tien xu ly ROI truoc khi segment (vd resize). Mac dinh: khong doi."""
        return roi_bgr

    @abstractmethod
    def segment(self, roi_bgr) -> list[dict]:
        """Tra ve list {"mask", "bbox", "area"} cho 1 anh ROI (BGR)."""
        raise NotImplementedError


class Sam2Segmenter(Segmenter):
    def __init__(self, cfg: dict, device: str):
        self._cfg = cfg
        self._mask_generator = load_sam2(
            cfg["sam2_model_id"],
            device,
            cfg["sam2_points_per_side"],
            cfg["sam2_pred_iou_thresh"],
            cfg["sam2_stability_score_thresh"],
        )

    def prepare(self, roi_bgr):
        """Resize ROI ve kich thuoc an toan cho SAM2 truoc khi segment (override)."""
        return resize_for_sam2(roi_bgr, self._cfg["sam2_max_side"])

    def segment(self, roi_bgr) -> list[dict]:
        masks_info = generate_masks(self._mask_generator, roi_bgr, self._cfg["min_area"])
        masks_info = filter_background_masks(masks_info, roi_bgr.shape[:2], self._cfg["max_area_ratio"])
        masks_info = merge_nested_masks(masks_info, self._cfg["mask_containment_thresh"])
        return masks_info
