import { useEffect, useState } from "react";
import { ApiRequestError, getCameraStatus, getHistory, getOrder, getRoi, runInspection, startCamera, stopCamera } from "../api/client";
import { CameraView } from "../components/CameraView";
import { DetectionOverlay } from "../components/DetectionOverlay";
import { KpiStrip } from "../components/KpiStrip";
import { ProductTable } from "../components/ProductTable";
import { ResultCard } from "../components/ResultCard";
import { ResultStatus } from "../components/ResultStatus";
import { ScanInput } from "../components/ScanInput";
import type { HistoryRecord, InspectionResult, Order, Roi } from "../types";

export function Inspection() {
  const [order, setOrder] = useState<Order | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [cameraRunning, setCameraRunning] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [roi, setRoi] = useState<Roi | null>(null);

  const [history, setHistory] = useState<HistoryRecord[]>([]);

  function refreshHistory() {
    getHistory()
      .then(setHistory)
      .catch(() => {
        /* history is a non-critical enhancement - ignore failures */
      });
  }

  useEffect(() => {
    refreshHistory();
    getCameraStatus()
      .then((s) => setCameraRunning(s.running))
      .catch(() => setCameraRunning(false));
    getRoi()
      .then((r) => setRoi(r.roi))
      .catch(() => setRoi(null));
  }, []);

  async function handleScan(code: string) {
    if (!cameraRunning) {
      setScanError("Kết nối camera trước khi quét.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setResult(null);
    try {
      const o = await getOrder(code);
      setOrder(o);
      // Ma khop don hang -> chay kiem tra ngay, khong can bam them nut
      // Run Inspection (ap dung cho ca quet may lan nhap tay, giong
      // handleScan() dung chung trong PROCESS_INSPECTION).
      await runInspectionForOrder(o);
    } catch (e) {
      setOrder(null);
      setScanError(e instanceof ApiRequestError ? e.message : "Failed to load order.");
    } finally {
      setScanning(false);
    }
  }

  async function runInspectionForOrder(o: Order) {
    setInspecting(true);
    setInspectionError(null);
    try {
      const r = await runInspection(o.code);
      setResult(r);
      refreshHistory();
    } catch (e) {
      setInspectionError(e instanceof ApiRequestError ? e.message : "Inspection failed.");
    } finally {
      setInspecting(false);
    }
  }

  async function handleStartCamera() {
    setInspectionError(null);
    try {
      await startCamera();
      setCameraRunning(true);
    } catch (e) {
      setInspectionError(e instanceof ApiRequestError ? e.message : "Camera offline.");
    }
  }

  async function handleStopCamera() {
    await stopCamera();
    setCameraRunning(false);
  }

  async function handleReset() {
    setResult(null);
    setInspectionError(null);
    const status = await getCameraStatus().catch(() => ({ running: false }));
    setCameraRunning(status.running);
  }

  async function handleRunInspection() {
    if (!order) return;
    await runInspectionForOrder(order);
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <ScanInput onScan={handleScan} loading={scanning} cameraRunning={cameraRunning} aside={<KpiStrip records={history} />} />
        {scanError && <p className="text-bad text-sm mt-2">{scanError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
        <CameraView
          running={cameraRunning}
          onStart={handleStartCamera}
          onStop={handleStopCamera}
          onRunInspection={handleRunInspection}
          onReset={handleReset}
          inspecting={inspecting}
          hasOrder={!!order}
          roi={roi}
          orderCode={order?.code ?? null}
        />
        <div className="flex flex-col gap-4">
          <ResultCard
            orderCode={order?.code ?? null}
            result={result?.result ?? null}
            verificationRows={result?.verification ?? []}
            unknownCount={result?.unknown ?? 0}
          />
          <ProductTable order={order} verification={result?.verification ?? null} />
          {result && <ResultStatus rows={result.verification} unknownCount={result.unknown} />}
        </div>
      </div>

      {inspectionError && (
        <div className="glass-panel border-bad/40 p-3 text-sm text-bad">{inspectionError}</div>
      )}

      {result && (
        <>
          <DetectionOverlay imageUrl={result.image_url} objects={result.objects} />
          <div className="text-xs text-text-faint text-right font-mono">
            Total: {result.processing_time_ms.total.toFixed(0)}ms · SAM2: {result.processing_time_ms.sam2.toFixed(0)}ms
            · DINOv3: {result.processing_time_ms.dinov3.toFixed(0)}ms · Matching: {result.processing_time_ms.matching.toFixed(0)}ms
          </div>
        </>
      )}
    </div>
  );
}
