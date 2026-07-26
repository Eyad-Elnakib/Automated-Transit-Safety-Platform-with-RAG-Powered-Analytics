# --- 1. Webcam AI Service (Python FastAPI + YOLO) ---
FROM python:3.11-slim AS webcam-ai
WORKDIR /app/ai-service

# Install system dependencies required by OpenCV
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY webcam-monitoring-app/ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY webcam-monitoring-app/ai-service/app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# --- 2. Webcam Backend (Node.js Express + Socket.IO) ---
FROM node:20-alpine AS webcam-backend
WORKDIR /app

COPY shared/models ./shared/models
COPY webcam-monitoring-app/backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY webcam-monitoring-app/backend/src ./backend/src
EXPOSE 5000
CMD ["npm", "start", "--prefix", "backend"]

# --- 3. Webcam Frontend (React + Vite -> Nginx) ---
FROM node:20-alpine AS webcam-frontend-builder
WORKDIR /app/frontend

COPY webcam-monitoring-app/frontend/package*.json ./
RUN npm ci

COPY webcam-monitoring-app/frontend/ ./
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

FROM nginx:alpine AS webcam-frontend
COPY --from=webcam-frontend-builder /app/frontend/dist /usr/share/nginx/html
# Configure Nginx to support React Router fallback and proxy API/Socket requests
RUN printf "server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass http://webcam-backend:5000;\n\
    }\n\
    location /socket.io/ {\n\
        proxy_pass http://webcam-backend:5000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade \$http_upgrade;\n\
        proxy_set_header Connection 'upgrade';\n\
    }\n\
    location /storage/ {\n\
        proxy_pass http://webcam-backend:5000;\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# --- 4. Dashboard Backend (Node.js Express) ---
FROM node:20-alpine AS dashboard-backend
WORKDIR /app

COPY shared/models ./shared/models
COPY dashboard/backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY dashboard/backend/ ./backend/
EXPOSE 5000
CMD ["npm", "start", "--prefix", "backend"]

# --- 5. Dashboard Frontend (React + Vite -> Nginx) ---
FROM node:20-alpine AS dashboard-frontend-builder
WORKDIR /app/frontend

COPY dashboard/frontend/package*.json ./
RUN npm ci

COPY dashboard/frontend/ ./
RUN npm run build

FROM nginx:alpine AS dashboard-frontend
COPY --from=dashboard-frontend-builder /app/frontend/dist /usr/share/nginx/html
# Setup React Router fallback and proxy /api/ to Dashboard Backend
RUN printf "server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass http://dashboard-backend:5000;\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
