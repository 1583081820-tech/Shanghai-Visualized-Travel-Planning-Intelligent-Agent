# ==============================================
# 前端 Dockerfile
# 两阶段构建：node 构建 + nginx 托管
# ==============================================

# 第一阶段：构建
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_AMAP_WEB_KEY=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_AMAP_WEB_KEY=${VITE_AMAP_WEB_KEY}

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --registry=https://registry.npmmirror.com

# 复制源码
COPY . .

# 构建
RUN npm run build


# 第二阶段：运行
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置（如果有的话）
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
