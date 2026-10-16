<template>
  <div class="app-shell">
    <!-- 顶部导航栏 -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-logo">✦</div>
        <div>
          <div>IconHub 团队图标库</div>
          <div style="font-size: 11px; font-weight: 400; color: var(--text-muted); margin-top: -2px;">
            SVG 矢量 · PNG 位图 · 自动生成 Iconfont 7 件套离线包
          </div>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          class="input"
          placeholder="搜索图标名称、Font-Class/Symbol 代码 (如 home)、Unicode 或标签..."
        />
      </div>

      <!-- 右侧操作区 -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button
          class="btn btn-sm"
          :class="isAuthenticated ? 'btn-secondary' : 'btn-ghost'"
          @click="handleAuthButtonClick"
          :title="isAuthenticated ? '点击可退出管理态' : '输入 .env 中的管理密码解锁上传与编辑'"
        >
          <span>{{ isAuthenticated ? '🔓 已解锁管理' : '🔒 操作鉴权' }}</span>
        </button>

        <button class="btn btn-primary" @click="requestProtectedAction(() => (showUploadModal = true))">
          <span>📥 上传 / 导入 Iconfont</span>
        </button>
      </div>
    </header>

    <!-- 主体两栏布局 -->
    <div class="layout">
      <!-- 左侧项目分组导航 -->
      <aside class="sidebar">
        <div>
          <div class="sidebar-section-title" style="margin-bottom: 8px;">
            <span>资源总览</span>
          </div>
          <div class="nav-list">
            <div
              class="nav-item"
              :class="{ active: activeProjectId === 'all' }"
              @click="activeProjectId = 'all'"
            >
              <span>📚 全部图标资源</span>
              <span class="badge">{{ totalIconsCount }}</span>
            </div>
          </div>
        </div>

        <div style="flex: 1;">
          <div class="sidebar-section-title" style="margin-bottom: 8px;">
            <span>项目分组 (独立字体包)</span>
            <button
              class="btn btn-ghost btn-sm"
              style="padding: 2px 6px;"
              @click="requestProtectedAction(() => (showNewProjectModal = true))"
            >
              + 新建
            </button>
          </div>

          <div class="nav-list">
            <div
              v-for="proj in projects"
              :key="proj.id"
              class="nav-item"
              :class="{ active: activeProjectId === proj.id }"
              @click="activeProjectId = proj.id"
            >
              <div style="min-width: 0; flex: 1;">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  📁 {{ proj.name }}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
                  前缀: .{{ proj.prefix }}* / #{{ proj.prefix }}*
                </div>
              </div>
              <span class="badge">{{ proj.totalCount || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 底部持久化状态卡片 -->
        <div
          style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--text-secondary);"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 600; color: var(--text-main);">💾 本地持久化已开启</span>
            <span
              style="font-size: 10.5px; background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 999px; font-weight: 600;"
            >
              实时落盘
            </span>
          </div>
          <div style="line-height: 1.6; font-size: 11.5px;">
            <div>• 数据库：<code>data/iconhub.sqlite</code></div>
            <div>• 镜像备份：<code>data/db.json</code></div>
            <div>• 源文件：<code>data/uploads/</code></div>
            <div>• 离线包：<code>data/packages/{{ currentProjectCode }}/iconfont/</code></div>
          </div>
        </div>
      </aside>

      <!-- 右侧主内容区 -->
      <main class="main-content">
        <!-- 当前项目信息与“下载至本地 (iconfont.zip)”面板（仿 Iconfont 我的项目） -->
        <div class="symbol-banner">
          <div style="min-width: 240px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h2 style="font-size: 18px; font-weight: 700;">
                {{ currentProject ? currentProject.name : '全部项目图标合集' }}
              </h2>
              <span class="badge" style="background: #e0e7ff; color: var(--primary); font-family: monospace;">
                前缀: {{ currentProject ? currentProject.prefix : 'icon-' }}
              </span>
              <button
                v-if="currentProject && projects.length > 1"
                class="btn btn-ghost btn-sm"
                style="color: var(--danger);"
                @click="requestProtectedAction(() => handleDeleteProject(currentProject))"
              >
                删除项目
              </button>
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              已自动生成标准 Iconfont 7 件套（<code>iconfont.css</code>、<code>.js</code>、<code>.json</code>、<code>.svg</code>、<code>.ttf</code>、<code>.woff</code>、<code>.woff2</code>），点击右侧<strong>下载至本地</strong>解压即可直接放入项目使用。
            </p>
          </div>

          <!-- 下载至本地 & 在线链接按钮区 -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <a
              :href="`/api/projects/${currentProjectCode}/download-package`"
              class="btn btn-primary"
              style="text-decoration: none;"
            >
              ⬇️ 下载至本地 (iconfont.zip)
            </a>
            <a
              :href="`/packages/${currentProjectCode}/iconfont/demo_index.html`"
              target="_blank"
              class="btn btn-secondary btn-sm"
              style="text-decoration: none;"
              title="在新窗口查看生成的离线包预览页"
            >
              🔍 预览离线包 Demo
            </a>
            <button class="btn btn-secondary btn-sm" @click="copySymbolScriptTag">
              📋 复制在线 JS
            </button>
            <button class="btn btn-secondary btn-sm" @click="showSymbolGuideModal = true">
              📖 接入说明
            </button>
          </div>
        </div>

        <!-- 全局预览控制工具栏 -->
        <div class="toolbar">
          <div class="toolbar-group">
            <div class="segmented">
              <button :class="{ active: filterType === 'all' }" @click="filterType = 'all'">
                全部 ({{ filteredIcons.length }})
              </button>
              <button :class="{ active: filterType === 'svg' }" @click="filterType = 'svg'">
                SVG 矢量
              </button>
              <button :class="{ active: filterType === 'raster' }" @click="filterType = 'raster'">
                PNG / 位图
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12.5px; color: var(--text-secondary);">画布:</span>
              <div class="segmented">
                <button :class="{ active: globalCanvasBg === 'checkerboard' }" @click="globalCanvasBg = 'checkerboard'">
                  棋盘格
                </button>
                <button :class="{ active: globalCanvasBg === 'light' }" @click="globalCanvasBg = 'light'">
                  浅色
                </button>
                <button :class="{ active: globalCanvasBg === 'dark' }" @click="globalCanvasBg = 'dark'">
                  深色
                </button>
              </div>
            </div>
          </div>

          <div class="toolbar-group">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12.5px; color: var(--text-secondary);">预览颜色:</span>
              <button
                v-for="c in quickColors"
                :key="c"
                type="button"
                class="color-dot"
                :class="{ active: globalColor.toLowerCase() === c.toLowerCase() }"
                :style="{ backgroundColor: c }"
                @click="globalColor = c"
              ></button>
              <input
                type="color"
                v-model="globalColor"
                style="width: 24px; height: 24px; border: none; background: none; cursor: pointer;"
                title="自定义全局预览色"
              />
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12.5px; color: var(--text-secondary);">大小: {{ globalSize }}px</span>
              <input
                type="range"
                min="20"
                max="64"
                step="4"
                v-model.number="globalSize"
                style="width: 80px; cursor: pointer;"
              />
            </div>
          </div>
        </div>

        <!-- 图标网格列表 -->
        <div v-if="filteredIcons.length > 0" class="icon-grid">
          <div
            v-for="icon in filteredIcons"
            :key="icon.id"
            class="icon-card"
            @click="selectedIcon = icon"
          >
            <div class="icon-preview-box" :class="globalBgClass">
              <span class="icon-type-tag">
                {{
                  icon.type === 'svg'
                    ? icon.isColorStripped
                      ? 'SVG'
                      : 'SVG 多色'
                    : icon.format?.toUpperCase()
                }}
              </span>

              <div
                v-if="icon.type === 'svg'"
                class="icon-svg-render"
                :style="{
                  width: globalSize + 'px',
                  height: globalSize + 'px',
                  color: globalColor
                }"
                v-html="icon.svgContent"
              ></div>

              <img
                v-else
                :src="icon.fileUrl"
                :alt="icon.name"
                class="icon-raster-img"
                :style="{
                  width: globalSize + 'px',
                  height: globalSize + 'px'
                }"
              />

              <!-- Hover 快捷操作浮层 -->
              <div class="icon-hover-actions" @click.stop>
                <button
                  v-if="icon.type === 'svg'"
                  class="hover-btn"
                  @click="quickCopyFontClass(icon)"
                >
                  📋 复制 .{{ icon.symbolId }}
                </button>
                <button
                  v-else
                  class="hover-btn"
                  @click="quickCopyFileUrl(icon)"
                >
                  📋 复制图片链接
                </button>

                <button
                  v-if="icon.type === 'svg'"
                  class="hover-btn"
                  @click="quickCopySymbol(icon)"
                >
                  🔗 复制 #{{ icon.symbolId }}
                </button>

                <button class="hover-btn" @click="selectedIcon = icon">
                  🎨 改色 / 导出 PNG
                </button>
              </div>
            </div>

            <div class="icon-meta">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <div class="icon-name" :title="icon.name">{{ icon.name }}</div>
                <span
                  v-if="icon.unicode"
                  style="font-size: 10.5px; color: var(--text-muted); font-family: monospace;"
                >
                  \{{ icon.unicode }}
                </span>
              </div>
              <div class="icon-code" :title="`.${icon.symbolId}`">.{{ icon.symbolId }}</div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-else
          style="background: #ffffff; border: 1px dashed var(--border); border-radius: 12px; padding: 60px 20px; text-align: center;"
        >
          <div style="font-size: 36px; margin-bottom: 10px;">🗂️</div>
          <div style="font-size: 16px; font-weight: 600;">暂无匹配的图标资源</div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 16px;">
            你可以切换分组筛选，或点击右上角“上传图标”批量导入 SVG / PNG
          </div>
          <button class="btn btn-primary" @click="requestProtectedAction(() => (showUploadModal = true))">
            📤 立即上传图标
          </button>
        </div>
      </main>
    </div>

    <!-- 1. 操作密码验证弹窗 -->
    <div v-if="showAuthModal" class="modal-backdrop" @click.self="closeAuthModal">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <div class="modal-title">🔐 管理员操作鉴权</div>
          <button class="btn btn-ghost btn-sm" @click="closeAuthModal">✕</button>
        </div>
        <form @submit.prevent="submitPasswordVerify">
          <div class="modal-body">
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">
              日常浏览、搜索与下载无需密码。执行<strong>上传、新建分组、编辑或删除</strong>需验证管理密码（配置于项目根目录 <code>.env</code> 的 <code>ADMIN_PASSWORD</code>）。
            </p>
            <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px;">
              管理密码
            </label>
            <input
              v-model="passwordInput"
              type="password"
              class="input"
              placeholder="请输入管理密码（默认: admin123）"
              autofocus
            />
            <div v-if="authError" style="color: var(--danger); font-size: 12.5px; margin-top: 8px;">
              ⚠️ {{ authError }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeAuthModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="verifyingAuth">
              {{ verifyingAuth ? '验证中...' : '解锁并继续' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. 新建项目分组弹窗 -->
    <div v-if="showNewProjectModal" class="modal-backdrop" @click.self="showNewProjectModal = false">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <div class="modal-title">📁 新建项目分组（自动生成独立 Iconfont 离线包）</div>
          <button class="btn btn-ghost btn-sm" @click="showNewProjectModal = false">✕</button>
        </div>
        <form @submit.prevent="submitCreateProject">
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 4px;">
                项目名称 *
              </label>
              <input v-model="newProjectForm.name" class="input" placeholder="例如: 商城小程序图标库" required />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 4px;">
                  英文标识 (用于包目录名) *
                </label>
                <input
                  v-model="newProjectForm.code"
                  class="input"
                  style="font-family: monospace;"
                  placeholder="例如: mall"
                  required
                />
              </div>
              <div>
                <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 4px;">
                  Class / Symbol 前缀
                </label>
                <input
                  v-model="newProjectForm.prefix"
                  class="input"
                  style="font-family: monospace;"
                  placeholder="例如: icon-"
                />
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 4px;">
                项目备注说明
              </label>
              <input v-model="newProjectForm.description" class="input" placeholder="简述该项目图标用途..." />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showNewProjectModal = false">取消</button>
            <button type="submit" class="btn btn-primary">创建项目</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. 批量上传与预处理弹窗 -->
    <UploadModal
      v-if="showUploadModal"
      :projects="projects"
      :initial-project-id="activeProjectId"
      :auth-token="authToken"
      @close="showUploadModal = false"
      @uploaded="onBatchUploaded"
      @require-auth="onRequireReAuth"
    />

    <!-- 4. 图标详情与改色导出弹窗 -->
    <IconDetailModal
      v-if="selectedIcon"
      :icon="selectedIcon"
      :projects="projects"
      :initial-color="globalColor"
      :initial-size="64"
      :auth-token="authToken"
      @close="selectedIcon = null"
      @updated="onIconUpdated"
      @deleted="onIconDeleted"
      @toast="showToast"
      @require-auth="onRequireReAuth"
    />

    <!-- 5. 本地离线包与在线接入指南弹窗 -->
    <SymbolGuideModal
      v-if="showSymbolGuideModal"
      :project-code="currentProjectCode"
      :project-prefix="currentProject ? currentProject.prefix : 'icon-'"
      :symbol-js-url="currentSymbolJsUrl"
      @close="showSymbolGuideModal = false"
      @toast="showToast"
    />

    <!-- 轻提示 Toast -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" class="toast">
        <span>✅</span>
        <span>{{ t.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import UploadModal from './components/UploadModal.vue'
import IconDetailModal from './components/IconDetailModal.vue'
import SymbolGuideModal from './components/SymbolGuideModal.vue'
import { copyText } from './utils/iconExport.js'

const TOKEN_STORAGE_KEY = 'iconhub_admin_token'

const projects = ref([])
const icons = ref([])
const totalIconsCount = ref(0)
const activeProjectId = ref('all')
const searchQuery = ref('')
const filterType = ref('all')

const globalCanvasBg = ref('checkerboard')
const globalColor = ref('#1e293b')
const globalSize = ref(36)
const quickColors = ['#1E293B', '#4F46E5', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#FFFFFF']

const authToken = ref(localStorage.getItem(TOKEN_STORAGE_KEY) || '')
const isAuthenticated = ref(false)
const showAuthModal = ref(false)
const passwordInput = ref('')
const authError = ref('')
const verifyingAuth = ref(false)
let pendingProtectedCallback = null

const showUploadModal = ref(false)
const showNewProjectModal = ref(false)
const showSymbolGuideModal = ref(false)
const selectedIcon = ref(null)

const newProjectForm = reactive({
  name: '',
  code: '',
  prefix: '',
  description: ''
})

const toasts = ref([])
function showToast(message) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, message })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2600)
}

const origin = computed(() => window.location.origin)

const currentProject = computed(() => {
  if (activeProjectId.value === 'all') return null
  return projects.value.find((p) => p.id === activeProjectId.value) || null
})

const currentProjectCode = computed(() => {
  return currentProject.value ? currentProject.value.code : 'all'
})

const currentSymbolJsUrl = computed(() => {
  return `/symbols/${currentProjectCode.value}.js`
})

const globalBgClass = computed(() => {
  if (globalCanvasBg.value === 'dark') return 'canvas-dark'
  if (globalCanvasBg.value === 'light') return 'canvas-light'
  return 'canvas-checkerboard'
})

const filteredIcons = computed(() => {
  let list = icons.value
  if (activeProjectId.value !== 'all') {
    list = list.filter((i) => i.projectId === activeProjectId.value)
  }
  if (filterType.value === 'svg') {
    list = list.filter((i) => i.type === 'svg')
  } else if (filterType.value === 'raster') {
    list = list.filter((i) => i.type !== 'svg')
  }
  const kw = searchQuery.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(kw) ||
        i.code.toLowerCase().includes(kw) ||
        i.symbolId.toLowerCase().includes(kw) ||
        (i.unicode && i.unicode.toLowerCase().includes(kw)) ||
        (i.tags || []).some((t) => String(t).toLowerCase().includes(kw))
    )
  }
  return list
})

