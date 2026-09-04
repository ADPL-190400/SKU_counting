import { useI18n } from "../i18n/LanguageContext";
import { getResultBanner } from "../lib/resultBanner";
import type { OverallResult, VerificationRow } from "../types";

interface Props {
  orderCode: string | null;
  result: OverallResult | null;
  verificationRows: VerificationRow[];
  unknownCount: number;
}

/**
 * The kiem tra rieng, dat dau cot sidebar (xem Inspection.tsx) - luon cung
 * 1 khung kich thuoc du dang idle hay co ket qua (chi doi mau/noi dung),
 * de khong bi cam giac "hop rong" luc chua chay inspection.
 */
export function ResultCard({ orderCode, result, verificationRows, unknownCount }: Props) {
  const { t } = useI18n();

  if (!result) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center text-center gap-2">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center text-2xl text-text-faint">
          ⭘
        </div>
        <div className="text-lg font-black tracking-wide text-text-faint">{t("result.ready")}</div>
        <p className="text-xs text-text-faint/80 max-w-[16rem]">
          {t("result.ready_hint", { btn: t("camera.run_inspection") })}
        </p>
      </div>
    );
  }

  const banner = getResultBanner(result, verificationRows, unknownCount, t);

  return (
    <div className={`glass-panel border-2 ${banner.borderClass} ${banner.glowClass} p-6 flex flex-col items-center text-center gap-2`}>
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black pulse-dot ${banner.bgClass} ${banner.toneClass}`}
      >
        {banner.icon}
      </div>
      <div className={`text-2xl font-black tracking-wide ${banner.toneClass}`}>{banner.title}</div>
      <p className="text-sm text-text-dim max-w-[16rem]">{banner.sub}</p>
      {orderCode && (
        <div className="pt-3 mt-1 border-t border-border w-full">
          <span className="font-mono text-xs text-text-faint">{orderCode}</span>
        </div>
      )}
    </div>
  );
}
