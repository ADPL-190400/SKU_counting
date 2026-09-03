import { useEffect, useMemo, useState } from "react";
import { ApiRequestError, getHistory } from "../api/client";
import type { HistoryRecord, OverallResult } from "../types";

const RESULT_STYLES: Record<OverallResult, string> = {
  COMPLETE: "bg-good/10 border-good/40 text-good",
  INCOMPLETE: "bg-bad/10 border-bad/40 text-bad",
  ERROR: "bg-bad/10 border-bad/40 text-bad",
};

const FILTER_OPTIONS: { value: OverallResult | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETE", label: "Complete" },
  { value: "INCOMPLETE", label: "Incomplete" },
];

function formatTimestamp(ts: string): string {
  const m = ts.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!m) return ts;
  const [, y, mo, d, h, mi] = m;
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

export function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OverallResult | "ALL">("ALL");
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    getHistory()
      .then(setRecords)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load history."));
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== "ALL" && r.result !== statusFilter) return false;
      if (search.trim() && !r.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [records, search, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold tracking-widest text-text-faint mb-3">INSPECTION HISTORY</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn..."
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent w-64"
          />
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  statusFilter === opt.value
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-transparent border-border text-text-faint hover:text-text-dim"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-bad text-sm mb-3">{error}</p>}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-faint border-b border-border">
              <th className="pb-2 pr-4 font-medium">Code</th>
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Result</th>
              <th className="pb-2 pr-4 font-medium text-right">Products</th>
              <th className="pb-2 pr-4 font-medium text-right">Unknown</th>
              <th className="pb-2 pr-4 font-medium">Operator</th>
              <th className="pb-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const detected = Object.values(r.detected).reduce((a, b) => a + b, 0);
              const required = Object.values(r.required).reduce((a, b) => a + b, 0);
              return (
                <tr key={`${r.code}_${r.timestamp}`} className="border-b border-border/60">
                  <td className="py-2.5 pr-4 font-mono text-text">{r.code}</td>
                  <td className="py-2.5 pr-4 text-text-dim font-mono">{formatTimestamp(r.timestamp)}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${RESULT_STYLES[r.result]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {r.result.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-text-dim">{detected}/{required}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-text-dim">{r.unknown_count}</td>
                  <td className="py-2.5 pr-4 text-text-dim">{r.operator}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => setSelected(r)} className="text-accent hover:underline text-xs font-semibold">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-text-faint">
                  Không có bản ghi nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold tracking-widest text-text-faint">
              CHI TIẾT — <span className="text-accent font-mono">{selected.code}</span>
            </h2>
            <button onClick={() => setSelected(null)} className="text-text-faint hover:text-text text-lg leading-none">
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <div className="bg-black rounded-[10px] border border-border overflow-hidden flex items-center justify-center">
              <img src={selected.image} alt="result" className="max-w-full max-h-[420px] object-contain" />
            </div>

            <div className="space-y-3 text-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-faint border-b border-border">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium text-right">Required</th>
                    <th className="pb-2 font-medium text-right">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys({ ...selected.required, ...selected.detected }).map((sku) => (
                    <tr key={sku} className="border-b border-border/60">
                      <td className="py-1.5 text-text">{sku}</td>
                      <td className="py-1.5 text-right font-mono text-text-dim">{selected.required[sku] ?? 0}</td>
                      <td className="py-1.5 text-right font-mono text-text-dim">{selected.detected[sku] ?? 0}</td>
                    </tr>
                  ))}
                  {selected.unknown_count > 0 && (
                    <tr>
                      <td className="py-1.5 text-warn">Unknown</td>
                      <td className="py-1.5 text-right font-mono text-text-dim">—</td>
                      <td className="py-1.5 text-right font-mono text-warn">{selected.unknown_count}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="text-xs text-text-faint space-y-1 pt-2 border-t border-border">
                <div>Threshold: <span className="font-mono text-text-dim">{selected.threshold}</span></div>
                <div>Processing time: <span className="font-mono text-text-dim">{selected.processing_time_ms.toFixed(0)}ms</span></div>
                <div>Operator: <span className="font-mono text-text-dim">{selected.operator}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
