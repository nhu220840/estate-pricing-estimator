# syntax=docker/dockerfile:1
# Một container: React build tĩnh + FastAPI (người dùng chỉ cần 1 URL).
# Build: docker build -t tinix-valuation .
# Chạy:  docker run -p 8080:8080 tinix-valuation
# Nền tảng: Railway / Render / Fly.io / Google Cloud Run đều chấp nhận image này.

FROM node:20-alpine AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY src ./src
COPY public ./public
# Cùng origin → gọi /api/predict tương đối, không cần VITE_API_BASE_URL
ENV VITE_API_BASE_URL=
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=frontend /src/dist ./dist
EXPOSE 8080
ENV PORT=8080
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
