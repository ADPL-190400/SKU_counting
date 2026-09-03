import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  onScan: (code: string) => void;
  loading: boolean;
  /** Camera phai ket noi truoc thi moi cho quet - inspection can frame
      song de doi chieu, quet khi chua co camera se luon that bai. */
  cameraRunning: boolean;
  /** Cum thong so phu (KpiStrip) dat cuoi hang - xem Inspection.tsx: Scan
      la hanh dong chinh nen chiem phan lon, KPI chi la thong tin phu. */
  aside?: ReactNode;
}

// May quet ma vach hoat dong nhu 1 ban phim: go 1 chuoi ky tu RAT NHANH
// (thuong <10ms/ky tu) roi ket bang Enter, khac han nguoi go tay (>=vai
// chuc ms/ky tu). Dua vao khoang cach giua 2 lan go de phan biet - giong
// PROCESS_INSPECTION (static/app.js).
const SCAN_MAX_GAP_MS = 40;
const SCAN_MIN_LENGTH = 4;

export function ScanInput({ onScan, loading, cameraRunning, aside }: Props) {
  const [value, setValue] = useState("");
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const cameraRunningRef = useRef(cameraRunning);
  cameraRunningRef.current = cameraRunning;

  useEffect(() => {
    let buffer = "";
    let lastTime = 0;

    function onKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      if (e.key === "Enter") {
        const candidate = buffer;
        buffer = "";
        if (candidate.length >= SCAN_MIN_LENGTH && cameraRunningRef.current) {
          e.preventDefault();
          setValue(candidate);
          if (!loadingRef.current) onScan(candidate);
        }
        return;
      }
      if (e.key.length !== 1) return; // bo qua Shift/Tab/Backspace/phim dieu khien khac
      if (buffer.length > 0 && now - lastTime > SCAN_MAX_GAP_MS) {
        // Khoang cach qua lon so voi ky tu truoc -> go tay binh thuong,
        // KHONG phai may quet - bo buffer cu, theo doi lai tu ky tu nay.
        buffer = "";
      }
      buffer += e.key;
      lastTime = now;
    }

    // Bat su kien TOAN TRANG (khong phu thuoc o nhap co dang focus hay
    // khong) - nguoi van hanh khong phai luon click dung vao o truoc khi
    // quet.
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onScan]);

  function submit() {
    if (!cameraRunning) return;
    const code = value.trim();
    if (code) onScan(code);
  }

  return (
    <div className="glass-panel flex items-center gap-3 p-4">
      <label className="text-sm font-medium text-text-dim whitespace-nowrap">Scan Order / Product Code</label>
      <input
        className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-lg font-mono text-text outline-none focus:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        placeholder={cameraRunning ? "ORDER_000123" : "Kết nối camera trước khi quét..."}
        value={value}
        disabled={!cameraRunning}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button onClick={submit} disabled={loading || !cameraRunning} className="btn btn-primary tracking-wide">
        SCAN
      </button>
      {aside && <div className="pl-4 ml-1 border-l border-border">{aside}</div>}
    </div>
  );
}
