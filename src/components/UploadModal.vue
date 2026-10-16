<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card" style="max-width: 900px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">上传图标 / 导入阿里 Iconfont 项目包 (iconfont.js + iconfont.json)</div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
            支持直接拖入 <code>iconfont.js</code> 与 <code>iconfont.json</code> 批量还原并显示全部 SVG 图标，也支持单文件 SVG / PNG / WebP 上传
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕ 关闭</button>
      </div>

      <div class="modal-body">
        <!-- 顶部配置行：选择目标项目 + 批量处理策略 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div>
            <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px;">
              归属项目分组
            </label>
            <select v-model="targetProjectId" class="input" :disabled="useImportedProjectMeta && Boolean(importedProjectMeta?.name)">
              <option v-for="proj in projects" :key="proj.id" :value="proj.id">
                {{ proj.name }} ({{ proj.prefix }}*)
              </option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px;">
              SVG 颜色预处理（多色图标自动保留原色）
            </label>
            <div class="segmented" style="width: 100%;">
              <button
                type="button"
                style="flex: 1;"
                :class="{ active: defaultStripColor }"
                @click="setAllStripColor(true)"
              >
                去色 (单色可改色)
              </button>
              <button
                type="button"
                style="flex: 1;"
                :class="{ active: !defaultStripColor }"
                @click="setAllStripColor(false)"
              >
                保留原色 (多色)
              </button>
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px;">
              批量打标签（逗号分隔，可选）
            </label>
            <input
              v-model="batchTagsInput"
              class="input"
              placeholder="例如: 官网, 常用, v1"
              @change="applyBatchTags"
            />
          </div>
        </div>

        <!-- 识别到 iconfont.json 项目信息时的提示横幅 -->
        <div
          v-if="importedProjectMeta && (importedProjectMeta.name || importedProjectMeta.id)"
          style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;"
        >
          <div style="font-size: 13px;">
            <span style="font-weight: 700; color: var(--primary);">
              ✨ 已识别阿里 Iconfont 项目配置：
            </span>
            <span>
              项目名 <strong>{{ importedProjectMeta.name || '未命名' }}</strong>
              (ID: <code>{{ importedProjectMeta.id || '-' }}</code>，前缀: <code>{{ importedProjectMeta.css_prefix_text || 'icon-' }}</code>)
            </span>
          </div>
          <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--primary);">
            <input type="checkbox" v-model="useImportedProjectMeta" />
            <span>自动创建/归入同名项目分组「{{ importedProjectMeta.name }}」</span>
          </label>
        </div>

        <!-- 拖拽上传区域 -->
        <div
          class="dropzone"
          :class="{ dragover: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDropFiles"
          @click="triggerFileSelect"
        >
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept=".js,.json,.svg,.png,.webp,.jpg,.jpeg,.gif,application/javascript,application/json,image/svg+xml,image/png,image/webp,image/jpeg"
            style="display: none;"
            @change="onFileInputChange"
          />
          <div style="font-size: 28px; margin-bottom: 6px;">📥</div>
          <div style="font-weight: 600; font-size: 15px; color: var(--text-main);">
            点击选择或拖拽 <code>iconfont.js</code> + <code>iconfont.json</code>（或普通 SVG / PNG 文件）到此处
          </div>
          <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
            同时选中或先后拖入 <code>iconfont.js</code> 与 <code>iconfont.json</code>，系统会自动关联图标名称、类名、Unicode 并实时渲染 SVG 预览
          </div>
        </div>

        <!-- 待上传图标预览与编辑列表 -->
        <div v-if="pendingItems.length > 0" style="margin-top: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-weight: 600; font-size: 14px;">
              待入库 SVG / 图片预览列表（共 {{ pendingItems.length }} 个图标）
            </span>
            <button class="btn btn-ghost btn-sm" @click="clearAll">清空列表</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(255px, 1fr)); gap: 12px; max-height: 380px; overflow-y: auto; padding-right: 4px;">
            <div
              v-for="(item, idx) in pendingItems"
              :key="item.tempId"
              style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; gap: 12px; align-items: center; background: #fff;"
            >
              <!-- 缩略图实时 SVG 预览 -->
              <div
                class="canvas-checkerboard"
                style="width: 64px; height: 64px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 10px;"
              >
                <div
                  v-if="item.type === 'svg'"
                  class="icon-svg-render"
                  style="width: 40px; height: 40px; color: #1e293b;"
                  v-html="item.previewSvg"
                ></div>
                <img
                  v-else
                  :src="item.dataUrl"
                  :alt="item.name"
                  style="max-width: 44px; max-height: 44px; object-fit: contain;"
                />
              </div>

              <!-- 属性编辑 -->
              <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <input
                    v-model="item.name"
                    class="input"
                    style="padding: 4px 8px; font-size: 13px; flex: 1;"
                    placeholder="图标显示名称"
                  />
                  <span
                    v-if="item.unicode"
                    style="font-size: 11px; color: var(--primary); background: #eef2ff; padding: 2px 5px; border-radius: 4px; font-family: monospace;"
                    title="原始 Unicode 编码"
                  >
                    \{{ item.unicode }}
                  </span>
                </div>

                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 11.5px; color: var(--text-muted); font-family: monospace;">
                    #{{ effectivePrefix }}
                  </span>
                  <input
                    v-model="item.code"
                    class="input"
                    style="padding: 3px 6px; font-size: 12px; font-family: monospace;"
                    placeholder="font_class"
                  />
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
                  <label
                    v-if="item.type === 'svg'"
                    style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-secondary);"
                  >
                    <input
                      type="checkbox"
                      v-model="item.isColorStripped"
                      @change="refreshSvgItemPreview(item)"
                    />
                    <span>去色 (单色)</span>
                  </label>
                  <span v-else style="color: var(--text-muted); font-size: 11px;">
                    {{ item.format.toUpperCase() }} {{ item.width }}×{{ item.height }}
                  </span>

                  <button
                    type="button"
                    style="border: none; background: none; color: var(--danger); cursor: pointer; font-size: 12px;"
                    @click="pendingItems.splice(idx, 1)"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="infoMsg" style="margin-top: 14px; color: var(--primary); font-size: 13px;">
          ℹ️ {{ infoMsg }}
        </div>
        <div v-if="errorMsg" style="margin-top: 14px; color: var(--danger); font-size: 13px;">
          ⚠️ {{ errorMsg }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          :disabled="pendingItems.length === 0 || submitting"
          @click="submitBatchUpload"
        >
          {{ submitting ? '正在入库并构建 7 件套离线包...' : `确认入库 (${pendingItems.length})` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
  initialProjectId: { type: String, default: '' },
  authToken: { type: String, default: '' }
})

const emit = defineEmits(['close', 'uploaded', 'require-auth'])

const targetProjectId = ref(
  props.initialProjectId && props.initialProjectId !== 'all'
    ? props.initialProjectId
    : (props.projects[0]?.id || 'proj_common')
)
const defaultStripColor = ref(true)
const batchTagsInput = ref('')
const isDragging = ref(false)
const fileInputRef = ref(null)
const pendingItems = ref([])
const submitting = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

// 缓存本次弹窗内拖入的 iconfont.js / iconfont.json / iconfont.svg 内容，支持同时拖入或分先后拖入自动合并
const cachedIconfontJs = ref('')
const cachedIconfontJson = ref('')
const cachedIconfontSvgFont = ref('')
const importedProjectMeta = ref(null)
const useImportedProjectMeta = ref(true)

const selectedProject = computed(() =>
  props.projects.find((p) => p.id === targetProjectId.value) || props.projects[0] || {}
)

const effectivePrefix = computed(() => {
  if (useImportedProjectMeta.value && importedProjectMeta.value?.css_prefix_text) {
    return importedProjectMeta.value.css_prefix_text
  }
  return selectedProject.value.prefix || 'icon-'
})

function clearAll() {
  pendingItems.value = []
  cachedIconfontJs.value = ''
  cachedIconfontJson.value = ''
  cachedIconfontSvgFont.value = ''
  importedProjectMeta.value = null
  errorMsg.value = ''
  infoMsg.value = ''
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function onFileInputChange(e) {
  const files = Array.from(e.target.files || [])
  handleFiles(files)
  e.target.value = ''
}

function onDropFiles(e) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  handleFiles(files)
}

function toCleanCode(filename) {
  return filename
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'icon'
}

async function refreshSvgItemPreview(item) {
  try {
    const res = await fetch('/api/icons/preview-svg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawSvg: item.rawSvg,
        stripColor: item.isColorStripped
      })
    })
    const data = await res.json()
    if (res.ok && data.svgContent) {
      item.previewSvg = data.svgContent
      item.width = data.width
      item.height = data.height
    }
  } catch {
    item.previewSvg = item.rawSvg
  }
}

