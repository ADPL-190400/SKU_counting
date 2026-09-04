import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LOCALE_OF, translations } from "./translations";
import type { Lang } from "./translations";

const STORAGE_KEY = "sku_inspection_lang";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "ja" ? "ja" : "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = translations[lang][key] ?? translations.vi[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, locale: LOCALE_OF[lang], t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}
