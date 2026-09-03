import type { HistoryRecord } from "../types";

function isToday(ts: string): boolean {
  const m = ts.match(/^(\d{4})(\d{2})(\d{2})_/);
  if (!m) return false;
  const [, y, mo, d] = m;
  const now = new Date();
  return Number(y) === now.getFullYear() && Number(mo) === now.getMonth() + 1 && Number(d) === now.getDate();
}

/**
 * Dai chi so gon (khong con 4 the to nhu truoc) - dat ben canh ScanInput
 * thanh 1 hang duy nhat (xem Inspection.tsx): Scan la hanh dong chinh nen
 * chiem phan lon, KPI chi la thong tin phu nen thu gon thanh 1 cum so.
 */
export function KpiStrip({ records }: { records: HistoryRecord[] }) {
  const today = records.filter((r) => isToday(r.timestamp));
  const complete = today.filter((r) => r.result === "COMPLETE").length;
  const incomplete = today.filter((r) => r.result === "INCOMPLETE").length;

  return (
    <div className="flex items-center gap-4 whitespace-nowrap">
      <div className="text-right leading-tight">
        <div className="text-lg font-black text-text">{today.length}</div>
        <div className="text-[10px] text-text-faint tracking-wide">HÔM NAY</div>
      </div>
      <div className="h-8 w-px bg-border" />
      <span className="flex items-center gap-1.5 text-sm font-bold text-good">
        <span className="w-1.5 h-1.5 rounded-full bg-current" /> {complete}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-bad">
        <span className="w-1.5 h-1.5 rounded-full bg-current" /> {incomplete}
      </span>
    </div>
  );
}
