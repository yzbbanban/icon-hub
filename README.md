# IconHub — 团队内部 SVG 图标与图片资源管理系统

基于 **Vue 3 + Vite + Node.js (Express)** 打造的轻量级团队图标与位图资源管理平台，完整复刻 [Iconfont](https://www.iconfont.cn/) 的**批量上传预处理（SVG 自动去色/保留原色）**、**按项目自动生成在线 Symbol JS (`iconfont.js`)**、**在线改色与任意尺寸 PNG 导出**以及**浏览开放 + 操作密码保护**。

## 一、 快速启动

```bash
cd /Users/yzbbanban/Downloads/money/fldz/code/ai/icon-hub

# 1. 安装依赖
npm install

# 2. 启动开发环境（前后端同端口热更新）
npm run dev
```

启动后访问：`http://localhost:3300`

生产环境构建与启动：
```bash
npm run build
npm start
```

## 二、 环境变量与密码配置 (`.env`)

系统根目录下的 `.env` 文件用于配置端口与管理员操作密码：

```env
# 服务运行端口
PORT=3300

# 管理操作密码（上传图标、新建/删除项目、修改/删除图标时需验证此密码）
# 团队成员日常浏览、搜索、在线改色、复制代码、下载 PNG/SVG 及引入 Symbol 链接免密开放
ADMIN_PASSWORD=admin123

# 鉴权 Token 签名密钥
TOKEN_SECRET=icon-hub-team-secret-key
```

> 修改 `.env` 中的 `ADMIN_PASSWORD` 并重启服务后，旧的客户端登录 Token 会自动失效。

## 三、 核心功能一览

1. **浏览开放 + 操作鉴权**
   - 团队成员打开网页无需登录即可检索、切换画布背景（棋盘格/浅色/深色）、全局改色预览、复制 SVG 源码、复制 Symbol 标签或导出任意尺寸 PNG。
   - 点击**上传图标**、**新建项目**、**编辑/删除图标**时，弹出管理密码验证框，验证通过后本地缓存 Token 免重复输入。
2. **仿 Iconfont 批量拖拽上传与 SVG 净化**
   - 支持批量拖入 `.svg`、`.png`、`.webp`、`.jpg`、`.gif`。
   - **单色去色模式**：自动清理 XML 冗余标签并将非 `none` 的 `fill`/`stroke` 转为 `currentColor`，方便前端通过 CSS `color` 动态改色。
   - **保留原色模式**：适合多色图标、插画与品牌徽标。
   - 入库后仍可在图标详情弹窗中随时一键切换“单色去色 / 保留原色”。
3. **按项目自动生成 Symbol JS (`iconfont.js`)**
   - 每次新增、修改或删除图标，后端会自动在 `data/symbols/` 下重新构建各项目的在线 Sprite 脚本：
     - 单个项目：`http://localhost:3300/symbols/<项目英文标识>.js`（例如 `/symbols/common.js`）
     - 全库合集：`http://localhost:3300/symbols/all.js`
   - 前端项目只需引入 `<script src="http://localhost:3300/symbols/common.js"></script>`，即可使用 `<svg class="icon"><use href="#icon-home" /></svg>`。
4. **在线改色与 Canvas 任意尺寸 PNG 导出**
   - 点击任意图标打开详情弹窗，选择预设色板或自定义色值、选择尺寸（`16px` ~ `512px`），即可通过浏览器原生 `<canvas>` 实时渲染并下载对应颜色和尺寸的 `.png` 文件或复制 Base64 DataURL。
