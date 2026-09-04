import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n/LanguageContext";

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
  const { t } = useI18n();
  const [value, setValue] = useState("");
  // Giong PROCESS_INSPECTION (static/app.js: $productIdInput.readOnly):
  // sau khi 1 ma da "chot" (quet xong hoac nhap tay xong), o chuyen sang
  // readOnly - chan HOAN TOAN moi go chu tu ban phim vao o o muc DOM,
  // khong con phu thuoc timing select()/preventDefault nua. Listener quet
  // ma van hoat dong binh thuong du o co readOnly hay khong (bat o muc
  // document, khong phu thuoc input). Chi khi focus lai (bam vao o) o moi
  // mo khoa de nguoi dung go tay de.
  const [settled, setSettled] = useState(false);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const cameraRunningRef = useRef(cameraRunning);
  cameraRunningRef.current = cameraRunning;
  // handleScan ben Inspection.tsx la 1 ham thuong (khong useCallback) nen
  // doi reference MOI LAN Inspection re-render - neu effect ben duoi phu
  // thuoc thang vao `onScan`, moi lan re-render (vd trong luc 1 lan quet
  // truoc dang chay inspection ~1-2s, lien tuc setState) se lam effect bi
  // dang ky lai TU DAU, xoa mat `buffer` dang do dang giua chung 1 lan
  // quet khac. Dung ref de effect chi dang ky 1 lan duy nhat, luon goi
  // ban moi nhat cua callback.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let buffer = "";
    let lastTime = 0;

    function onKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      if (e.key === "Enter") {
        const candidate = buffer;
        buffer = "";
        if (candidate.length >= SCAN_MIN_LENGTH) {
          e.preventDefault();
          setValue(candidate);
          setSettled(true);
          if (cameraRunningRef.current && !loadingRef.current) onScanRef.current(candidate);
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
    // quet. Vi o se tu chuyen readOnly sau khi chot ket qua (xem `settled`
    // o tren), du o co dang focus san hay khong thi ky tu quet moi cung
    // KHONG the bi go chen vao noi dung cu qua co che nhap lieu mac dinh -
    // buffer nay la nguon du lieu duy nhat, hoan toan doc lap voi DOM.
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []); // dang ky 1 lan duy nhat - xem ghi chu o onScanRef ben tren

  function submit() {
    if (!cameraRunning) return;
    const code = value.trim();
    if (code) {
      setSettled(true);
      onScan(code);
    }
  }

  return (
    <div className="glass-panel flex items-center gap-3 p-4">
      <label className="text-sm font-medium text-text-dim whitespace-nowrap">{t("scan.label")}</label>
      <input
        className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-lg font-mono text-text outline-none focus:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        placeholder={cameraRunning ? "ORDER_000123" : t("scan.placeholder_camera_required")}
        value={value}
        disabled={!cameraRunning}
        readOnly={settled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        onFocus={(e) => e.currentTarget.select()}
        onMouseDown={(e) => {
          // Dung mousedown chu khong phai focus: neu o van dang giu focus
          // tu lan quet truoc (may quet khong dung chuot giua 2 lan), bam
          // lai vao o KHONG lam focus doi ("focus" khong ban chay lai) nen
          // se khong mo khoa duoc neu chi dua vao onFocus. mousedown thi
          // luon ban chay moi lan click.
          if (settled) {
            setSettled(false);
            const target = e.currentTarget;
            // Hoan select() sang tick sau: hanh dong mac dinh cua CHINH
            // mousedown nay (dat vi tri con tro theo toa do click) chay
            // SAU handler cua ta, se de lai con tro (khong con vung chon)
            // neu goi select() ngay tai day - doi 1 tick de select() chay
            // SAU, "thang" hanh dong mac dinh do.
            setTimeout(() => target.select(), 0);
          }
        }}
      />
      <button onClick={submit} disabled={loading || !cameraRunning} className="btn btn-primary tracking-wide">
        {t("scan.button")}
      </button>
      {aside && <div className="pl-4 ml-1 border-l border-border">{aside}</div>}
    </div>
  );
}
