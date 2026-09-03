import type { Order, SkuStatus, VerificationRow } from "../types";

interface Props {
  order: Order | null;
  verification?: VerificationRow[] | null;
}

interface Row {
  sku: string;
  name: string;
  required: number;
  detected: number | null;
  status: SkuStatus | null;
}

const STATUS_STYLES: Record<SkuStatus, string> = {
  OK: "bg-good/10 border-good/40 text-good",
  MISSING: "bg-bad/10 border-bad/40 text-bad",
  EXCESS: "bg-warn/10 border-warn/40 text-warn",
  UNKNOWN: "bg-warn/10 border-warn/40 text-warn",
};

const STATUS_ICON: Record<SkuStatus, string> = {
  OK: "✓",
  MISSING: "✗",
  EXCESS: "⚠",
  UNKNOWN: "⚠",
};

export function ProductTable({ order, verification }: Props) {
  const hasResult = !!verification;
  const requiredSkus = new Set(order?.products.map((p) => p.sku) ?? []);

  const rows: Row[] = hasResult
    ? verification!
        .filter((v) => requiredSkus.has(v.sku)) // chi hien sku co trong yeu cau - unknown/du thua da hien rieng o ResultStatus
        .map((v) => ({ sku: v.sku, name: v.name, required: v.required, detected: v.detected, status: v.status }))
    : (order?.products.map((p) => ({ sku: p.sku, name: p.name, required: p.required_quantity, detected: null, status: null })) ?? []);

  const totalRequired = rows.reduce((sum, r) => sum + r.required, 0);
  const totalDetected = hasResult ? rows.reduce((sum, r) => sum + (r.detected ?? 0), 0) : null;

  return (
    <div className="glass-panel p-4">
      <h2 className="text-xs font-semibold tracking-widest text-text-faint mb-3">
        REQUIRED PRODUCTS{hasResult && <span className="text-accent"> · VERIFICATION</span>}
      </h2>
      {!order ? (
        <div className="flex flex-col items-center text-center py-6 gap-2">
          <span className="text-3xl opacity-40">📋</span>
          <p className="text-text-faint text-sm">No order scanned yet</p>
          <p className="text-text-faint/70 text-xs">Scan an order code above to load its requirements.</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-accent font-mono mb-3">{order.code}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-faint border-b border-border">
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium text-right">Req.</th>
                {hasResult && <th className="pb-2 pr-2 font-medium text-right">Det.</th>}
                {hasResult && <th className="pb-2 font-medium text-right">Status</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sku} className="border-b border-border/60">
                  <td className="py-2 pr-2">
                    <div className="text-text leading-tight">{r.name}</div>
                    <div className="text-[11px] text-text-faint font-mono">{r.sku}</div>
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold text-text align-top">{r.required || "—"}</td>
                  {hasResult && (
                    <td className="py-2 pr-2 text-right font-mono text-text-dim align-top">{r.detected}</td>
                  )}
                  {hasResult && (
                    <td className="py-2 text-right align-top">
                      <span
                        title={r.status ?? undefined}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${STATUS_STYLES[r.status!]}`}
                      >
                        {STATUS_ICON[r.status!]}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-3 pt-3 border-t border-border text-sm">
            <span className="text-text-dim font-medium">Total</span>
            <span className="text-text font-bold">
              {hasResult ? `${totalDetected}/${totalRequired}` : totalRequired}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
