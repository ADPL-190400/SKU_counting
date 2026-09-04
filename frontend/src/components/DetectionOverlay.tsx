import { useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import type { DetectedObject } from "../types";

interface Props {
  imageUrl: string;
  objects: DetectedObject[];
}

export function DetectionOverlay({ imageUrl, objects }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<DetectedObject | null>(null);

  return (
    <div className="glass-panel p-4">
      <h2 className="text-xs font-semibold tracking-widest text-text-faint mb-3">{t("detection.heading")}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <div className="bg-black rounded-[10px] border border-border overflow-hidden flex items-center justify-center">
          <img src={imageUrl} alt="detection result" className="max-w-full max-h-[480px] object-contain" />
        </div>

        <div className="flex flex-col gap-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-faint border-b border-border">
                <th className="pb-2 font-medium">ID</th>
                <th className="pb-2 font-medium">SKU</th>
                <th className="pb-2 font-medium text-right">{t("detection.col_score")}</th>
                <th className="pb-2 font-medium text-right">{t("detection.col_status")}</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((o) => {
                const isUnknown = o.sku === "unknown";
                return (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className={`cursor-pointer border-b border-border/60 hover:bg-white/5 ${
                      selected?.id === o.id ? "bg-white/5" : ""
                    }`}
                  >
                    <td className="py-2 font-mono text-text-dim">#{o.id}</td>
                    <td className="py-2 font-mono text-text">{o.sku}</td>
                    <td className="py-2 text-right font-mono text-text-dim">{o.score.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          isUnknown ? "bg-bad/10 border-bad/40 text-bad" : "bg-good/10 border-good/40 text-good"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {isUnknown ? t("detection.unknown") : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {objects.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-text-faint">
                    {t("detection.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {selected && (
            <div className="bg-bg border border-border rounded-[10px] p-3 text-sm">
              <div className="text-text-dim mb-1">
                {t("detection.object_prefix")}<span className="font-mono text-text">#{selected.id}</span>
              </div>
              <div className="mb-2">
                {t("detection.prediction")}{" "}
                <span className={`font-bold ${selected.sku === "unknown" ? "text-bad" : "text-good"}`}>
                  {selected.sku.toUpperCase()}
                </span>
              </div>
              <div className="mb-2">
                {t("detection.similarity")}<span className="font-mono">{selected.score.toFixed(3)}</span>
              </div>
              <div className="text-text-dim mb-1">{t("detection.top_candidates")}</div>
              <ul className="font-mono">
                {selected.top_candidates.map(([label, score]) => (
                  <li key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span>{score.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