async function setAllStripColor(val) {
  defaultStripColor.value = val
  for (const item of pendingItems.value) {
    if (item.type === 'svg' && !item.isMultiColor) {
      item.isColorStripped = val
      await refreshSvgItemPreview(item)
    }
  }
}

function applyBatchTags() {
  const tags = batchTagsInput.value
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  for (const item of pendingItems.value) {
    item.tags = Array.from(new Set([...(item.tags || []), ...tags]))
  }
}

async function parseCachedIconfontBundle() {
  const res = await fetch('/api/icons/parse-iconfont', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsText: cachedIconfontJs.value,
      jsonText: cachedIconfontJson.value,
      svgFontText: cachedIconfontSvgFont.value,
      defaultStripColor: defaultStripColor.value
    })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '解析 Iconfont 文件失败')
  }

  if (data.projectMeta && (data.projectMeta.name || data.projectMeta.id)) {
    importedProjectMeta.value = data.projectMeta
  }

  if (data.onlyJsonProvided) {
    infoMsg.value = `已读取 iconfont.json（共 ${data.jsonGlyphCount} 条图标元数据），请继续拖入对应的 iconfont.js（或 iconfont.svg）以提取并显示 SVG 矢量图形。`
    return
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    const extraTags = batchTagsInput.value
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)

    // 合并进 pendingItems（按 code 去重更新）
    const existingByCode = new Map(pendingItems.value.map((i) => [i.code, i]))
    for (const parsedItem of data.items) {
      parsedItem.tags = Array.from(new Set([...(parsedItem.tags || []), ...extraTags]))
      existingByCode.set(parsedItem.code, parsedItem)
    }
    pendingItems.value = Array.from(existingByCode.values())
    infoMsg.value = `成功从 Iconfont 文件中解析出 ${data.items.length} 个 SVG 图标，已在下方实时渲染预览！`
  }
}

