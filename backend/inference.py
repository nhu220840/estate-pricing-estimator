"""
Suy luận giá BĐS từ pipeline + metadata, căn cứ schema bộ dữ liệu gốc:

  https://huggingface.co/datasets/tinixai/vietnam-real-estates

Cột gốc trên Hugging Face (Parquet / train split) — mô tả theo dataset card:
  • name (string): tiêu đề tin đăng (đã strip HTML, ẩn SĐT).
  • description (string): mô tả đầy đủ (strip HTML, ẩn SĐT).
  • property_type_name (string): loại BĐS, ví dụ «Nhà», «Căn hộ chung cư»,
    «Đất», «Biệt thự/Nhà liền kề», «Shophouse» (5 nhóm trong viewer).
  • province_name, district_name, ward_name, street_name (string): địa giới VN.
  • project_name (string): tên dự án hoặc null.
  • price (float64): giá niêm yết VND (có thể null).
  • area (float64): diện tích sàn / đất (m²).
  • floor_count, frontage_width, house_depth, road_width (float64): số tầng,
    mặt tiền, chiều sâu, đường trước nhà (m); có thể null trong dữ liệu gốc.
  • bedroom_count, bathroom_count (float64).
  • house_direction, balcony_direction (string): hướng (Đông, Tây Nam, …) hoặc null.
  • published_at (string): thời điểm đăng ISO 8601.

Pipeline train thêm đặc trưng suy ra (không là cột tải thẳng từ HF):
  log_area, name_len, description_len, published_year, published_month —
  cần khớp cách notebook train đã tạo các cột này từ name/description/published_at.

Form web chỉ có «địa chỉ» + vài số: ta *ước lượng* name_len/description_len từ
chuỗi địa chỉ và dùng thời điểm hiện tại cho published_* khi không có published_at;
đây là giới hạn của API so với đủ trường HF — khi train lại nên thống nhất
cách điền hoặc thu thập đủ trường từ form.
"""

from __future__ import annotations

import json
import os
import pickle
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, TypeAlias

# Khớp enum API ↔ cột property_type_name (5 class trên Hugging Face viewer).
PropertyTypeApi: TypeAlias = Literal[
    "apartment",
    "townhouse",
    "land",
    "villa",
    "shophouse",
]

import joblib
import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent / "models"
# Binary artifacts (.pkl / .joblib) live here; CSV exports live in models/csv/.
ARTIFACTS_DIR = MODELS_DIR / "artifacts"
META_PATH = MODELS_DIR / "tinix_valuation_model_metadata.json"
DEFAULT_ARTIFACT = "best_model_global_logtarget_XGBoost.pkl"


def _artifact_path(meta: dict[str, Any]) -> Path:
    name = os.environ.get(
        "TINIX_MODEL_ARTIFACT",
        meta.get("inference_artifact_filename", DEFAULT_ARTIFACT),
    )
    return ARTIFACTS_DIR / name

RANGE_FRACTION = float(os.environ.get("PRICE_RANGE_FRACTION", "0.08"))

# Giá trị property_type_name phải khớp chuỗi trong dataset HF (xem cột viewer).
_PROPERTY_TYPE_TO_DATASET: dict[str, str] = {
    "apartment": "Căn hộ chung cư",
    "townhouse": "Nhà",  # «Nhà» = nhà riêng các loại trên card HF
    "land": "Đất",
    "villa": "Biệt thự/Nhà liền kề",
    "shophouse": "Shophouse",
}


def _infer_province_name(text: str) -> str:
    """Khớp tên tỉnh/thành với cột province_name trong dataset (63 địa phương)."""
    t = (text or "").lower()
    pairs: list[tuple[tuple[str, ...], str]] = [
        (("hà nội", "ha noi", "hanoi", "hn "), "Hà Nội"),
        (
            (
                "hồ chí minh",
                "ho chi minh",
                "tp.hcm",
                " tphcm",
                "hcm",
                "sài gòn",
                "sai gon",
                "sg ",
            ),
            "Hồ Chí Minh",
        ),
        (("thủ đức", "thu duc"), "Hồ Chí Minh"),
        (("đà nẵng", "da nang"), "Đà Nẵng"),
        (("bình dương",), "Bình Dương"),
        (("dĩ an", "di an"), "Bình Dương"),
        (("đồng nai",), "Đồng Nai"),
        (("biên hòa", "bien hoa"), "Đồng Nai"),
        (("long an",), "Long An"),
        (("khánh hòa", "nha trang"), "Khánh Hòa"),
        (("hải phòng", "hai phong"), "Hải Phòng"),
        (("hưng yên",), "Hưng Yên"),
        (("bà rịa", "vũng tàu", "ba ria"), "Bà Rịa - Vũng Tàu"),
        (("vĩnh long",), "Vĩnh Long"),
        (("cần thơ", "can tho"), "Cần Thơ"),
        (("hải dương",), "Hải Dương"),
        (("bình chánh", "tan binh", "tân bình", "quan 1", "quận 1"), "Hồ Chí Minh"),
        (("quốc oai", "bac tu liem", "bắc từ liêm", "cầu giấy", "nam từ liêm"), "Hà Nội"),
    ]
    for keys, prov in pairs:
        if any(k in t for k in keys):
            return prov
    return "Hồ Chí Minh"


