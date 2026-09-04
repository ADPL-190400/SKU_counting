import { useI18n } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";

const LANGS: Lang[] = ["vi", "ja"];

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex gap-0.5 p-0.5 rounded-full bg-panel border border-border">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors ${
            lang === l ? "bg-accent text-bg" : "text-text-faint hover:text-text"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
