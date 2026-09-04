import { useEffect, useState } from "react";
import type { User } from "./api/client";
import { logout, stopCamera, whoami } from "./api/client";
import { Clock } from "./components/Clock";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { SettingsPanel } from "./components/SettingsPanel";
import { useI18n } from "./i18n/LanguageContext";
import { History } from "./pages/History";
import { Inspection } from "./pages/Inspection";
import { Login } from "./pages/Login";
import { SkuManagement } from "./pages/SkuManagement";

type Page = "inspection" | "sku" | "history";

const NAV_ITEMS: { key: Page; labelKey: string }[] = [
  { key: "inspection", labelKey: "nav.inspection" },
  { key: "sku", labelKey: "nav.sku" },
  { key: "history", labelKey: "nav.history" },
];

// TAM THOI TAT: khop voi AUTH_ENABLED = False trong backend/main.py - API
// xac thuc cong ty (aiot-api.m2m-sol.co.jp) dang tra 502. Dat lai true khi
// ho bao server da hoat dong lai (va bat lai AUTH_ENABLED ben backend).
const AUTH_ENABLED = false;

function App() {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(AUTH_ENABLED);
  const [page, setPage] = useState<Page>("inspection");

  // Camera la tai nguyen dung chung, chi 1 tab/app duoc giu ket noi tai 1
  // thoi diem (RealSense chi cho 1 owner) - reload trang ma khong ngat ket
  // noi se de camera bi "khoa" o server. cameraReady bat dau la false khi
  // trang nay THUC SU la 1 lan reload, de chan render cac trang con (chung
  // se tu goi getCameraStatus() luc mount) cho toi khi lenh ngat ket noi
  // thuc su xong - tranh truong hop status con cu (van "running: true") vi
  // request ngat chua kip toi server luc trang con doc status.
  const isReload = performance.getEntriesByType("navigation").some(
    (nav) => (nav as PerformanceNavigationTiming).type === "reload"
  );
  const [cameraReady, setCameraReady] = useState(!isReload);

  useEffect(() => {
    if (isReload) {
      stopCamera()
        .catch(() => {})
        .finally(() => setCameraReady(true));
    }

    // Phong truong hop dong han tab (khong reload) - beforeunload khong the
    // "cho" ket qua nhu tren, nhung sendBeacon van dam bao request duoc gui
    // di ngay ca khi trang dang unload (khac voi fetch thuong hay bi huy).
    function onUnload() {
      navigator.sendBeacon("/api/camera/stop");
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [isReload]);

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    whoami()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));

    const onUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (checkingAuth || !cameraReady) {
    return <div className="min-h-screen bg-bg" />;
  }

  if (AUTH_ENABLED && !user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-52 shrink-0 border-r border-border bg-panel/60 p-4 hidden md:block">
        <div className="text-sm font-black tracking-widest text-text mb-6">{t("header.brand")}</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                page === item.key
                  ? "bg-accent/15 text-accent border border-accent/40"
                  : "text-text-dim border border-transparent hover:bg-white/5"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-border px-6 py-3 flex items-center justify-between">
          <h1 className="text-sm font-black tracking-widest text-text">{t("header.title")}</h1>
          <div className="flex items-center gap-4">
            {!AUTH_ENABLED && (
              <span className="text-[11px] text-warn border border-warn/40 bg-warn/10 rounded-full px-2.5 py-1">
                {t("header.auth_disabled")}
              </span>
            )}
            <span className="flex items-center gap-2 text-xs text-text-dim">
              <span className="w-2 h-2 rounded-full bg-good pulse-dot text-good" /> {t("header.backend_online")}
            </span>
            <LanguageSwitch />
            <Clock />
            <button
              onClick={() => setSettingsOpen(true)}
              title={t("header.vision_settings")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-dim hover:text-accent hover:border-accent/40 transition-colors"
            >
              ⚙
            </button>
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <span className="text-xs text-text-dim">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-text-faint hover:text-bad transition-colors"
                >
                  {t("header.logout")}
                </button>
              </div>
            )}
          </div>
        </header>
        {page === "inspection" && <Inspection />}
        {page === "sku" && <SkuManagement />}
        {page === "history" && <History />}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
