/** Payload gửi lên backend / model dự đoán giá */
export type PropertyType = "apartment" | "townhouse" | "land" | "villa";

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
