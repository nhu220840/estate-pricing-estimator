"""
API định giá BĐS — nối pipeline sklearn trong backend/models/
(tinix_price_prediction_pipeline.joblib) + metadata tinix_valuation_model_metadata.json.

Chạy (một trong hai):
  - Từ gốc repo:  uvicorn main:app --reload --port 8000
  - Từ backend/:  cd backend && uvicorn main:app --reload --port 8000
Local dev: `npm run dev` (proxy /api → port 8000) + `uvicorn …` tách terminal.
Deploy một URL: build `dist/` rồi chạy uvicorn — FastAPI tự phục vụ `dist/` nếu có.
Docker: `docker build -t tinix .` rồi `docker run -p 8080:8080 tinix`
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .inference import (
        artifact_path_for_status,
        load_resources,
        predict_to_billions,
    )
except ImportError:
    # cd backend && uvicorn main:app
    from inference import (
        artifact_path_for_status,
        load_resources,
        predict_to_billions,
    )

_extra_origins = os.environ.get("CORS_EXTRA_ORIGINS", "")
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if _extra_origins.strip():
    CORS_ORIGINS.extend(
        o.strip() for o in _extra_origins.split(",") if o.strip()
    )

app = FastAPI(title="Tinix valuation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    address: str
    propertyType: Literal[
        "apartment", "townhouse", "land", "villa", "shophouse"
    ]
    areaM2: float = Field(..., gt=0)
    bedrooms: int | None = None
    bathrooms: int | None = None
    floors: int | None = None
    district: str | None = None


class PredictResponse(BaseModel):
    estimatedPriceBillion: float
    priceRangeBillion: dict[str, float]
    currency: str = "VND"
    unitNote: str | None = "Giá ước tính (tỷ VND)"
    summary: str | None = None


@app.on_event("startup")
def startup() -> None:
    load_resources()


@app.post("/api/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    try:
        billions, lo, hi, summary, heuristic = predict_to_billions(
            address=body.address,
            property_type=body.propertyType,
            area_m2=body.areaM2,
            bedrooms=body.bedrooms,
            bathrooms=body.bathrooms,
            floors=body.floors,
            district=body.district,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi suy luận (kiểm tra pipeline khớp cột train): {e}",
        ) from e

    unit = (
        "Đơn vị: tỷ VND (heuristic demo — thêm tinix_price_prediction_pipeline.joblib để dùng model train)"
        if heuristic
        else "Đơn vị: tỷ VND (pipeline × diện tích)"
    )
    return PredictResponse(
        estimatedPriceBillion=round(billions, 4),
        priceRangeBillion={
            "min": round(lo, 2),
            "max": round(hi, 2),
        },
        unitNote=unit,
        summary=summary,
    )


@app.get("/health")
def health():
    _, pipeline = load_resources()
    ap = artifact_path_for_status()
    strict = os.environ.get("TINIX_STRICT_MODEL", "").lower() in (
        "1",
        "true",
        "yes",
    )
    return {
        "ok": True,
        "model_loaded": pipeline is not None,
        "heuristic_fallback_active": pipeline is None and not strict,
        "artifact_expected": str(ap),
        "artifact_exists": ap.is_file(),
        "strict_model_required": strict,
    }


# Một URL cho cả web + API: phục vụ bản build Vite từ thư mục dist/ (Docker / VPS)
_dist = Path(__file__).resolve().parent.parent / "dist"
if (_dist / "index.html").is_file():
    app.mount(
        "/",
        StaticFiles(directory=str(_dist), html=True),
        name="frontend",
    )
