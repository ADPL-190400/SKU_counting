import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";

export function Clock() {
  const { locale } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-sm text-text-dim tabular-nums tracking-wide">
      {now.toLocaleTimeString(locale)}
    </div>
  );
}
