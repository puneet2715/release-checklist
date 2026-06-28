# ── Build the static SPA ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
# VITE_API_URL is baked in at build time. Empty => same-origin (nginx proxies /api).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY web/package.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ── Serve with nginx, proxying /api to the API container ──────────────────────
FROM nginx:1.27-alpine AS runtime
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
