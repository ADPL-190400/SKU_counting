export interface OrderProduct {
  sku: string;
  name: string;
  required_quantity: number;
}

export interface Order {
  code: string;
  products: OrderProduct[];
}

export interface DetectedObject {
  id: number;
  sku: string;
  score: number;
  bbox: [number, number, number, number];
  top_candidates: [string, number][];
}

export type SkuStatus = "OK" | "MISSING" | "EXCESS" | "UNKNOWN";
export type OverallResult = "COMPLETE" | "INCOMPLETE" | "ERROR";

export interface VerificationRow {
  sku: string;
  name: string;
  required: number;
  detected: number;
  difference: number;
  status: SkuStatus;
}

export interface ProcessingTimeMs {
  total: number;
  sam2: number;
  dinov3: number;
  matching: number;
  verification: number;
}

export interface InspectionResult {
  code: string;
  result: OverallResult;
  required: Record<string, number>;
  detected: Record<string, number>;
  unknown: number;
  objects: DetectedObject[];
  verification: VerificationRow[];
  image_url: string;
  processing_time_ms: ProcessingTimeMs;
  timestamp: string;
}

export interface ApiError {
  detail: string;
}

export interface Settings {
  similarity_threshold: number;
  min_area: number;
  max_area_ratio: number;
  mask_containment_thresh: number;
  bbox_padding_ratio: number;
  min_unknown_score: number;
  yolo_conf_threshold: number;
}

export interface HistoryRecord {
  code: string;
  timestamp: string;
  result: OverallResult;
  required: Record<string, number>;
  detected: Record<string, number>;
  unknown_count: number;
  image: string;
  processing_time_ms: number;
  threshold: number;
  operator: string;
}

export interface SkuInfo {
  sku: string;
  sample_count: number;
  thumbnail_url: string | null;
}

export interface SkuSample {
  filename: string;
  url: string;
}

export interface CaptureCrop {
  index: number;
  image_base64: string;
  bbox: [number, number, number, number];
}

export type Roi = [number, number, number, number];
