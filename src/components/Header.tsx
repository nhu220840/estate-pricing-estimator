import type { ThemePreference } from "../theme";

type Props = {
  themePref: ThemePreference;
  setThemePref: (value: ThemePreference) => void;
  effectiveDark: boolean;
};

export function Header({
  themePref,
  setThemePref,
  effectiveDark,
}: Props) {
  const shell = effectiveDark
    ? "border-slate-800/80 bg-tinix-page/95"
    : "border-slate-200/90 bg-white/95";
  const navMuted = effectiveDark
    ? "text-tinix-muted hover:text-white"
    : "text-slate-600 hover:text-slate-900";
  const logoSub = effectiveDark ? "text-white" : "text-slate-700";
  const toggleWrap = effectiveDark
    ? "border-slate-700/80 bg-slate-800/60"
    : "border-slate-200 bg-slate-100";
  const btnIdle = effectiveDark
    ? "text-tinix-muted hover:text-white"
    : "text-slate-500 hover:text-slate-900";
  const btnOn = effectiveDark
    ? "bg-slate-600 text-white"
    : "bg-white text-slate-900 shadow-sm";

  const pill = (mode: ThemePreference) =>
    themePref === mode ? btnOn : btnIdle;

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md ${shell}`}
    >
      <div className="max-w-7xl mx-auto flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/logo-house.svg"
            alt=""
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-primary">
              tinix
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] ${logoSub}`}
            >
              Valuation
            </span>
          </div>
        </a>
        <nav className={`hidden lg:flex items-center gap-8 text-sm font-medium ${navMuted}`}>
          <a className="transition" href="#">
            Trang chủ
          </a>
          <a className="transition" href="#dinh-gia">
            So sánh giá
          </a>
          <a className="transition" href="#">
            Dự án
          </a>
          <a className="transition" href="#">
            Tin tức
          </a>
          <a className="transition" href="#">
            Liên hệ
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex items-center rounded-full border p-0.5 sm:p-1 ${toggleWrap}`}
          >
            <button
              type="button"
              onClick={() => setThemePref("light")}
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition ${pill(
                "light"
              )}`}
              aria-label="Giao diện sáng"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                light_mode
              </span>
            </button>
            <button
              type="button"
              onClick={() => setThemePref("dark")}
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition ${pill(
                "dark"
              )}`}
              aria-label="Giao diện tối"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                dark_mode
              </span>
            </button>
            <button
              type="button"
              onClick={() => setThemePref("system")}
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition ${pill(
                "system"
              )}`}
              aria-label="Theo giao diện hệ thống"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                computer
              </span>
            </button>
          </div>
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Tài khoản
          </button>
        </div>
      </div>
    </header>
  );
}
