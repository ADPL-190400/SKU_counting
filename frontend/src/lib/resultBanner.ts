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

const STATIC_TEXT: Record<Exclude<OverallResult, "INCOMPLETE">, BannerContent> = {
  COMPLETE: {
    icon: "✓",
    title: "ĐẠT",
    sub: "Đủ số lượng yêu cầu",
    toneClass: "text-good",
    bgClass: "bg-good/15",
    borderClass: "border-good/50",
    glowClass: "shadow-[0_0_40px_-10px_var(--color-good)]",
  },
  ERROR: {
    icon: "⚠",
    title: "LỖI",
    sub: "Không hoàn tất được lần kiểm tra",
    toneClass: "text-bad",
    bgClass: "bg-bad/15",
    borderClass: "border-bad/50",
    glowClass: "shadow-[0_0_40px_-10px_var(--color-bad)]",
  },
};

function incompleteSubtitle(rows: VerificationRow[], unknownCount: number): string {
  const hasMissing = rows.some((r) => r.status === "MISSING");
  const hasExcess = rows.some((r) => r.status === "EXCESS");
  const reasons: string[] = [];
  if (hasMissing) reasons.push("thiếu");
  if (hasExcess) reasons.push("dư");
  if (unknownCount > 0) reasons.push("có vật lạ");
  if (reasons.length === 0) return "Không đạt yêu cầu";
  return `Sản phẩm ${reasons.join(", ")} so với yêu cầu`;
}

/** INCOMPLETE co the do thieu/du hang HOAC co vat la (unknown) - doc "rows"
 * + "unknownCount" de ghi ro ly do. */
export function getResultBanner(result: OverallResult, rows: VerificationRow[], unknownCount: number): BannerContent {
  if (result === "INCOMPLETE") {
    return {
      icon: "✗",
      title: "CHƯA ĐẠT",
      sub: incompleteSubtitle(rows, unknownCount),
      toneClass: "text-bad",
      bgClass: "bg-bad/15",
      borderClass: "border-bad/50",
      glowClass: "shadow-[0_0_40px_-10px_var(--color-bad)]",
    };
  }
  return STATIC_TEXT[result];
}
