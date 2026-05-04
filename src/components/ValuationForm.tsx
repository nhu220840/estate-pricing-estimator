import { FormEvent, useState } from "react";
import { predictPrice } from "../api/predictPrice";
import type { PredictRequest, PredictResponse, PropertyType } from "../types/prediction";

/** Nhãn hiển thị khớp chuỗi `property_type_name` trong dataset (map API → HF trong backend). */
const propertyLabels: Record<PropertyType, string> = {
  apartment: "Căn hộ chung cư",
  townhouse: "Nhà",
  land: "Đất",
  villa: "Biệt thự / nhà liền kề",
};

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
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mockAllowed = import.meta.env.VITE_ENABLE_MOCK === "true";
  const [useMock, setUseMock] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const area = parseFloat(areaM2.replace(",", "."));
    if (!address.trim()) {
      setError("Vui lòng nhập địa chỉ hoặc mô tả vị trí.");
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
      district: district.trim() || undefined,
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
        <p className="mt-1 text-sm text-tinix-muted">
          Dữ liệu gửi lên <code className="text-tinix-muted/90">POST /api/predict</code> được
          backend chuyển thành một dòng đặc trưng giống bộ{" "}
          <span className="text-white/90">tinixai/vietnam-real-estates</span> (địa chỉ →
          tỉnh/huyện ước lượng; loại BĐS → đúng tên loại trong dataset).
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white flex items-center gap-1">
          Địa chỉ <span className="text-red-400">*</span>
        </span>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary text-xl">
            location_on
          </span>
          <input
            className={fieldWrap}
            placeholder="VD: Nguyễn Văn Quá, Đông Hưng Thuận, TP. Hồ Chí Minh"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>
        <p className="text-xs text-tinix-muted leading-relaxed pl-0.5">
          Nên ghi rõ <span className="text-white/80">tỉnh/thành</span> (ví dụ Hà Nội, TP.HCM,
          Đà Nẵng…) để backend suy ra <span className="text-white/80">province_name</span>.
          Cùng chuỗi này được dùng làm proxy độ dài tiêu đề/mô tả tin (name_len / description_len)
          vì form không tách ô «tiêu đề» / «mô tả».
        </p>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white">
            Loại BĐS <span className="text-red-400">*</span>
          </span>
          <p className="text-xs text-tinix-muted -mt-0.5 mb-1">
            Khớp nhãn loại trong dataset (ví dụ «Nhà», không dùng từ đồng nghĩa khác trên pipeline).
          </p>
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
              {(
                Object.entries(propertyLabels) as [PropertyType, string][]
              ).map(([k, v]) => (
                <option key={k} value={k} className="bg-tinix-card text-white">
                  {v}
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
            placeholder="VD: 75 — cột area trên model"
            value={areaM2}
            onChange={(e) => setAreaM2(e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <p className="col-span-3 text-xs text-tinix-muted -mb-1">
          Tuỳ chọn — map sang <span className="text-white/80">bedroom_count</span>,{" "}
          <span className="text-white/80">bathroom_count</span>,{" "}
          <span className="text-white/80">floor_count</span>. Để trống backend dùng mặc định
          2 / 2 / 1.
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-tinix-muted">Phòng ngủ</span>
          <input
            type="number"
            min={0}
            className="rounded-xl tinix-input px-2 py-2.5 text-sm text-center w-full"
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
            value={floors}
            onChange={(e) => setFloors(e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white">
          Quận / huyện <span className="text-tinix-muted font-normal">(tuỳ chọn)</span>
        </span>
        <input
          className="rounded-xl tinix-input px-3 py-3 text-sm w-full"
          placeholder="VD: Thủ Đức, Tân Bình, 8, 12 — khớp district_name trong dữ liệu"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />
        <p className="text-xs text-tinix-muted leading-relaxed pl-0.5">
          Nếu điền, giá trị này được ưu tiên làm <span className="text-white/80">district_name</span>.
          Nếu để trống, backend lấy từ cách tách địa chỉ (dấu phẩy), không đối chiếu danh mục
          quận chính thức.
        </p>
      </label>

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
        Kết quả mang tính tham khảo. Giá thực tế có thể thay đổi theo thời điểm và đặc điểm
        riêng của tài sản. Một số trường (mặt tiền, chiều sâu, đường, hướng, dự án) do backend
        gán mặc định hoặc biến môi trường — không có trên form này.
      </p>
    </form>
  );
}

function mockPredict(body: PredictRequest): PredictResponse {
  const base =
    body.areaM2 * (body.propertyType === "land" ? 0.045 : 0.12) +
    (body.bedrooms ?? 2) * 0.08;
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
