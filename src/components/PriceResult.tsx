import type { PredictResponse } from "../types/prediction";

type Props = {
  result: PredictResponse;
};

export function PriceResult({ result }: Props) {
  const { min, max } = result.priceRangeBillion;
  const est = result.estimatedPriceBillion;
  const span = max - min || 1;
  const marker = Math.min(100, Math.max(0, ((est - min) / span) * 100));

  return (
    <div className="emerald-card emerald-card--force-dark rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-tinix-muted">Giá ước tính</p>
          <p className="mt-1 text-4xl sm:text-5xl font-extrabold text-primary tabular-nums">
            {formatBillion(est)}
            <span className="text-lg sm:text-xl font-semibold text-white ml-1">
              tỷ
            </span>
          </p>
          {result.unitNote && (
            <p className="mt-1 text-xs text-tinix-muted">{result.unitNote}</p>
          )}
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <span className="material-symbols-outlined text-3xl">payments</span>
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-tinix-muted">
          <span>Thấp {formatBillion(min)}</span>
          <span>Cao {formatBillion(max)}</span>
        </div>
        <div className="price-gradient-track">
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg bg-tinix-page"
            style={{ left: `${marker}%` }}
          />
        </div>
      </div>

      {result.summary && (
        <p className="text-sm text-tinix-muted leading-relaxed border-t border-slate-700/80 pt-4">
          {result.summary}
        </p>
      )}
    </div>
  );
}

function formatBillion(n: number) {
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}
