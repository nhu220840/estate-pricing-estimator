import { useEffect, useState } from "react";

type Props = {
  onComplete: () => void;
};

/** Splash giống trang gốc: tiến trình “kết nối an toàn”. */
export function SecureBootOverlay({ onComplete }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPct((p) => {
        const n = p + 8 + Math.random() * 14;
        return n >= 100 ? 100 : n;
      });
    }, 120);
    const done = window.setTimeout(() => {
      clearInterval(t);
      setPct(100);
      window.setTimeout(onComplete, 240);
    }, 1100);
    return () => {
      clearInterval(t);
      clearTimeout(done);
    };
  }, [onComplete]);

  const display = Math.min(100, Math.round(pct));

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-6 bg-tinix-page text-white px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
          lock
        </span>
        <h1 className="text-xl font-semibold tracking-wide">
          Kết nối an toàn
        </h1>
        <p className="text-sm text-white/60">Đang mã hóa đường truyền...</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs text-white/80">
          <span>TiniX Valuation</span>
          <span>{display}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary transition-all duration-300 ease-out"
            style={{ width: `${display}%` }}
          />
        </div>
      </div>
    </div>
  );
}
