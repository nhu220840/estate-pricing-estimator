import { FormEvent, useState } from "react";
import { predictPrice } from "../api/predictPrice";
import type { PredictRequest, PredictResponse, PropertyType } from "../types/prediction";

const propertyLabels: Record<PropertyType, string> = {
  apartment: "Căn hộ chung cư",
  townhouse: "Nhà",
  villa: "Biệt thự / nhà liền kề",
  shophouse: "Shophouse",
  land: "Đất",
};

const propertyOptionsOrder: PropertyType[] = [
  "apartment",
  "townhouse",
  "villa",
  "shophouse",
  "land",
];

type Props = {
  onResult: (r: PredictResponse) => void;
};

export function ValuationForm({ onResult }: Props) {
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [areaM2, setAreaM2] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [floors, setFloors] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mockAllowed = import.meta.env.VITE_ENABLE_MOCK === "true";
  const [useMock, setUseMock] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const area = parseFloat(areaM2.replace(",", "."));
    if (!address.trim()) {
      setError("Vui lòng nhập địa chỉ hoặc dự án.");
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setError("Diện tích không hợp lệ (m²).");
      return;
    }

    const body: PredictRequest = {
      address: address.trim(),
      propertyType,
      areaM2: area,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms, 10) : undefined,
      floors: floors ? parseInt(floors, 10) : undefined,
    };

    setLoading(true);
    try {
      if (useMock) {
        await new Promise((r) => setTimeout(r, 900));
        onResult(mockPredict(body));
      } else {
        const out = await predictPrice(body);
        onResult(out);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  const fieldWrap =
    "rounded-xl tinix-input pl-11 pr-3 py-3 text-sm w-full";
  const selectWrap =
    "rounded-xl tinix-input pl-11 pr-3 py-3 text-sm w-full";

  return (
    <form
      id="dinh-gia"
      onSubmit={onSubmit}
      className="emerald-card emerald-card--force-dark rounded-3xl p-6 sm:p-8 space-y-5"
    >
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Tra cứu định giá
        </h2>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white flex items-center gap-1">
          Tra cứu theo địa chỉ hoặc dự án{" "}
          <span className="text-red-400">*</span>
        </span>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl">
            search
          </span>
          <input
            className={fieldWrap}
            placeholder="VD: 72, Hà Đông, Hà Nội"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white">
            Loại hình <span className="text-red-400">*</span>
          </span>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl z-10">
              apartment
            </span>
            <select
              className={`${selectWrap} pl-11 appearance-none`}
              value={propertyType}
              onChange={(e) =>
                setPropertyType(e.target.value as PropertyType)
              }
            >
              {propertyOptionsOrder.map((k) => (
                <option key={k} value={k} className="bg-tinix-card text-white">
                  {propertyLabels[k]}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-lg">
              straighten
            </span>
            Diện tích (m²) <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            inputMode="decimal"
            className="rounded-xl tinix-input px-3 py-3 text-sm w-full"
            placeholder="VD: 150"
            value={areaM2}
            onChange={(e) => setAreaM2(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-tinix-muted">Phòng ngủ</span>
          <input
            type="number"
            min={0}
            className="rounded-xl tinix-input px-2 py-2.5 text-sm text-center w-full"
            placeholder="-"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-tinix-muted">WC</span>
          <input
            type="number"
            min={0}
            className="rounded-xl tinix-input px-2 py-2.5 text-sm text-center w-full"
            placeholder="-"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-tinix-muted">Số tầng</span>
          <input
            type="number"
            min={0}
            className="rounded-xl tinix-input px-2 py-2.5 text-sm text-center w-full"
            placeholder="-"
            value={floors}
            onChange={(e) => setFloors(e.target.value)}
          />
        </label>
      </div>

      {mockAllowed && (
        <label className="flex items-center gap-2 text-sm text-tinix-muted cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-600 bg-tinix-field text-primary focus:ring-primary"
            checked={useMock}
            onChange={(e) => setUseMock(e.target.checked)}
          />
          Dùng dữ liệu giả lập (dev only)
        </label>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary-dark disabled:opacity-60 transition-colors uppercase tracking-wide"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
            Đang phân tích…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xl">auto_fix_high</span>
            Xem kết quả định giá
          </>
        )}
      </button>

      <p className="flex gap-2 text-xs text-tinix-muted leading-relaxed">
        <span className="material-symbols-outlined text-base shrink-0 text-tinix-muted">
          info
        </span>
        Kết quả mang tính tham khảo, tổng hợp từ dữ liệu thị trường. Giá thực tế có thể khác
        tùy thời điểm và đặc điểm tài sản.
      </p>
    </form>
  );
}

function mockPredict(body: PredictRequest): PredictResponse {
  const ppm =
    body.propertyType === "land"
      ? 0.045
      : body.propertyType === "shophouse"
        ? 0.13
        : 0.12;
  const base = body.areaM2 * ppm + 2 * 0.08;
  const mid = Math.round(base * 10) / 10;
  const spread = Math.max(0.3, mid * 0.08);
  return {
    estimatedPriceBillion: mid,
    priceRangeBillion: {
      min: Math.round((mid - spread) * 100) / 100,
      max: Math.round((mid + spread) * 100) / 100,
    },
    currency: "VND",
    unitNote: "Đơn vị: tỷ VND (mock)",
    summary: `Ước tính cho “${body.address.slice(0, 40)}…”, ${body.areaM2} m².`,
  };
}
