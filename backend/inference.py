"""
Suy luận giá BĐS: đọc tinix_valuation_model_metadata.json + pipeline joblib.

Pipeline sklearn (toàn bộ bước encoding + RF) phải nhận DataFrame 1 dòng
đúng các cột raw trong metadata (numeric_raw_cols + categorical_raw_cols),
và trả về giá / m² (VND) — khớp cách đo trong metadata (output Price_ML = pred_ppm2 * area).
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent / "models"
META_PATH = MODELS_DIR / "tinix_valuation_model_metadata.json"
DEFAULT_ARTIFACT = "tinix_price_prediction_pipeline.joblib"


def _artifact_path(meta: dict[str, Any]) -> Path:
    name = os.environ.get(
        "TINIX_MODEL_ARTIFACT",
        meta.get("inference_artifact_filename", DEFAULT_ARTIFACT),
    )
    return MODELS_DIR / name

RANGE_FRACTION = float(os.environ.get("PRICE_RANGE_FRACTION", "0.08"))

_PROPERTY_TYPE_TO_VI: dict[str, str] = {
    "apartment": "Căn hộ/Chung cư",
    "townhouse": "Nhà phố",
    "land": "Đất nền",
    "villa": "Biệt thự",
}


def _load_meta() -> dict[str, Any]:
    if not META_PATH.is_file():
        raise FileNotFoundError(f"Thiếu metadata: {META_PATH}")
    with open(META_PATH, encoding="utf-8") as f:
        return json.load(f)


_meta: dict[str, Any] | None = None
_pipeline: Any | None = None
_artifact_resolved: Path | None = None


def load_resources() -> tuple[dict[str, Any], Any | None]:
    global _meta, _pipeline, _artifact_resolved
    if _meta is None:
        _meta = _load_meta()
    path = _artifact_path(_meta)
    if _pipeline is None and path.is_file():
        _artifact_resolved = path
        _pipeline = joblib.load(path)
    elif _artifact_resolved is None:
        _artifact_resolved = path
    return _meta, _pipeline


def reload_model() -> Any | None:
    """Gọi sau khi thay file .joblib."""
    global _pipeline
    _pipeline = None
    _, p = load_resources()
    return p


def artifact_path_for_status() -> Path:
    meta = _meta or _load_meta()
    return _artifact_path(meta)


def parse_address_for_row(
    address: str,
    district_hint: str | None,
    meta: dict[str, Any],
) -> dict[str, str]:
    """Tách địa chỉ text -> province / district / ward / street (heuristic)."""
    t = (address or "").strip()
    parts = [p.strip() for p in re.split(r"[,;]", t) if p.strip()]
    province = "Hồ Chí Minh"
    if any(k in t for k in ("Hà Nội", "Hanoi", "HN ")):
        province = "Hà Nội"
    district = (district_hint or "").strip() or (
        parts[-2] if len(parts) >= 2 else (parts[0] if parts else "Không rõ")
    )
    ward = parts[1] if len(parts) >= 3 else "Không rõ"
    street = (
        ", ".join(parts[:-2])
        if len(parts) > 2
        else (parts[0] if len(parts) == 1 else "")
    )
    return {
        "province_name": province,
        "district_name": district or "Không rõ",
        "ward_name": ward,
        "street_name": street or t[:120],
    }


def build_raw_frame(
    *,
    address: str,
    property_type: Literal["apartment", "townhouse", "land", "villa"],
    area_m2: float,
    bedrooms: int | None,
    bathrooms: int | None,
    floors: int | None,
    district: str | None,
    meta: dict[str, Any],
) -> pd.DataFrame:
    loc = parse_address_for_row(address, district, meta)
    now = datetime.now()
    area = float(area_m2)
    row: dict[str, Any] = {
        "area": area,
        "floor_count": float(floors or 1),
        "frontage_width": float(os.environ.get("TINIX_DEFAULT_FRONTAGE_M", "4.5")),
        "house_depth": float(os.environ.get("TINIX_DEFAULT_HOUSE_DEPTH_M", "12.0")),
        "road_width": float(os.environ.get("TINIX_DEFAULT_ROAD_WIDTH_M", "5.0")),
        "bedroom_count": float(bedrooms if bedrooms is not None else 2),
        "bathroom_count": float(bathrooms if bathrooms is not None else 2),
        "log_area": float(np.log1p(area)),
        "name_len": float(len(address)),
        "description_len": float(len(address) + 24),
        "published_year": float(now.year),
        "published_month": float(now.month),
        "province_name": loc["province_name"],
        "district_name": loc["district_name"],
        "ward_name": loc["ward_name"],
        "street_name": loc["street_name"][:200],
        "project_name": os.environ.get("TINIX_DEFAULT_PROJECT_NAME", ""),
        "property_type_name": _PROPERTY_TYPE_TO_VI.get(
            property_type, "Nhà phố"
        ),
        "house_direction": os.environ.get(
            "TINIX_DEFAULT_HOUSE_DIRECTION", "Không xác định"
        ),
        "balcony_direction": os.environ.get(
            "TINIX_DEFAULT_BALCONY_DIRECTION", "Không xác định"
        ),
    }
    num_cols = meta["numeric_raw_cols"]
    cat_cols = meta["categorical_raw_cols"]
    for c in num_cols + cat_cols:
        if c not in row:
            raise KeyError(f"Thiếu cột raw '{c}' trong builder")
    return pd.DataFrame([{c: row[c] for c in num_cols + cat_cols}])


def _heuristic_fallback_billions(
    address: str,
    property_type: Literal["apartment", "townhouse", "land", "villa"],
    area_m2: float,
    bedrooms: int | None,
    floors: int | None,
) -> tuple[float, float, float, str]:
    """
    Khi chưa có file .joblib: trả về mức giá theo thứ tự độ lớn (demo),
    không thay thế model đã train. Bật TINIX_STRICT_MODEL=1 để tắt fallback (503).
    """
    addr = (address or "").lower()
    base_ppm2 = 38e6  # VND/m² — mặc định
    if any(
        x in addr
        for x in ("hà nội", "ha noi", "hanoi", "hn ")
    ):
        base_ppm2 = 44e6
    elif any(
        x in addr
        for x in (
            "hồ chí minh",
            "ho chi minh",
            "tp.hcm",
            " tphcm",
            "hcm",
            "sài gòn",
            "sai gon",
        )
    ):
        base_ppm2 = 58e6
    mult = {
        "apartment": 1.0,
        "townhouse": 1.1,
        "land": 0.65,
        "villa": 1.25,
    }[property_type]
    br = float(bedrooms if bedrooms is not None else 2)
    fl = float(floors if floors is not None else 1)
    ppm2 = (
        base_ppm2
        * mult
        * (1.0 + 0.035 * max(-1.0, br - 2.0))
        * (1.0 + 0.025 * max(0.0, fl - 1.0))
    )
    ppm2 = float(np.clip(ppm2, 12e6, 320e6))
    total_vnd = ppm2 * float(area_m2)
    billions = total_vnd / 1e9
    lo = max(0.0, billions * (1.0 - RANGE_FRACTION))
    hi = billions * (1.0 + RANGE_FRACTION)
    summary = (
        "[Heuristic — chưa có tinix_price_prediction_pipeline.joblib] "
        f"Ước tính minh họa theo khu vực/diện tích/loại BĐS; "
        f"đặt pipeline đã train vào backend/models/ để dùng RandomForest thật."
    )
    return billions, lo, hi, summary


def predict_total_price_vnd(
    df_raw: pd.DataFrame,
    pipeline: Any,
    meta: dict[str, Any],
) -> float:
    y = pipeline.predict(df_raw)
    ppm2 = float(np.asarray(y).ravel()[0])
    # Nếu pipeline trả log1p(price_per_m2): bật TINIX_PRED_LOG1P_PPM2=1
    if os.environ.get("TINIX_PRED_LOG1P_PPM2", "").lower() in ("1", "true", "yes"):
        ppm2 = float(np.expm1(ppm2))
    area = float(df_raw["area"].iloc[0])
    total = ppm2 * area
    return total


def predict_to_billions(
    address: str,
    property_type: Literal["apartment", "townhouse", "land", "villa"],
    area_m2: float,
    bedrooms: int | None,
    bathrooms: int | None,
    floors: int | None,
    district: str | None,
) -> tuple[float, float, float, str, bool]:
    """
    Trả về (billions, lo, hi, summary, used_heuristic_fallback).
    Nếu không có .joblib và không bật TINIX_STRICT_MODEL: dùng heuristic (demo).
    """
    meta, pipeline = load_resources()
    ap = _artifact_path(meta)
    strict = os.environ.get("TINIX_STRICT_MODEL", "").lower() in (
        "1",
        "true",
        "yes",
    )
    if pipeline is None:
        if strict:
            raise FileNotFoundError(
                f"Chưa có pipeline model tại {ap}. "
                f"Export: joblib.dump(pipeline, r\"{ap}\") rồi khởi động lại API, "
                "hoặc tắt TINIX_STRICT_MODEL để dùng heuristic demo."
            )
        b, lo, hi, s = _heuristic_fallback_billions(
            address, property_type, area_m2, bedrooms, floors
        )
        return b, lo, hi, s, True

    df = build_raw_frame(
        address=address,
        property_type=property_type,
        area_m2=area_m2,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        floors=floors,
        district=district,
        meta=meta,
    )
    total_vnd = predict_total_price_vnd(df, pipeline, meta)
    billions = total_vnd / 1e9
    lo = max(0.0, billions * (1.0 - RANGE_FRACTION))
    hi = billions * (1.0 + RANGE_FRACTION)
    summary = (
        f"{meta.get('best_model_name', 'Model')}: "
        f"{area_m2:.0f} m², {property_type}, {df['district_name'].iloc[0]}."
    )
    return billions, lo, hi, summary, False
