"""
ObjectDetector interface: gop segment+match (SAM2+DINOv3) hoac detect truc
tiep (YOLO) thanh 1 dau ra thong nhat, de InspectionEngine khong can biet
dang dung backend nao. Sam2DinoDetector chi la wrapper tai su dung lai
Segmenter/FeatureMatcher (segmenter.py/feature_matcher.py) - khong doi logic.
"""

import time
from abc import ABC, abstractmethod

from .feature_matcher import FeatureMatcher
from .segmenter import Segmenter


class ObjectDetector(ABC):
    def prepare(self, roi_bgr):
        """Tien xu ly ROI truoc khi detect (vd resize). Mac dinh: khong doi."""
        return roi_bgr

    @abstractmethod
    def detect(self, roi_bgr, allowed_labels: list[str] | None = None) -> tuple[list[dict], dict]:
        """
        Tra ve (detections, timing_ms).
        detections: list {"bbox": (x,y,w,h), "mask": ndarray|None, "label": str,
                           "score": float, "top_candidates": [(label, score), ...]}
        timing_ms: {"sam2": float, "dinov3": float, "matching": float} - dung
            lai dung ten key nay (khong doi ten cho "trung lap" voi ten SAM2/
            DINOv3) de ProcessingTimeMs schema + response o inspection.py +
            chuoi i18n hien thi thoi gian o frontend deu KHONG can sua -
            YOLO chi do vao slot "sam2" (thoi gian detect), "dinov3"/
            "matching" de 0.
        """
        raise NotImplementedError


class Sam2DinoDetector(ObjectDetector):
    """Wrapper tai su dung Segmenter + FeatureMatcher dung y nhu
    InspectionEngine.run() lam truoc day - khong doi hanh vi."""

    def __init__(self, segmenter: Segmenter, matcher: FeatureMatcher):
        self._segmenter = segmenter
        self._matcher = matcher

    def prepare(self, roi_bgr):
        return self._segmenter.prepare(roi_bgr)

    def detect(self, roi_bgr, allowed_labels: list[str] | None = None) -> tuple[list[dict], dict]:
        t0 = time.time()
        masks_info = self._segmenter.segment(roi_bgr)
        t_sam2 = time.time() - t0

        matches = self._matcher.extract_and_match(roi_bgr, masks_info, allowed_labels=allowed_labels)
        match_timing = getattr(self._matcher, "last_timing_ms", {"dinov3": 0.0, "matching": 0.0})

        detections = [
            {
                "bbox": info["bbox"],
                "mask": info["mask"],
                "label": m["label"],
                "score": m["score"],
                "top_candidates": m["top_candidates"],
            }
            for info, m in zip(masks_info, matches)
        ]
        timing_ms = {"sam2": t_sam2 * 1000, "dinov3": match_timing["dinov3"], "matching": match_timing["matching"]}
        return detections, timing_ms


class YoloDetector(ObjectDetector):
    """
    Detect truc tiep bang YOLO (ultralytics) - model da train san, class =
    ten SKU. Khong loc theo allowed_labels (khac Sam2DinoDetector): YOLO la
    closed-set, khong co khai niem "so khop trong pham vi don hang" nhu
    DINOv3 - de model tu do detect het cac class no biet, SKU nao khong
    thuoc don hang dang kiem tra se tu nhien thanh EXCESS qua
    verification_service.verify() (da xu ly san, khong can code them).
    Model khong co class "unknown" nen che do nay KHONG phat hien duoc vat
    hoan toan la - chi bat duoc "sai SKU" (SKU khac xuat hien ngoai du kien).
    """

    def __init__(self, model_path: str, device: str, cfg: dict):
        from ultralytics import YOLO

        self._cfg = cfg
        self._model = YOLO(model_path)
        self._model.to(device)

    def detect(self, roi_bgr, allowed_labels: list[str] | None = None) -> tuple[list[dict], dict]:
        t0 = time.time()
        conf = self._cfg.get("yolo_conf_threshold", 0.5)
        results = self._model.predict(roi_bgr, conf=conf, verbose=False)[0]
        t_detect = time.time() - t0

        detections = []
        names = results.names
        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = names[cls_id]
            score = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            bbox = (int(x1), int(y1), int(x2 - x1), int(y2 - y1))
            detections.append({
                "bbox": bbox,
                "mask": None,
                "label": label,
                "score": score,
                "top_candidates": [(label, score)],
            })

        timing_ms = {"sam2": t_detect * 1000, "dinov3": 0.0, "matching": 0.0}
        return detections, timing_ms
