import { ValuationForm } from "./ValuationForm";
import { PriceResult } from "./PriceResult";
import type { PredictResponse } from "../types/prediction";

type Props = {
  onResult: (r: PredictResponse) => void;
  lastResult: PredictResponse | null;
};

export function HeroSection({ onResult, lastResult }: Props) {
  return (
    <section className="hero-emerald relative min-h-[calc(100vh-76px)] flex flex-col">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex-1 flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-20">
        <div className="flex-1 space-y-6 lg:max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <span className="text-xs font-bold text-primary">#1</span>
            Nền tảng định giá AI
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.15] tracking-tight">
            <span className="text-white block">
              Định giá bất động sản
            </span>
            <span className="text-primary block mt-1">
              chính xác trong 30 giây
            </span>
          </h1>
          <p className="flex gap-2 text-base sm:text-lg text-white leading-relaxed">
            <span className="material-symbols-outlined text-primary shrink-0 mt-0.5 text-xl">
              auto_awesome
            </span>
            <span>
              AI phân tích giá dựa trên dữ liệu giao dịch, khu vực và xu hướng
              thị trường.
            </span>
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10">
            {[
              { n: "7.2k+", l: "Tài sản đã định giá" },
              { n: "6.7M+", l: "Điểm dữ liệu thị trường" },
              { n: "6,273", l: "Thửa đất đã đánh giá" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                  {s.n}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-white leading-snug">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[460px] shrink-0 space-y-6">
          <ValuationForm onResult={onResult} />
          {lastResult && <PriceResult result={lastResult} />}
        </div>
      </div>

      <div
        id="cach-hoat-dong"
        className="relative z-10 border-t border-white/5 bg-tinix-page/90 backdrop-blur-md py-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: "database",
              title: "Thu thập",
              desc: "Backend nhận payload địa chỉ, loại BĐS, diện tích…",
            },
            {
              icon: "model_training",
              title: "Model",
              desc: "API `/api/predict` trả về giá ước tính và biên độ.",
            },
            {
              icon: "dashboard",
              title: "Hiển thị",
              desc: "UI đồng bộ giao diện Tinix Valuation.",
            },
          ].map((c) => (
            <div key={c.title} className="space-y-2">
              <span className="material-symbols-outlined text-4xl text-primary">
                {c.icon}
              </span>
              <h3 className="font-bold text-white">{c.title}</h3>
              <p className="text-sm text-tinix-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
