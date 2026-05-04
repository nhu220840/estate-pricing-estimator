/**
 * Loại BĐS gửi qua API — backend map sang đúng `property_type_name` trên HF
 * tinixai/vietnam-real-estates (đúng 5 giá trị trong viewer, không có loại con riêng).
 */
export type PropertyType =
  | "apartment"
  | "townhouse"
  | "land"
  | "villa"
  | "shophouse";

export interface PredictRequest {
  address: string;
  propertyType: PropertyType;
  areaM2: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  district?: string;
}

/** Khớp field để backend có thể map trực tiếp từ model */
export interface PredictResponse {
  estimatedPriceBillion: number;
  priceRangeBillion: { min: number; max: number };
  currency?: string;
  unitNote?: string;
  /** Giải thích ngắn từ model (tuỳ chọn) */
  summary?: string;
}
