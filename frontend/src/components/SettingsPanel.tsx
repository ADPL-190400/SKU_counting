import { useEffect, useState } from "react";
import {
  ApiRequestError,
  getDetectionBackend,
  getSettings,
  setDetectionBackend,
  updateSettings,
} from "../api/client";
import type { DetectionBackend } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import type { Settings } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FIELDS: { key: keyof Settings; labelKey: string; step: number; min: number; max: number; hintKey: string }[] = [
  { key: "similarity_threshold", labelKey: "settings.similarity_threshold_label", step: 0.01, min: 0, max: 1, hintKey: "settings.similarity_threshold_hint" },
  { key: "min_area", labelKey: "settings.min_area_label", step: 50, min: 0, max: 100000, hintKey: "settings.min_area_hint" },
  { key: "max_area_ratio", labelKey: "settings.max_area_ratio_label", step: 0.05, min: 0.05, max: 1, hintKey: "settings.max_area_ratio_hint" },
  { key: "mask_containment_thresh", labelKey: "settings.mask_containment_label", step: 0.05, min: 0, max: 1, hintKey: "settings.mask_containment_hint" },
  { key: "bbox_padding_ratio", labelKey: "settings.bbox_padding_label", step: 0.05, min: 0, max: 1, hintKey: "settings.bbox_padding_hint" },
  { key: "min_unknown_score", labelKey: "settings.min_unknown_score_label", step: 0.01, min: 0, max: 1, hintKey: "settings.min_unknown_score_hint" },
  { key: "yolo_conf_threshold", labelKey: "settings.yolo_conf_threshold_label", step: 0.01, min: 0, max: 1, hintKey: "settings.yolo_conf_threshold_hint" },
];

export function SettingsPanel({ open, onClose }: Props) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [detectionBackend, setDetectionBackendState] = useState<DetectionBackend | null>(null);
  const [yoloAvailable, setYoloAvailable] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<DetectionBackend | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setBackendError(null);
    getSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : t("settings.load_error")));
    getDetectionBackend()
      .then((res) => {
        setDetectionBackendState(res.detection_backend);
        setYoloAvailable(res.yolo_available);
      })
      .catch(() => {
        /* khong chan panel neu rieng phan nay loi - cac slider khac van dung duoc */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chi fetch khi
    // `open` doi, khong muon goi lai API chi vi doi ngon ngu.
  }, [open]);

  async function handleSwitchBackend(backend: DetectionBackend) {
    if (backend === detectionBackend || switchingTo) return;
    if (backend === "yolo" && !yoloAvailable) {
      setBackendError(t("settings.yolo_unavailable_hint"));
      return;
    }
    setSwitchingTo(backend);
    setBackendError(null);
    try {
      const res = await setDetectionBackend(backend);
      setDetectionBackendState(res.detection_backend);
    } catch (e) {
      setBackendError(e instanceof ApiRequestError ? e.message : t("settings.save_error"));
    } finally {
      setSwitchingTo(null);
    }
  }

  if (!open) return null;

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t("settings.save_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50" onClick={onClose}>
      <div className="glass-panel w-full max-w-sm m-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-text">{t("settings.heading")}</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text text-lg leading-none">
            ×
          </button>
        </div>

        {!settings && !error && <p className="text-text-faint text-sm">{t("settings.loading")}</p>}
        {error && <p className="text-bad text-sm mb-3">{error}</p>}

        {detectionBackend && (
          <div className="mb-4 pb-4 border-b border-border">
            <label className="block text-xs text-text-dim mb-1">{t("settings.detection_backend_label")}</label>
            <div className="flex gap-1 bg-bg border border-border rounded-lg p-1 w-fit">
              {(["sam2_dino", "yolo"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSwitchBackend(b)}
                  disabled={!!switchingTo}
                  className={`btn-sm rounded-md px-3 ${
                    detectionBackend === b ? "bg-accent text-bg" : "text-text-dim hover:text-text"
                  } ${b === "yolo" && !yoloAvailable ? "opacity-50" : ""}`}
                >
                  {switchingTo === b
                    ? "..."
                    : b === "sam2_dino"
                      ? t("settings.detection_backend_sam2_dino")
                      : t("settings.detection_backend_yolo")}
                </button>
              ))}
            </div>
            {backendError && <p className="text-bad text-xs mt-2">{backendError}</p>}
          </div>
        )}

        {settings && (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-dim">{t(f.labelKey)}</label>
                  <span className="text-xs font-mono text-accent">{settings[f.key]}</span>
                </div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={settings[f.key] as number}
                  onChange={(e) => setSettings({ ...settings, [f.key]: parseFloat(e.target.value) })}
                  className="w-full accent-[color:var(--color-accent)]"
                />
                <p className="text-[11px] text-text-faint mt-1">{t(f.hintKey)}</p>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
              {saved && <span className="text-xs text-good">{t("settings.saved")}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
