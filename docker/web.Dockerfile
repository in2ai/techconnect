FROM node:24-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./

RUN npm run build && \
    build_dir="$(find dist -mindepth 1 -maxdepth 2 -type d -name browser | head -n 1)" && \
    test -n "$build_dir" && \
    mkdir -p /tmp/frontend-dist && \
    cp -r "$build_dir"/. /tmp/frontend-dist

FROM nginx:1.29-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /tmp/frontend-dist /usr/share/nginx/html

EXPOSE 80