async function fetchAllData() {
  const [projRes, iconRes] = await Promise.all([
    fetch('/api/projects'),
    fetch('/api/icons')
  ])
  const projData = await projRes.json()
  const iconData = await iconRes.json()

  projects.value = projData.projects || []
  totalIconsCount.value = projData.totalIcons || 0
  icons.value = iconData.icons || []
}

async function checkAuthStatus() {
  if (!authToken.value) {
    isAuthenticated.value = false
    return
  }
  try {
    const res = await fetch('/api/auth/status', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    const data = await res.json()
    isAuthenticated.value = Boolean(data.authenticated)
    if (!isAuthenticated.value) {
      authToken.value = ''
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    isAuthenticated.value = false
  }
}

function requestProtectedAction(actionFn) {
  if (isAuthenticated.value && authToken.value) {
    actionFn()
  } else {
    pendingProtectedCallback = actionFn
    passwordInput.value = ''
    authError.value = ''
    showAuthModal.value = true
  }
}

function handleAuthButtonClick() {
  if (isAuthenticated.value) {
    authToken.value = ''
    isAuthenticated.value = false
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    showToast('已退出管理员解锁状态')
  } else {
    pendingProtectedCallback = null
    passwordInput.value = ''
    authError.value = ''
    showAuthModal.value = true
  }
}

function closeAuthModal() {
  showAuthModal.value = false
  pendingProtectedCallback = null
}

async function submitPasswordVerify() {
  verifyingAuth.value = true
  authError.value = ''
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      authError.value = data.error || '密码错误'
      return
    }
    authToken.value = data.token
    isAuthenticated.value = true
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    showAuthModal.value = false
    showToast('管理员权限已解锁')
    if (typeof pendingProtectedCallback === 'function') {
      const fn = pendingProtectedCallback
      pendingProtectedCallback = null
      fn()
    }
  } catch {
    authError.value = '网络请求失败，请重试'
  } finally {
    verifyingAuth.value = false
  }
}

