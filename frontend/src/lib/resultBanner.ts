import type { OverallResult, VerificationRow } from "../types";

export interface BannerContent {
  icon: string;
  title: string;
  sub: string;
  toneClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function incompleteSubtitle(rows: VerificationRow[], unknownCount: number, t: Translate): string {
  const hasMissing = rows.some((r) => r.status === "MISSING");
  const hasExcess = rows.some((r) => r.status === "EXCESS");
  const reasons: string[] = [];
  if (hasMissing) reasons.push(t("result.reason_missing"));
  if (hasExcess) reasons.push(t("result.reason_excess"));
  if (unknownCount > 0) reasons.push(t("result.reason_unknown"));
  if (reasons.length === 0) return t("result.incomplete_fallback");
  return t("result.incomplete_template", { reasons: reasons.join(t("result.list_separator")) });
}

/** INCOMPLETE co the do thieu/du hang HOAC co vat la (unknown) - doc "rows"
 * + "unknownCount" de ghi ro ly do. Nhan `t` lam tham so vi day la ham
 * thuong (khong phai component), khong the tu goi useI18n(). */
export function getResultBanner(
  result: OverallResult,
  rows: VerificationRow[],
  unknownCount: number,
  t: Translate
): BannerContent {
  if (result === "INCOMPLETE") {
    return {
      icon: "✗",
      title: t("result.incomplete_title"),
      sub: incompleteSubtitle(rows, unknownCount, t),
      toneClass: "text-bad",
      bgClass: "bg-bad/15",
      borderClass: "border-bad/50",
      glowClass: "shadow-[0_0_40px_-10px_var(--color-bad)]",
    };
  }
  if (result === "ERROR") {
    return {
      icon: "⚠",
      title: t("result.error_title"),
      sub: t("result.error_sub"),
      toneClass: "text-bad",
      bgClass: "bg-bad/15",
      borderClass: "border-bad/50",
      glowClass: "shadow-[0_0_40px_-10px_var(--color-bad)]",
    };
  }
  return {
    icon: "✓",
    title: t("result.complete_title"),
    sub: t("result.complete_sub"),
    toneClass: "text-good",
    bgClass: "bg-good/15",
    borderClass: "border-good/50",
    glowClass: "shadow-[0_0_40px_-10px_var(--color-good)]",
  };
}
