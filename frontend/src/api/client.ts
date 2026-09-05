import type { CaptureCrop, HistoryRecord, InspectionResult, Order, Roi, Settings, SkuInfo, SkuSample } from "../types";

class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const AUTH_ENDPOINTS = ["/api/login", "/api/whoami"];

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore: body was not valid JSON
    }
    const path = new URL(res.url).pathname;
    if (res.status === 401 && !AUTH_ENDPOINTS.includes(path)) {
      // Session het han giua luc dung app (khac voi 401 luc login sai mat
      // khau, hoac whoami luc kiem tra auth ban dau) - bao App.tsx quay ve trang login.
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiRequestError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export async function getOrder(code: string): Promise<Order> {
  const res = await fetch(`/api/orders/${encodeURIComponent(code)}`);
  return handle<Order>(res);
}

export async function startCamera(): Promise<{ running: boolean }> {
  const res = await fetch("/api/camera/start", { method: "POST" });
  return handle(res);
}

export async function stopCamera(): Promise<{ running: boolean }> {
  const res = await fetch("/api/camera/stop", { method: "POST" });
  return handle(res);
}

export async function getCameraStatus(): Promise<{ running: boolean }> {
  const res = await fetch("/api/camera/status");
  return handle(res);
}

export function cameraStreamUrl(): string {
  return `/api/camera/stream?t=${Date.now()}`;
}

export async function getRoi(): Promise<{ roi: Roi | null }> {
  const res = await fetch("/api/camera/roi");
  return handle(res);
}

export async function setRoi(roi: Roi | null): Promise<{ roi: Roi | null }> {
  const res = await fetch("/api/camera/roi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roi }),
  });
  return handle(res);
}

export async function runInspection(orderCode: string): Promise<InspectionResult> {
  const res = await fetch("/api/inspection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_code: orderCode }),
  });
  return handle<InspectionResult>(res);
}

export async function resetRelay(): Promise<void> {
  await fetch("/api/relay/reset", { method: "POST" });
}

export interface User {
  email: string;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle<User>(res);
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}

export async function whoami(): Promise<User> {
  const res = await fetch("/api/whoami");
  return handle<User>(res);
}

export async function getHistory(): Promise<HistoryRecord[]> {
  const res = await fetch("/api/history");
  return handle<HistoryRecord[]>(res);
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  return handle<Settings>(res);
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  return handle<Settings>(res);
}

export type DetectionBackend = "sam2_dino" | "yolo";

export async function getDetectionBackend(): Promise<{ detection_backend: DetectionBackend; yolo_available: boolean }> {
  const res = await fetch("/api/settings/detection-backend");
  return handle(res);
}

export async function setDetectionBackend(backend: DetectionBackend): Promise<{ detection_backend: DetectionBackend }> {
  const res = await fetch("/api/settings/detection-backend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ detection_backend: backend }),
  });
  return handle(res);
}

export async function getSkus(): Promise<SkuInfo[]> {
  const res = await fetch("/api/skus");
  return handle<SkuInfo[]>(res);
}

export async function getSkuSamples(label: string): Promise<{ sku: string; samples: SkuSample[] }> {
  const res = await fetch(`/api/sku/${encodeURIComponent(label)}/samples`);
  return handle(res);
}

export async function captureSkuCrops(): Promise<{ crops: CaptureCrop[] }> {
  const res = await fetch("/api/sku/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return handle(res);
}

export async function uploadSkuCrops(files: File[]): Promise<{ crops: CaptureCrop[]; skipped_filenames: string[] }> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  const res = await fetch("/api/sku/upload-capture", { method: "POST", body: formData });
  return handle(res);
}

export async function saveSkuSample(label: string, imageBase64: string): Promise<SkuInfo> {
  const res = await fetch("/api/sku/samples", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, image_base64: imageBase64 }),
  });
  return handle<SkuInfo>(res);
}

export async function deleteSkuSample(label: string, filename: string): Promise<void> {
  await fetch(`/api/sku/${encodeURIComponent(label)}/samples/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
}

export async function deleteSku(label: string): Promise<void> {
  await fetch(`/api/sku/${encodeURIComponent(label)}`, { method: "DELETE" });
}

export { ApiRequestError };
