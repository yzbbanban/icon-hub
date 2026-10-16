# 直接指定国内可用镜像源前缀，绕过失效的 docker.jsdelivr.fyi 镜像代理 (429 Too Many Requests)
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 复制依赖配置并安装（使用国内 npmmirror 镜像源加速）
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --no-audit --no-fund

# 复制项目源码并构建前端静态资源 (生成 dist/)
COPY . .
RUN npm run build

# 声明持久化数据卷挂载点
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3300

EXPOSE 3300

# 启动生产服务（同时托管前端页面、API 与静态字体包）
CMD ["npm", "start"]
