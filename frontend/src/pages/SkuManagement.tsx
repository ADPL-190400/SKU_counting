import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  captureSkuCrops,
  cameraStreamUrl,
  deleteSku,
  deleteSkuSample,
  getCameraStatus,
  getRoi,
  getSkuSamples,
  getSkus,
  saveSkuSample,
  setRoi as apiSetRoi,
  startCamera,
  stopCamera,
  uploadSkuCrops,
} from "../api/client";
import { RoiOverlay } from "../components/RoiOverlay";
import { RoiSelector } from "../components/RoiSelector";
import { SkuPicker } from "../components/SkuPicker";
import type { CaptureCrop, Roi, SkuInfo, SkuSample } from "../types";

type SourceMode = "camera" | "upload";

export function SkuManagement() {
  const [skus, setSkus] = useState<SkuInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [samples, setSamples] = useState<SkuSample[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [cameraRunning, setCameraRunning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [label, setLabel] = useState("");
  const [crops, setCrops] = useState<CaptureCrop[]>([]);
  const [capturing, setCapturing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamKey, setStreamKey] = useState(0);

  const [roi, setRoiState] = useState<Roi | null>(null);
  const [roiEditing, setRoiEditing] = useState(false);

  const [sourceMode, setSourceMode] = useState<SourceMode>("camera");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUrlsRef = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    const cache = pendingUrlsRef.current;
    for (const [file, url] of cache) {
      if (!pendingFiles.includes(file)) {
        URL.revokeObjectURL(url);
        cache.delete(file);
      }
    }
    for (const file of pendingFiles) {
      if (!cache.has(file)) cache.set(file, URL.createObjectURL(file));
    }
  }, [pendingFiles]);

  function refreshSkus() {
    getSkus()
      .then(setSkus)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load SKUs."));
  }

  useEffect(() => {
    refreshSkus();
    getCameraStatus()
      .then((s) => setCameraRunning(s.running))
      .catch(() => setCameraRunning(false));
    getRoi()
      .then((r) => setRoiState(r.roi))
      .catch(() => setRoiState(null));
  }, []);

  async function handleRoiConfirm(newRoi: Roi) {
    setRoiEditing(false);
    try {
      const res = await apiSetRoi(newRoi);
      setRoiState(res.roi);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to save ROI.");
    }
  }

  async function handleClearRoi() {
    try {
      const res = await apiSetRoi(null);
      setRoiState(res.roi);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to clear ROI.");
    }
  }

  async function toggleExpand(skuLabel: string) {
    if (expanded === skuLabel) {
      setExpanded(null);
      return;
    }
    try {
      const res = await getSkuSamples(skuLabel);
      setSamples(res.samples);
      setExpanded(skuLabel);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to load samples.");
    }
  }

  async function handleDeleteSample(skuLabel: string, filename: string) {
    await deleteSkuSample(skuLabel, filename);
    const res = await getSkuSamples(skuLabel);
    setSamples(res.samples);
    refreshSkus();
  }

  async function handleDeleteSku(skuLabel: string) {
    await deleteSku(skuLabel);
    if (expanded === skuLabel) setExpanded(null);
    refreshSkus();
  }

  // Ket noi/ngat camera dung chung voi Inspection page (giong pattern
  // "Ket noi/Ngat" 1 nut duy nhat cua PROCESS_INSPECTION) - tach khoi
  // Capture & Segment, khong gan voi 1 lan chup cu the.
  async function handleToggleConnection() {
    setConnecting(true);
    setError(null);
    try {
      if (cameraRunning) {
        await stopCamera();
        setCameraRunning(false);
      } else {
        await startCamera();
        setCameraRunning(true);
        setStreamKey((k) => k + 1);
      }
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Camera offline.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleCapture() {
    setCapturing(true);
    setError(null);
    try {
      const res = await captureSkuCrops();
      setCrops(res.crops);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Capture failed.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleAddCrop(crop: CaptureCrop) {
    if (!label.trim()) {
      setError("Nhập tên SKU trước khi thêm mẫu.");
      return;
    }
    try {
      await saveSkuSample(label.trim(), crop.image_base64);
      setCrops((prev) => prev.filter((c) => c.index !== crop.index));
      refreshSkus();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Save failed.");
    }
  }

  function handleSkipCrop(crop: CaptureCrop) {
    setCrops((prev) => prev.filter((c) => c.index !== crop.index));
  }

  function addPendingFiles(fileList: FileList | File[]) {
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setPendingFiles((prev) => [...prev, ...images]);
  }

  function removePendingFile(name: string) {
    setPendingFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleUploadSegment() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadSkuCrops(pendingFiles);
      setCrops(res.crops);
      if (res.skipped_filenames.length > 0) {
        setError(`Bỏ qua ${res.skipped_filenames.length} file không đọc được: ${res.skipped_filenames.join(", ")}`);
      }
      setPendingFiles([]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Tách vật thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold tracking-widest text-text-faint mb-3">ADD SAMPLES</h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
          <div>
            <label className="block text-xs text-text-dim mb-1">SKU Name</label>
            <div className="mb-3">
              <SkuPicker value={label} onChange={setLabel} skus={skus} />
            </div>

            <div className="flex gap-1 mb-3 bg-bg border border-border rounded-lg p-1 w-fit">
              <button
                onClick={() => setSourceMode("camera")}
                className={`btn-sm rounded-md px-3 ${sourceMode === "camera" ? "bg-accent text-bg" : "text-text-dim hover:text-text"}`}
              >
                Camera
              </button>
              <button
                onClick={() => setSourceMode("upload")}
                className={`btn-sm rounded-md px-3 ${sourceMode === "upload" ? "bg-accent text-bg" : "text-text-dim hover:text-text"}`}
              >
                Tải ảnh lên
              </button>
            </div>

            {sourceMode === "camera" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleToggleConnection}
                  disabled={connecting}
                  className={`btn btn-sm ${cameraRunning ? "btn-warn" : "btn-ghost"}`}
                >
                  {connecting ? "..." : cameraRunning ? "Disconnect Camera" : "Connect Camera"}
                </button>
                <button onClick={handleCapture} disabled={!cameraRunning || capturing} className="btn btn-primary btn-sm">
                  {capturing ? "Đang tách vật..." : "Capture & Segment"}
                </button>
                <button onClick={() => setRoiEditing(true)} disabled={!cameraRunning} className="btn btn-ghost btn-sm">
                  Select ROI
                </button>
                {roi && (
                  <button onClick={handleClearRoi} className="btn btn-ghost btn-sm">
                    Full Frame
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleUploadSegment}
                disabled={pendingFiles.length === 0 || uploading}
                className="btn btn-primary btn-sm"
              >
                {uploading ? "Đang tách vật..." : `Tách vật (${pendingFiles.length} ảnh)`}
              </button>
            )}
          </div>

          {sourceMode === "camera" ? (
            <div className="relative bg-black rounded-[10px] border border-border overflow-hidden flex items-center justify-center min-h-[200px]">
              {cameraRunning ? (
                <img
                  ref={imgRef}
                  key={streamKey}
                  src={cameraStreamUrl()}
                  alt="camera stream"
                  className="max-w-full max-h-[260px] object-contain"
                />
              ) : (
                <span className="text-text-faint text-sm">Camera offline</span>
              )}
              {cameraRunning && !roiEditing && <RoiOverlay imgRef={imgRef} roi={roi} />}
              <RoiSelector
                active={roiEditing}
                liveImgRef={imgRef}
                onConfirm={handleRoiConfirm}
                onCancel={() => setRoiEditing(false)}
              />
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) addPendingFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-[10px] border-2 border-dashed overflow-y-auto min-h-[200px] max-h-[260px] p-3 cursor-pointer transition-colors ${
                dragOver ? "border-accent bg-accent/5" : "border-border bg-bg"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addPendingFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {pendingFiles.length === 0 ? (
                <div className="h-full min-h-[176px] flex flex-col items-center justify-center text-center text-text-faint text-sm gap-1">
                  <span>Kéo thả ảnh vào đây hoặc bấm để chọn</span>
                  <span className="text-xs">Ảnh toàn cảnh (chưa crop), có thể chọn nhiều ảnh</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
                  {pendingFiles.map((f) => (
                    <div key={f.name} className="relative bg-panel border border-border rounded-md p-1">
                      <img src={pendingUrlsRef.current.get(f)} alt={f.name} className="w-full aspect-square object-cover rounded" />
                      <button
                        onClick={() => removePendingFile(f.name)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-text text-xs flex items-center justify-center hover:bg-bad"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center justify-center border border-dashed border-border rounded-md text-text-faint text-xs aspect-square hover:border-accent hover:text-accent"
                  >
                    + Thêm ảnh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-bad text-sm mt-3 bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">{error}</p>}

        {crops.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-text-dim mb-2">
              {crops.length} object{crops.length > 1 ? "s" : ""} detected — add as "<span className="text-accent">{label || "?"}</span>" or skip:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {crops.map((crop) => (
                <div key={crop.index} className="bg-bg border border-border rounded-lg p-2">
                  <img src={crop.image_base64} alt={`crop ${crop.index}`} className="w-full aspect-square object-cover rounded-md mb-2" />
                  <div className="flex gap-1">
                    <button onClick={() => handleAddCrop(crop)} className="btn btn-primary btn-sm flex-1 !px-1">
                      Add
                    </button>
                    <button onClick={() => handleSkipCrop(crop)} className="btn btn-ghost btn-sm flex-1 !px-1">
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold tracking-widest text-text-faint mb-3">REGISTERED SKU</h2>
        {skus.length === 0 ? (
          <p className="text-text-faint text-sm">Chưa có SKU nào. Thêm mẫu ở trên để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skus.map((s) => (
              <div key={s.sku} className="bg-bg border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {s.thumbnail_url ? (
                    <img src={s.thumbnail_url} alt={s.sku} className="w-14 h-14 object-cover rounded-md border border-border" />
                  ) : (
                    <div className="w-14 h-14 rounded-md border border-border bg-panel" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-text truncate">{s.sku}</div>
                    <div className="text-xs text-text-faint">{s.sample_count} samples</div>
                  </div>
                </div>
                <div className="flex border-t border-border">
                  <button onClick={() => toggleExpand(s.sku)} className="flex-1 text-xs py-2 text-text-dim hover:bg-white/5">
                    {expanded === s.sku ? "Ẩn mẫu" : "Xem mẫu"}
                  </button>
                  <button onClick={() => handleDeleteSku(s.sku)} className="flex-1 text-xs py-2 text-bad hover:bg-bad/10 border-l border-border">
                    Xóa SKU
                  </button>
                </div>
                {expanded === s.sku && (
                  <div className="grid grid-cols-4 gap-2 p-3 border-t border-border">
                    {samples.map((sample) => (
                      <div key={sample.filename} className="relative group">
                        <img src={sample.url} alt={sample.filename} className="w-full aspect-square object-cover rounded-md border border-border" />
                        <button
                          onClick={() => handleDeleteSample(s.sku, sample.filename)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 text-bad text-xs flex items-center justify-center transition-opacity rounded-md"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
