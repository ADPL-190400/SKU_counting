import { useEffect, useState } from "react";
import { ApiRequestError, getSettings, updateSettings } from "../api/client";
import type { Settings } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FIELDS: { key: keyof Settings; label: string; step: number; min: number; max: number; hint: string }[] = [
  { key: "similarity_threshold", label: "Similarity Threshold", step: 0.01, min: 0, max: 1, hint: "Below this score, an object is classified as unknown." },
  { key: "min_area", label: "Minimum Mask Area (px)", step: 50, min: 0, max: 100000, hint: "Masks smaller than this are discarded as noise." },
  { key: "max_area_ratio", label: "Max Area Ratio", step: 0.05, min: 0.05, max: 1, hint: "Masks larger than this fraction of the ROI are treated as background." },
  { key: "mask_containment_thresh", label: "Mask Containment Threshold", step: 0.05, min: 0, max: 1, hint: "How much a smaller mask must overlap a larger one to be merged into it." },
  { key: "bbox_padding_ratio", label: "BBox Padding Ratio", step: 0.05, min: 0, max: 1, hint: "Extra context kept around each object crop before feature extraction." },
];

export function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    getSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load settings."));
  }, [open]);

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
      setError(e instanceof ApiRequestError ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50" onClick={onClose}>
      <div className="glass-panel w-full max-w-sm m-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-text">VISION SETTINGS</h2>
          <button onClick={onClose} className="text-text-faint hover:text-text text-lg leading-none">
            ×
          </button>
        </div>

        {!settings && !error && <p className="text-text-faint text-sm">Loading...</p>}
        {error && <p className="text-bad text-sm mb-3">{error}</p>}

        {settings && (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-dim">{f.label}</label>
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
                <p className="text-[11px] text-text-faint mt-1">{f.hint}</p>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? "Saving..." : "Save"}
              </button>
              {saved && <span className="text-xs text-good">Saved — applies to the next inspection.</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
