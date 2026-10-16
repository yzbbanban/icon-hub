/**
 * 初始示例项目与图标数据（首次启动自动写入 data/db.json 并生成对应 Symbol JS）
 */

export const INITIAL_PROJECTS = [
  {
    id: 'proj_common',
    name: '通用基础图标库',
    code: 'common',
    prefix: 'icon-',
    description: '团队通用 UI 导航、操作与状态单色图标（支持 CSS 动态改色与 Symbol 引用）',
    createdAt: '2026-10-15T08:00:00.000Z'
  },
  {
    id: 'proj_brand',
    name: '品牌与多色徽标',
    code: 'brand',
    prefix: 'brand-',
    description: '保留原始配色的多色图标、状态插画及 PNG 位图资源',
    createdAt: '2026-10-15T08:05:00.000Z'
  }
]

export const INITIAL_ICONS = [
  {
    id: 'icon_home',
    name: '首页导航',
    code: 'home',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['导航', '首页', 'home'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>`
  },
  {
    id: 'icon_search',
    name: '搜索查询',
    code: 'search',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['搜索', '查询', '放大镜'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.35-4.35"/></svg>`
  },
  {
    id: 'icon_upload_cloud',
    name: '云端上传',
    code: 'upload-cloud',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['上传', '云端', '文件'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M16 16l-4-4-4 4M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`
  },
  {
    id: 'icon_download',
    name: '下载导出',
    code: 'download',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['下载', '导出', '保存'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
  },
  {
    id: 'icon_settings',
    name: '系统设置',
    code: 'settings',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['设置', '配置', '齿轮'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
  },
  {
    id: 'icon_copy',
    name: '复制代码',
    code: 'copy',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['复制', '剪贴板', '操作'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
  },
  {
    id: 'icon_palette',
    name: '主题调色盘',
    code: 'palette',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['颜色', '主题', '设计'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`
  },
  {
    id: 'icon_shield_lock',
    name: '安全鉴权',
    code: 'shield-lock',
    projectId: 'proj_common',
    type: 'svg',
    isColorStripped: true,
    tags: ['安全', '密码', '权限'],
    rawSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9a2 2 0 1 1 4 0v2"/></svg>`
  },
  {
    id: 'icon_spark_color',
    name: 'AI 灵感多色徽标',
    code: 'ai-spark',
    projectId: 'proj_brand',
    type: 'svg',
    isColorStripped: false,
    tags: ['多色', 'AI', '品牌'],
    rawSvg: `<svg viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="16" fill="#EEF2FF"/><path d="M32 10L37.8 26.2L54 32L37.8 37.8L32 54L26.2 37.8L10 32L26.2 26.2L32 10Z" fill="#4F46E5"/><circle cx="48" cy="16" r="4" fill="#F59E0B"/><circle cx="17" cy="47" r="3" fill="#10B981"/></svg>`
  },
  {
    id: 'icon_verified_badge',
    name: '官方认证多彩勋章',
    code: 'verified-badge',
    projectId: 'proj_brand',
    type: 'svg',
    isColorStripped: false,
    tags: ['多色', '认证', '勋章'],
    rawSvg: `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="26" fill="#DBEAFE"/><circle cx="32" cy="32" r="20" fill="#2563EB"/><path d="M23 32.5L29 38.5L41.5 26" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }
]
