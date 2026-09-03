"""Pydantic schemas shared across the API layer."""

from typing import Literal, Optional

from pydantic import BaseModel


class OrderProduct(BaseModel):
    sku: str
    name: str
    required_quantity: int


class Order(BaseModel):
    code: str
    products: list[OrderProduct]


class InspectionRequest(BaseModel):
    order_code: str
    roi: Optional[tuple[int, int, int, int]] = None  # x0, y0, x1, y1


class DetectedObject(BaseModel):
    id: int
    sku: str
    score: float
    bbox: tuple[int, int, int, int]  # x, y, w, h
    top_candidates: list[tuple[str, float]]


SkuStatus = Literal["OK", "MISSING", "EXCESS", "UNKNOWN"]
OverallResult = Literal["COMPLETE", "INCOMPLETE", "ERROR"]


class VerificationRow(BaseModel):
    sku: str
    name: str
    required: int
    detected: int
    difference: int
    status: SkuStatus


class ProcessingTimeMs(BaseModel):
    total: float
    sam2: float
    dinov3: float
    matching: float
    verification: float


class InspectionResult(BaseModel):
    code: str
    result: OverallResult
    required: dict[str, int]
    detected: dict[str, int]
    unknown: int
    objects: list[DetectedObject]
    verification: list[VerificationRow]
    image_url: str
    processing_time_ms: ProcessingTimeMs
    timestamp: str


class HistoryRecord(BaseModel):
    code: str
    timestamp: str
    result: OverallResult
    required: dict[str, int]
    detected: dict[str, int]
    unknown_count: int
    image: str
    processing_time_ms: float
    threshold: float
    operator: str
