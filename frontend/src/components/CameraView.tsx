import { useRef, useState } from "react";
import { cameraStreamUrl } from "../api/client";
import { RoiOverlay } from "./RoiOverlay";
import type { Roi } from "../types";

interface Props {
  running: boolean;
  onStart: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onRunInspection: () => void;
  onReset: () => void;
  inspecting: boolean;
  hasOrder: boolean;
  roi: Roi | null;
  orderCode: string | null;
}

export function CameraView({
  running,
  onStart,
  onStop,
  onRunInspection,
  onReset,
  inspecting,
  hasOrder,
  roi,
  orderCode,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Ket noi/ngat camera la 1 hanh dong setup rieng, tach khoi RUN INSPECTION -
  // giong cach PROCESS_INSPECTION tach nut "Ket noi/Ngat" camera (dung chung,
  // song qua nhieu phien) ra khoi "Bat dau/Ket thuc" phien lam viec.
  async function handleToggleConnection() {
    setConnecting(true);
    try {
      if (running) {
        await onStop();
        setCaptured(null);
      } else {
        await onStart();
        setCaptured(null);
        setStreamKey((k) => k + 1);
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleCapture() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL("image/jpeg"));
  }

  function handleReset() {
    setCaptured(null);
    onReset();
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* Thanh mong - chi thong tin phu (ma don + trang thai ket noi camera).
          Ket qua kiem tra nam rieng o ResultCard.tsx (dau cot sidebar). */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-black/20">
        <span className="font-mono text-sm text-accent tracking-wide truncate">
          {orderCode ?? <span className="text-text-faint">NO ORDER SCANNED</span>}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
            running ? "bg-good/10 border-good/40 text-good" : "bg-white/5 border-border text-text-faint"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${running ? "pulse-dot" : ""}`} />
          {running ? "CONNECTED" : "DISCONNECTED"}
        </span>
      </div>

      <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
        {captured ? (
          <img src={captured} alt="captured frame" className="max-w-full max-h-full object-contain" />
        ) : running ? (
          <img
            ref={imgRef}
            key={streamKey}
            src={cameraStreamUrl()}
            alt="camera stream"
            className="max-w-full max-h-full object-contain"
            crossOrigin="anonymous"
          />
        ) : (
          <span className="text-text-faint text-sm">Camera offline</span>
        )}
        {captured && (
          <span className="absolute top-2 left-2 text-xs font-semibold bg-warn/90 text-slate-950 px-2 py-0.5 rounded">
            CAPTURED
          </span>
        )}
        {running && !captured && <RoiOverlay imgRef={imgRef} roi={roi} />}

        <span className="viewport-bracket viewport-bracket-tl" />
        <span className="viewport-bracket viewport-bracket-tr" />
        <span className="viewport-bracket viewport-bracket-bl" />
        <span className="viewport-bracket viewport-bracket-br" />
      </div>

      <div className="flex flex-wrap items-center gap-2 p-4">
        <button
          onClick={handleToggleConnection}
          disabled={connecting}
          className={`btn btn-sm ${running ? "btn-warn" : "btn-ghost"}`}
        >
          {connecting ? "..." : running ? "Disconnect Camera" : "Connect Camera"}
        </button>
        <button onClick={handleCapture} disabled={!running || !!captured} className="btn btn-ghost btn-sm">
          Capture
        </button>
        <button
          onClick={onRunInspection}
          disabled={!running || !hasOrder || inspecting}
          title={!running ? "Connect the camera first" : !hasOrder ? "Scan an order code first" : undefined}
          className="btn btn-primary btn-sm"
        >
          {inspecting ? "Running..." : "RUN INSPECTION"}
        </button>
        <button onClick={handleReset} className="btn btn-ghost btn-sm ml-auto">
          Reset
        </button>
      </div>
    </div>
  );
}