function onRequireReAuth() {
  isAuthenticated.value = false
  authToken.value = ''
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  showAuthModal.value = true
}

async function submitCreateProject() {
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify(newProjectForm)
    })
    if (res.status === 401) {
      onRequireReAuth()
      return
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '创建失败')
    await fetchAllData()
    activeProjectId.value = data.project.id
    showNewProjectModal.value = false
    newProjectForm.name = ''
    newProjectForm.code = ''
    newProjectForm.prefix = ''
    newProjectForm.description = ''
    showToast(`已创建项目「${data.project.name}」并生成 7 件套离线包`)
  } catch (err) {
    showToast(err.message || '创建项目失败')
  }
}

async function handleDeleteProject(project) {
  if (!window.confirm(`确定要删除项目「${project.name}」吗？其下图标将自动归入默认分组。`)) {
    return
  }
  try {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    if (res.status === 401) {
      onRequireReAuth()
      return
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '删除失败')
    activeProjectId.value = 'all'
    await fetchAllData()
    showToast(`已删除项目「${project.name}」`)
  } catch (err) {
    showToast(err.message || '删除项目失败')
  }
}

async function onBatchUploaded({ count, projectId }) {
  showUploadModal.value = false
  activeProjectId.value = projectId
  await fetchAllData()
  showToast(`成功上传 ${count} 个图标，SQLite 与 Iconfont 离线包已同步更新`)
}

async function onIconUpdated(updatedIcon) {
  selectedIcon.value = updatedIcon
  await fetchAllData()
}

async function onIconDeleted() {
  selectedIcon.value = null
  await fetchAllData()
}

async function quickCopyFontClass(icon) {
  await copyText(`<i class="iconfont ${icon.symbolId}"></i>`)
  showToast(`已复制 Font-Class 标签: <i class="iconfont ${icon.symbolId}"></i>`)
}

async function quickCopyFileUrl(icon) {
  await copyText(`${origin.value}${icon.fileUrl}`)
  showToast(`已复制「${icon.name}」在线直链`)
}

async function quickCopySymbol(icon) {
  const tag = `<svg class="icon" aria-hidden="true"><use href="#${icon.symbolId}"></use></svg>`
  await copyText(tag)
  showToast(`已复制 #${icon.symbolId} Symbol 标签`)
}

async function copySymbolScriptTag() {
  await copyText(`<script src="${origin.value}${currentSymbolJsUrl.value}"><\/script>`)
  showToast('已复制项目在线 Symbol <script> 标签')
}

onMounted(async () => {
  await Promise.all([fetchAllData(), checkAuthStatus()])
})
</script>
