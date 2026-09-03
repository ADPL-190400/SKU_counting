import type { VerificationRow } from "../types";

/**
 * Chi tiet Missing/Excess/Unknown - banner ket qua chinh (Dat/Chua dat/Can
 * kiem tra) nam rieng o ResultBanner.tsx. Ca 2 dat chung 1 cot hep canh
 * REQUIRED PRODUCTS (xem Inspection.tsx) nen xep doc, khong chia cot ngang.
 */
export function ResultStatus({ rows, unknownCount }: { rows: VerificationRow[]; unknownCount: number }) {
  const missing = rows.filter((r) => r.status === "MISSING");
  const excess = rows.filter((r) => r.status === "EXCESS");

  if (missing.length === 0 && excess.length === 0 && unknownCount === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {missing.length > 0 && (
        <div className="glass-panel border-bad/40 p-3 text-sm">
          <div className="font-bold text-bad mb-2">MISSING PRODUCTS</div>
          {missing.map((r) => (
            <div key={r.sku} className="text-text-dim">
              {r.name} — Required: {r.required}, Detected: {r.detected}, Missing: {r.required - r.detected}
            </div>
          ))}
        </div>
      )}
      {excess.length > 0 && (
        <div className="glass-panel border-warn/40 p-3 text-sm">
          <div className="font-bold text-warn mb-2">EXCESS PRODUCTS</div>
          {excess.map((r) => (
            <div key={r.sku} className="text-text-dim">
              {r.name} — Required: {r.required}, Detected: {r.detected}, Excess: {r.detected - r.required}
            </div>
          ))}
        </div>
      )}
      {unknownCount > 0 && (
        <div className="glass-panel border-warn/40 p-3 text-sm">
          <div className="font-bold text-warn mb-2">UNKNOWN OBJECTS</div>
          <div className="text-text-dim">
            {unknownCount} object{unknownCount > 1 ? "s" : ""} could not be classified. Please check the captured image.
          </div>
        </div>
      )}
    </div>
  );
}
