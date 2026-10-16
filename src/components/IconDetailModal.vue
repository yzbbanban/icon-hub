<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card" style="max-width: 820px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="modal-title">{{ icon.name }}</span>
          <span class="badge" style="font-family: monospace;">#{{ icon.symbolId }}</span>
          <span class="badge">{{ icon.format?.toUpperCase() || 'SVG' }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕ 关闭</button>
      </div>

      <div class="modal-body">
        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px;">
          <!-- 左侧：实时画布预览与背景切换 -->
          <div>
            <div
              :class="bgClass"
              style="height: 230px; border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden;"
            >
              <div
                v-if="icon.type === 'svg'"
                class="icon-svg-render"
                :style="{
                  width: Math.min(previewSize, 160) + 'px',
                  height: Math.min(previewSize, 160) + 'px',
                  color: previewColor
                }"
                v-html="icon.svgContent"
              ></div>
              <img
                v-else
                :src="icon.fileUrl"
                :alt="icon.name"
                :style="{
                  maxWidth: Math.min(previewSize, 160) + 'px',
                  maxHeight: Math.min(previewSize, 160) + 'px',
                  objectFit: 'contain'
                }"
              />

              <div
                style="position: absolute; bottom: 8px; right: 10px; font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.85); padding: 2px 6px; border-radius: 4px;"
              >
                导出尺寸: {{ previewSize }} × {{ previewSize }} px
              </div>
            </div>

            <!-- 画布背景切换 -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
              <span style="font-size: 12px; color: var(--text-secondary);">预览背景</span>
              <div class="segmented">
                <button :class="{ active: canvasBg === 'checkerboard' }" @click="canvasBg = 'checkerboard'">棋盘格</button>
                <button :class="{ active: canvasBg === 'light' }" @click="canvasBg = 'light'">浅色</button>
                <button :class="{ active: canvasBg === 'dark' }" @click="canvasBg = 'dark'">深色</button>
              </div>
            </div>
          </div>

          <!-- 右侧：定制颜色、尺寸与一键复制/下载 -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- 颜色选择器（仅针对去色 SVG 生效，多色 SVG/PNG 提示保留原色） -->
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <label style="font-size: 13px; font-weight: 600;">定制颜色</label>
                <span v-if="icon.type === 'svg' && !icon.isColorStripped" style="font-size: 12px; color: var(--text-muted);">
                  当前为多色保留模式（可在下方管理区切换为单色去色）
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <button
                  v-for="c in presetColors"
                  :key="c"
                  type="button"
                  class="color-dot"
                  :class="{ active: previewColor.toLowerCase() === c.toLowerCase() }"
                  :style="{ backgroundColor: c }"
                  @click="previewColor = c"
                ></button>
                <input
                  type="color"
                  v-model="previewColor"
                  style="width: 28px; height: 28px; border: none; background: none; cursor: pointer;"
                />
                <input
                  v-model="previewColor"
                  class="input"
                  style="width: 100px; padding: 4px 8px; font-family: monospace; font-size: 12.5px;"
                />
              </div>
            </div>

            <!-- 导出尺寸选择 -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
                定制尺寸 (px)
              </label>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button
                  v-for="sz in presetSizes"
                  :key="sz"
                  type="button"
                  class="btn btn-sm"
                  :class="previewSize === sz ? 'btn-primary' : 'btn-secondary'"
                  @click="previewSize = sz"
                >
                  {{ sz }}px
                </button>
                <input
                  type="number"
                  v-model.number="previewSize"
                  min="8"
                  max="1024"
                  class="input"
                  style="width: 82px; padding: 4px 8px;"
                />
              </div>
            </div>

            <!-- 快捷复制与下载按钮组 -->
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
                开发与设计快捷消费
              </label>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                <button class="btn btn-primary" @click="handleDownloadPng">
                  ⬇️ 下载 PNG ({{ previewSize }}px)
                </button>
                <button
                  v-if="icon.type === 'svg'"
                  class="btn btn-secondary"
                  @click="handleDownloadSvg"
                >
                  ⬇️ 下载 SVG 源文件
                </button>
                <button
                  v-else
                  class="btn btn-secondary"
                  @click="handleDownloadOriginalFile"
                >
                  ⬇️ 下载原始 {{ icon.format?.toUpperCase() }}
                </button>

                <button
                  v-if="icon.type === 'svg'"
                  class="btn btn-secondary"
                  @click="handleCopySvgCode(false)"
                >
                  📋 复制 SVG 源码 (带当前色)
                </button>
                <button
                  v-if="icon.type === 'svg'"
                  class="btn btn-secondary"
                  @click="handleCopySymbolTag"
                >
                  🔗 复制 Symbol &lt;use&gt; 代码
                </button>
                <button class="btn btn-secondary" @click="handleCopyVueSnippet">
                  💚 复制 Vue 3 调用代码
                </button>
                <button class="btn btn-secondary" @click="handleCopyBase64">
                  🧬 复制 Base64 (DataURL)
                </button>
              </div>
            </div>

            <!-- 代码预览条 -->
            <div class="symbol-code-box" style="justify-content: space-between;">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                &lt;svg class="icon" aria-hidden="true"&gt;&lt;use href="#{{ icon.symbolId }}"&gt;&lt;/use&gt;&lt;/svg&gt;
              </span>
              <button class="btn btn-ghost btn-sm" @click="handleCopySymbolTag">复制</button>
            </div>
          </div>
        </div>

        <!-- 管理员编辑区（需要密码解锁） -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 13.5px; font-weight: 600;">
              ⚙️ 图标属性与管理（需操作鉴权）
            </span>
            <label
              v-if="icon.type === 'svg'"
              style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; cursor: pointer;"
            >
              <input type="checkbox" v-model="editForm.isColorStripped" />
              <span>单色去色模式（自动转为 currentColor）</span>
            </label>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12px; color: var(--text-secondary);">图标名称</label>
              <input v-model="editForm.name" class="input" style="margin-top: 4px;" />
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-secondary);">图标代码 (Code)</label>
              <input v-model="editForm.code" class="input" style="margin-top: 4px; font-family: monospace;" />
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-secondary);">所属项目</label>
              <select v-model="editForm.projectId" class="input" style="margin-top: 4px;">
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label style="font-size: 12px; color: var(--text-secondary);">标签 (逗号分隔)</label>
              <input v-model="editForm.tagsText" class="input" style="margin-top: 4px;" />
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px;">
            <button class="btn btn-danger btn-sm" @click="handleDeleteIcon">
              🗑 删除此图标
            </button>
            <button class="btn btn-primary btn-sm" :disabled="saving" @click="handleSaveMeta">
              {{ saving ? '保存中...' : '💾 保存修改并更新 Symbol' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import {
  copyText,
  buildColoredSvg,
  renderIconToPngDataUrl,
  triggerDataUrlDownload,
  triggerTextDownload
} from '../utils/iconExport.js'

const props = defineProps({
  icon: { type: Object, required: true },
  projects: { type: Array, required: true },
  initialColor: { type: String, default: '#1e293b' },
  initialSize: { type: Number, default: 64 },
  authToken: { type: String, default: '' }
})

const emit = defineEmits(['close', 'updated', 'deleted', 'toast', 'require-auth'])

const canvasBg = ref('checkerboard')
const previewColor = ref(props.initialColor || '#1e293b')
const previewSize = ref(props.initialSize || 64)
const saving = ref(false)

const presetColors = [
  '#1E293B',
  '#4F46E5',
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#FFFFFF'
]
const presetSizes = [16, 24, 32, 48, 64, 128, 256]

const editForm = reactive({
  name: props.icon.name,
  code: props.icon.code,
  projectId: props.icon.projectId,
  tagsText: (props.icon.tags || []).join(', '),
  isColorStripped: Boolean(props.icon.isColorStripped)
})

const bgClass = computed(() => {
  if (canvasBg.value === 'dark') return 'canvas-dark'
  if (canvasBg.value === 'light') return 'canvas-light'
  return 'canvas-checkerboard'
})

async function handleCopySvgCode(useCurrentColor = false) {
  const svg = buildColoredSvg(props.icon.svgContent, {
    color: previewColor.value,
    size: previewSize.value,
    useCurrentColor
  })
  await copyText(svg)
  emit('toast', `已复制「${props.icon.name}」的 SVG 源码`)
}

async function handleCopySymbolTag() {
  const code = `<svg class="icon" aria-hidden="true"><use href="#${props.icon.symbolId}"></use></svg>`
  await copyText(code)
  emit('toast', `已复制 Symbol 标签 #${props.icon.symbolId}`)
}

async function handleCopyVueSnippet() {
  if (props.icon.type === 'svg') {
    const snippet = `<svg class="icon" style="width: ${previewSize.value}px; height: ${previewSize.value}px; color: ${previewColor.value};" aria-hidden="true"><use href="#${props.icon.symbolId}" /></svg>`
    await copyText(snippet)
  } else {
    const url = `${window.location.origin}${props.icon.fileUrl}`
    await copyText(`<img src="${url}" alt="${props.icon.name}" width="${previewSize.value}" height="${previewSize.value}" />`)
  }
  emit('toast', '已复制 Vue 3 组件调用代码')
}

async function handleCopyBase64() {
  try {
    if (props.icon.type === 'svg') {
      const svg = buildColoredSvg(props.icon.svgContent, {
        color: previewColor.value,
        size: previewSize.value
      })
      const base64 = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
      await copyText(base64)
      emit('toast', '已复制 SVG DataURL (Base64)')
    } else {
      const pngDataUrl = await renderIconToPngDataUrl({
        icon: props.icon,
        color: previewColor.value,
        size: previewSize.value
      })
      await copyText(pngDataUrl)
      emit('toast', '已复制 PNG DataURL (Base64)')
    }
  } catch (err) {
    emit('toast', err.message || '复制失败')
  }
}

async function handleDownloadPng() {
  try {
    const pngDataUrl = await renderIconToPngDataUrl({
      icon: props.icon,
      color: previewColor.value,
      size: previewSize.value
    })
    triggerDataUrlDownload(pngDataUrl, `${props.icon.code}-${previewSize.value}px.png`)
    emit('toast', `已导出 ${props.icon.code}-${previewSize.value}px.png`)
  } catch (err) {
    emit('toast', err.message || 'PNG 导出失败')
  }
}

function handleDownloadSvg() {
  const svg = buildColoredSvg(props.icon.svgContent, {
    color: previewColor.value,
    size: previewSize.value,
    useCurrentColor: false
  })
  triggerTextDownload(svg, `${props.icon.code}.svg`)
  emit('toast', `已下载 ${props.icon.code}.svg`)
}

function handleDownloadOriginalFile() {
  triggerDataUrlDownload(props.icon.fileUrl, `${props.icon.code}.${props.icon.format || 'png'}`)
}

async function handleSaveMeta() {
  saving.value = true
  try {
    const tags = editForm.tagsText
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)

    const res = await fetch(`/api/icons/${props.icon.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${props.authToken}`
      },
      body: JSON.stringify({
        name: editForm.name,
        code: editForm.code,
        projectId: editForm.projectId,
        tags,
        isColorStripped: editForm.isColorStripped
      })
    })
    if (res.status === 401) {
      emit('require-auth')
      return
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '更新失败')
    emit('updated', data.icon)
    emit('toast', '图标属性已更新，对应项目 Symbol JS 已自动重新生成')
  } catch (err) {
    emit('toast', err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteIcon() {
  try {
    const res = await fetch(`/api/icons/${props.icon.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${props.authToken}`
      }
    })
    if (res.status === 401) {
      emit('require-auth')
      return
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '删除失败')
    emit('deleted', props.icon.id)
    emit('toast', `已删除图标「${props.icon.name}」`)
  } catch (err) {
    emit('toast', err.message || '删除失败')
  }
}
</script>
