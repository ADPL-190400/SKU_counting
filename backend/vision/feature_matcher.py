"""
FeatureMatcher interface + DINOv3 implementation. Boc lai common_dino.py
(khong sua logic) sau lung 1 interface doc lap, de sau nay co the thay
DINOv3 bang DINOv2/CLIP/SigLIP/model rieng ma khong dong den caller.
"""

import time
from abc import ABC, abstractmethod

import numpy as np

from . import _path_shim  # noqa: F401

from common_dino import DINOFeatureExtractor, LabelMatcher
from common_pipeline import crop_masked_object


class FeatureMatcher(ABC):
    @abstractmethod
    def extract_and_match(self, roi_bgr, masks_info: list, allowed_labels: list[str] | None = None) -> list[dict]:
        """
        Voi tung vat trong masks_info: crop -> trich feature -> so khop.
        allowed_labels: neu co, chi so khop trong pham vi cac nhan nay
            (vd danh sach SKU cua 1 don hang cu the) thay vi toan bo
            dataset - giup tang do chinh xac vi bot nham lan voi cac nhan
            khong lien quan. None = so khop voi toan bo dataset (hanh vi cu).
        Tra ve list {"label", "score", "top_candidates": [(label, score), ...]}
        cung thu tu voi masks_info.
        """
        raise NotImplementedError


class Dinov3Matcher(FeatureMatcher):
    def __init__(self, cfg: dict, device: str):
        import cv2

        self._cv2 = cv2
        self._cfg = cfg
        self._extractor = DINOFeatureExtractor(cfg["dinov3_model_id"], device)
        self._extractor.load_model()
        # allow_empty=True: server phai khoi dong duoc tren may hoan toan
        # moi (dataset/ rong), de vao duoc trang SKU Management enroll SKU
        # dau tien qua web - khac CLI (enroll_samples.py/live_classify.py)
        # van bao loi ro rang neu chay khi chua co du lieu.
        self._label_matcher = LabelMatcher.from_dataset_dir(self._extractor, self._dataset_dir(), allow_empty=True)
        self.last_timing_ms = {"dinov3": 0.0, "matching": 0.0}

    def _dataset_dir(self):
        from backend.config import DATASET_DIR

        return DATASET_DIR

    def reload_dataset(self):
        """Nap lai reference dataset (goi sau khi enroll/xoa mau) - allow_empty=True
        vi xoa SKU cuoi cung se dua dataset ve rong, van khong duoc lam sap server."""
        self._label_matcher = LabelMatcher.from_dataset_dir(self._extractor, self._dataset_dir(), allow_empty=True)

    def extract_and_match(self, roi_bgr, masks_info: list, allowed_labels: list[str] | None = None) -> list[dict]:
        if len(masks_info) == 0:
            return []

        cv2 = self._cv2
        roi_h, roi_w = roi_bgr.shape[:2]
        padding_ratio = self._cfg["bbox_padding_ratio"]

        crops_rgb = []
        for info in masks_info:
            crop = crop_masked_object(roi_bgr, info, roi_w, roi_h, padding_ratio)
            crops_rgb.append(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))

        t0 = time.time()
        features = self._extractor.extract_features_batch(crops_rgb)
        t_dinov3 = time.time() - t0

        threshold = self._cfg["similarity_threshold"]
        unknown_label = self._cfg["unknown_label"]
        matcher = self._label_matcher.subset(allowed_labels) if allowed_labels is not None else self._label_matcher
        label_names = matcher.label_names
        ref_matrix = matcher.ref_matrix

        t0 = time.time()
        results = []
        if ref_matrix.shape[0] == 0:
            # Khong co nhan nao trong allowed_labels co du lieu mau da
            # enroll -> khong the so khop, tat ca deu la unknown.
            for _ in range(features.shape[0]):
                results.append({"label": unknown_label, "score": 0.0, "top_candidates": []})
        else:
            sims = features @ ref_matrix.T  # (N, L)
            for row in sims:
                order = np.argsort(row)[::-1]
                top_candidates = [(label_names[i], float(row[i])) for i in order[:3]]
                best_label, best_score = top_candidates[0]
                label = best_label if best_score >= threshold else unknown_label
                results.append({"label": label, "score": best_score, "top_candidates": top_candidates})

        self.last_timing_ms = {"dinov3": t_dinov3 * 1000, "matching": (time.time() - t0) * 1000}
        return results
