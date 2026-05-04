import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { SecureBootOverlay } from "./components/SecureBootOverlay";
import type { PredictResponse } from "./types/prediction";
import {
  effectiveDarkMode,
  readStoredThemePreference,
  systemPrefersDark,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme";

export default function App() {
  const [themePref, setThemePref] = useState<ThemePreference>(() =>
    readStoredThemePreference()
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const effectiveDark = effectiveDarkMode(themePref, systemDark);
  const [bootDone, setBootDone] = useState(false);
  const [preview, setPreview] = useState<PredictResponse | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themePref);
  }, [themePref]);

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [effectiveDark]);

  return (
    <div className="min-h-screen flex flex-col">
      {!bootDone && (
        <SecureBootOverlay onComplete={() => setBootDone(true)} />
      )}
      <Header
        themePref={themePref}
        setThemePref={setThemePref}
        effectiveDark={effectiveDark}
      />
      <main className="flex-1">
        <HeroSection
          onResult={setPreview}
          lastResult={preview}
          effectiveDark={effectiveDark}
        />
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-tinix-page py-6 text-center text-xs text-slate-500 dark:text-tinix-muted">
        <p className="text-slate-600 dark:text-tinix-muted">
          © 2026 | Powered by TiniX - CareOS
        </p>
        <p className="mt-2 text-slate-400 dark:text-slate-500">
          CẬP NHẬT: 16/01/2026 12:00 — Dữ liệu tham khảo, không phải thẩm định
          chính thức.
        </p>
      </footer>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark"
        aria-label="Trợ lý chat"
      >
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>
    </div>
  );
}