async function handleFiles(files) {
  errorMsg.value = ''
  infoMsg.value = ''
  const extraTags = batchTagsInput.value
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  let hasIconfontBundleFile = false

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const baseName = file.name.replace(/\.[a-zA-Z0-9]+$/, '')
    const code = toCleanCode(file.name)
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    if (ext === 'js' || file.name.toLowerCase().includes('iconfont.js')) {
      cachedIconfontJs.value = await file.text()
      hasIconfontBundleFile = true
    } else if (ext === 'json' || file.name.toLowerCase().includes('iconfont.json')) {
      cachedIconfontJson.value = await file.text()
      hasIconfontBundleFile = true
    } else if (ext === 'svg' || file.type === 'image/svg+xml') {
      const rawText = await file.text()
      // 判断是否是 iconfont.svg 字体文件（包含 <font> 与 <glyph> 标签）
      if (/<font\b[\s\S]*?<glyph\b/i.test(rawText)) {
        cachedIconfontSvgFont.value = rawText
        hasIconfontBundleFile = true
      } else {
        const item = {
          tempId,
          name: baseName,
          code,
          type: 'svg',
          format: 'svg',
          rawSvg: rawText,
          previewSvg: rawText,
          isColorStripped: defaultStripColor.value,
          width: 24,
          height: 24,
          tags: [...extraTags]
        }
        await refreshSvgItemPreview(item)
        pendingItems.value.push(item)
      }
    } else if (['png', 'webp', 'jpg', 'jpeg', 'gif', 'avif'].includes(ext) || file.type.startsWith('image/')) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
      const dims = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth || 128, height: img.naturalHeight || 128 })
        img.onerror = () => resolve({ width: 128, height: 128 })
        img.src = dataUrl
      })
      pendingItems.value.push({
        tempId,
        name: baseName,
        code,
        type: 'raster',
        format: ext.replace('jpeg', 'jpg') || 'png',
        dataUrl,
        isColorStripped: false,
        width: dims.width,
        height: dims.height,
        tags: [...extraTags]
      })
    }
  }

  if (hasIconfontBundleFile) {
    try {
      await parseCachedIconfontBundle()
    } catch (err) {
      errorMsg.value = err.message || '解析 Iconfont 文件失败'
    }
  }
}

async function submitBatchUpload() {
  if (pendingItems.value.length === 0) return
  submitting.value = true
  errorMsg.value = ''

  try {
    const payload = {
      projectId: targetProjectId.value,
      items: pendingItems.value
    }

    if (useImportedProjectMeta.value && importedProjectMeta.value?.name) {
      payload.autoProject = {
        id: importedProjectMeta.value.id,
        name: importedProjectMeta.value.name,
        code: importedProjectMeta.value.name,
        prefix: importedProjectMeta.value.css_prefix_text || 'icon-',
        description: importedProjectMeta.value.description || '从 Iconfont 导入的项目分组'
      }
    }

    const res = await fetch('/api/icons/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${props.authToken}`
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.status === 401) {
      emit('require-auth')
      return
    }
    if (!res.ok) {
      throw new Error(data.error || '上传失败')
    }
    emit('uploaded', {
      count: data.count,
      projectId: data.projectId || targetProjectId.value,
      symbolJsUrl: data.symbolJsUrl
    })
  } catch (err) {
    errorMsg.value = err.message || '上传失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>