def _load_meta() -> dict[str, Any]:
    if not META_PATH.is_file():
        raise FileNotFoundError(f"Thiếu metadata: {META_PATH}")
    with open(META_PATH, encoding="utf-8") as f:
        return json.load(f)


_meta: dict[str, Any] | None = None
_pipeline: Any | None = None
_artifact_resolved: Path | None = None
_encoding_cache: dict[str, Any] | None = None
_encoding_tried: bool = False


def _get_encoding_artifacts(meta: dict[str, Any]) -> dict[str, Any] | None:
    """Load TE/frequency artifacts once if present."""
    global _encoding_cache, _encoding_tried
    if _encoding_tried:
        return _encoding_cache
    _encoding_tried = True
    filename = meta.get(
        "encoding_artifact_filename",
        "target_frequency_encoding_artifacts.pkl",
    )
    path = ARTIFACTS_DIR / filename
    if not path.is_file():
        _encoding_cache = None
        return None
    with open(path, "rb") as f:
        _encoding_cache = pickle.load(f)
    return _encoding_cache


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
    """Gọi sau khi thay file pipeline (.joblib/.pkl)."""
    global _pipeline, _encoding_cache, _encoding_tried
    _pipeline = None
    _encoding_cache = None
    _encoding_tried = False
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
    """
    Tách chuỗi địa chỉ người dùng -> các cột địa lý giống HF (heuristic).

    Trên dataset, district_name thường là «Quận 1», «Thủ Đức», tên huyện,
    hoặc mã số quận; không đối chiếu master hành chính.
    """
    _ = meta
    t = (address or "").strip()
    parts = [p.strip() for p in re.split(r"[,;]", t) if p.strip()]
    province = _infer_province_name(t)
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
        "street_name": (street or t)[:200],
    }


