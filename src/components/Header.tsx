type Props = {
  dark: boolean;
  setDark: (value: boolean) => void;
};

export function Header({ dark, setDark }: Props) {
  const systemPrefersDark = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-tinix-page/95 backdrop-blur-md">
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
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              Valuation
            </span>
          </div>
        </a>
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-tinix-muted">
          <a className="transition hover:text-white" href="#">
            Trang chủ
          </a>
          <a className="transition hover:text-white" href="#dinh-gia">
            So sánh giá
          </a>
          <a className="transition hover:text-white" href="#">
            Dự án
          </a>
          <a className="transition hover:text-white" href="#">
            Tin tức
          </a>
          <a className="transition hover:text-white" href="#">
            Liên hệ
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center rounded-full border border-slate-700/80 bg-slate-800/60 p-1">
            <button
              type="button"
              onClick={() => setDark(false)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                !dark
                  ? "bg-slate-600 text-white"
                  : "text-tinix-muted hover:text-white"
              }`}
              aria-label="Giao diện sáng"
            >
              <span className="material-symbols-outlined text-[20px]">
                light_mode
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDark(true)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dark
                  ? "bg-slate-600 text-white"
                  : "text-tinix-muted hover:text-white"
              }`}
              aria-label="Giao diện tối"
            >
              <span className="material-symbols-outlined text-[20px]">
                dark_mode
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDark(systemPrefersDark())}
              className="flex h-8 w-8 items-center justify-center rounded-full text-tinix-muted hover:text-white transition"
              aria-label="Theo hệ thống"
            >
              <span className="material-symbols-outlined text-[20px]">
                computer
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="sm:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-white"
            aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
          >
            <span className="material-symbols-outlined text-[22px]">
              {dark ? "light_mode" : "dark_mode"}
            </span>
          </button>
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
