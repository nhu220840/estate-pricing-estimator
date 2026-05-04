"""
Chạy API từ thư mục gốc dự án:

  uvicorn main:app --reload --port 8000

Package `backend` phải import bình thường (không dùng importlib) để Pydantic/FastAPI hoạt động đúng.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.main import app