def build_raw_frame(
    *,
    address: str,
    property_type: PropertyTypeApi,
    area_m2: float,
    bedrooms: int | None,
    bathrooms: int | None,
    floors: int | None,
    district: str | None,
    meta: dict[str, Any],
) -> pd.DataFrame:
    """
    Một dòng DataFrame đúng raw_feature_cols / tinixai schema (đã làm giàu).

    Mapping từ form → HF:
      area, bedroom_count, bathroom_count, floor_count ← nhập liệu.
      province/district/ward/street ← parse_address_for_row (ước lượng).
      property_type_name ← _PROPERTY_TYPE_TO_DATASET (chuỗi đúng dataset).
      name_len / description_len ← proxy từ độ dài «địa chỉ» (không có name/description riêng).
      published_year/month ← thời điểm gọi API (HF dùng published_at đầy đủ).
    """
    loc = parse_address_for_row(address, district, meta)
    now = datetime.now()
    area = float(area_m2)
    addr_stripped = (address or "").strip()
    # Proxy: trong HF là len(name), len(description); form chỉ có một ô địa chỉ.
    desc_proxy = f"{addr_stripped} | district_hint={district or ''}"
    row: dict[str, Any] = {
        "area": area,
        "floor_count": float(floors or 1),
        "frontage_width": float(os.environ.get("TINIX_DEFAULT_FRONTAGE_M", "4.5")),
        "house_depth": float(os.environ.get("TINIX_DEFAULT_HOUSE_DEPTH_M", "12.0")),
        "road_width": float(os.environ.get("TINIX_DEFAULT_ROAD_WIDTH_M", "5.0")),
        "bedroom_count": float(bedrooms if bedrooms is not None else 2),
        "bathroom_count": float(bathrooms if bathrooms is not None else 2),
        "log_area": float(np.log1p(area)),
        "name_len": float(len(addr_stripped)),
        "description_len": float(len(desc_proxy)),
        "published_year": float(now.year),
        "published_month": float(now.month),
        "province_name": loc["province_name"],
        "district_name": loc["district_name"],
        "ward_name": loc["ward_name"],
        "street_name": loc["street_name"][:200],
        "project_name": os.environ.get("TINIX_DEFAULT_PROJECT_NAME", ""),
        "property_type_name": _PROPERTY_TYPE_TO_DATASET.get(
            property_type, "Nhà"
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


def _cat_value_for_encoding(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and np.isnan(v):
        return ""
    s = str(v).strip()
    return s


def _encoding_te_freq(
    enc: dict[str, Any],
    col: str,
    raw_val: Any,
) -> tuple[float, float]:
    """
    Lookup TE/FREQ values.
    Unknown/missing values fallback to __MISSING__ if available, else global mean.
    """
    global_mean = float(enc["global_mean_log_target"])
    mapping = enc["maps"][col]
    te_map: dict[str, float] = mapping["te"]
    freq_map: dict[str, float] = mapping["freq"]
    key = _cat_value_for_encoding(raw_val)
    if not key:
        if "__MISSING__" in te_map:
            return float(te_map["__MISSING__"]), float(freq_map.get("__MISSING__", 0.0))
        return global_mean, float(freq_map.get("__MISSING__", 0.0))
    if key in te_map:
        return float(te_map[key]), float(freq_map.get(key, 0.0))
    if "__MISSING__" in te_map:
        return float(te_map["__MISSING__"]), float(freq_map.get("__MISSING__", 0.0))
    return global_mean, 0.0


def build_pipeline_input_df(
    df_raw: pd.DataFrame,
    meta: dict[str, Any],
    enc: dict[str, Any] | None,
) -> pd.DataFrame:
    """
    Build model input expected by the regression artifact (XGBoost / sklearn):
    12 numeric raw columns + 16 TE/FREQ encoded categorical columns.
    """
    if enc is None:
        # Backward compatibility for legacy one-file pipelines accepting raw categoricals.
        return df_raw

    num_cols: list[str] = meta["numeric_raw_cols"]
    cat_cols: list[str] = meta["categorical_raw_cols"]
    model_cols: list[str] = meta["model_feature_cols"]
    r0 = df_raw.iloc[0]
    row: dict[str, Any] = {}

    for c in num_cols:
        row[c] = float(r0[c])
    for c in cat_cols:
        te, freq = _encoding_te_freq(enc, c, r0[c])
        row[f"{c}__te"] = te
        row[f"{c}__freq"] = freq

    return pd.DataFrame([{c: row[c] for c in model_cols}])


def encoding_artifact_path(meta: dict[str, Any]) -> Path:
    return ARTIFACTS_DIR / meta.get(
        "encoding_artifact_filename",
        "target_frequency_encoding_artifacts.pkl",
    )


def _heuristic_fallback_billions(
    address: str,
    property_type: PropertyTypeApi,
    area_m2: float,
    bedrooms: int | None,
    floors: int | None,
) -> tuple[float, float, float, str]:
    """
    Khi chưa có file pipeline: trả về mức giá theo thứ tự độ lớn (demo),
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
        "shophouse": 1.18,
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
        "[Heuristic — chưa có file pipeline trong backend/models/artifacts/] "
        f"Ước tính minh họa theo khu vực/diện tích/loại BĐS; "
        f"đặt pipeline đã train (XGBoost) vào backend/models/artifacts/ để dùng model thật."
    )
    return billions, lo, hi, summary


def predict_total_price_vnd(
    df_raw: pd.DataFrame,
    pipeline: Any,
    meta: dict[str, Any],
) -> float:
    enc = _get_encoding_artifacts(meta)
    df_in = build_pipeline_input_df(df_raw, meta, enc)
    y = pipeline.predict(df_in)
    ppm2 = float(np.asarray(y).ravel()[0])
    # Default theo metadata; có thể override bằng env.
    env = os.environ.get("TINIX_PRED_LOG1P_PPM2", "").lower()
    apply_expm1 = (
        env in ("1", "true", "yes")
        if env in ("0", "1", "true", "false", "yes", "no")
        else bool(meta.get("inference_apply_expm1_to_pred", False))
    )
    if apply_expm1:
        ppm2 = float(np.expm1(ppm2))
    area = float(df_raw["area"].iloc[0])
    total = ppm2 * area
    return total


def predict_to_billions(
    address: str,
    property_type: PropertyTypeApi,
    area_m2: float,
    bedrooms: int | None,
    bathrooms: int | None,
    floors: int | None,
    district: str | None,
) -> tuple[float, float, float, str, bool]:
    """
    Trả về (billions, lo, hi, summary, used_heuristic_fallback).
    Nếu không có artifact model và không bật TINIX_STRICT_MODEL: dùng heuristic (demo).
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
