import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import type { SkuInfo } from "../types";

interface SkuPickerProps {
  value: string;
  onChange: (value: string) => void;
  skus: SkuInfo[];
}

export function SkuPicker({ value, onChange, skus }: SkuPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = query ? skus.filter((s) => s.sku.toLowerCase().includes(query)) : skus;
  const exactMatch = skus.some((s) => s.sku.toLowerCase() === query);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
        placeholder={t("sku_picker.placeholder")}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />
      {open && (
        <div
          onMouseDown={(e) => {
            // Bat ky click nao trong dropdown ma khong roi vao 1 hang SKU
            // (VD: dong chu goi y "khong khop" / "tao moi") deu chi de dong
            // dropdown lai, khong lam gi khac - tranh dropdown bi ket mo
            // mai vi click roi vao vung chu khong co handler rieng.
            if (!(e.target as HTMLElement).closest("button")) setOpen(false);
          }}
          className="absolute z-20 mt-1 w-full glass-panel border border-border rounded-lg max-h-64 overflow-y-auto py-1"
        >
          {filtered.length === 0 && skus.length > 0 && (
            <div className="px-3 py-2 text-xs text-text-faint">{t("sku_picker.no_match")}</div>
          )}
          {skus.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-faint">{t("sku_picker.empty")}</div>
          )}
          {filtered.map((s) => (
            <button
              key={s.sku}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.sku);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
            >
              {s.thumbnail_url ? (
                <img src={s.thumbnail_url} alt={s.sku} className="w-8 h-8 rounded-md object-cover border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-md border border-border bg-panel" />
              )}
              <span className="font-mono text-sm text-text flex-1 truncate">{s.sku}</span>
              <span className="text-xs text-text-faint shrink-0">{t("common.sample_count", { count: s.sample_count })}</span>
            </button>
          ))}
          {query && !exactMatch && (
            <div className="px-3 py-2 text-xs text-accent border-t border-border mt-1">
              {t("sku_picker.create_new", { value: value.trim() })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
