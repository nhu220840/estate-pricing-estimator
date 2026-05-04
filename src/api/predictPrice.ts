import type { PredictRequest, PredictResponse } from "../types/prediction";

const DEFAULT_PATH = "/api/predict";

/**
 * Gọi API dự đoán giá. Cấu hình base URL qua biến môi trường Vite:
 * `VITE_API_BASE_URL=https://your-backend.example.com`
 *
 * Endpoint mặc định: `{VITE_API_BASE_URL}/api/predict`
 * Override path: set `VITE_PREDICT_PATH=/v1/valuation/predict`
 */
export async function predictPrice(
  body: PredictRequest,
  signal?: AbortSignal
): Promise<PredictResponse> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const path =
    (import.meta.env.VITE_PREDICT_PATH as string | undefined)?.trim() ||
    DEFAULT_PATH;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Dự đoán thất bại (${res.status} ${res.statusText})`
    );
  }

  return res.json() as Promise<PredictResponse>;
}
