<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card" style="max-width: 800px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">📦 Iconfont 本地离线包与在线接入指南</div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
            系统每次上传或修改图标后，会自动构建完整的 7 件套字体与 Symbol 资产包
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕ 关闭</button>
      </div>

      <div class="modal-body" style="display: flex; flex-direction: column; gap: 18px;">
        <!-- 方式一：下载至本地（7件套目录结构） -->
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-weight: 700; font-size: 14.5px; color: var(--primary);">
              方式一：下载至本地（与阿里 Iconfont 解压结构完全一致，放入项目即可用）
            </span>
            <div style="display: flex; gap: 8px;">
              <a
                :href="`/packages/${projectCode}/iconfont/demo_index.html`"
                target="_blank"
                class="btn btn-secondary btn-sm"
                style="text-decoration: none;"
              >
                🔍 预览 demo_index.html
              </a>
              <a
                :href="`/api/projects/${projectCode}/download-package`"
                class="btn btn-primary btn-sm"
                style="text-decoration: none;"
              >
                ⬇️ 下载至本地 (iconfont.zip)
              </a>
            </div>
          </div>

          <pre
            style="background: #0f172a; color: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 12.5px; overflow-x: auto; line-height: 1.6;"
          ><code>iconfont/
├── iconfont.css     # @font-face 声明与 .{{ projectPrefix }}xxx:before 样式
├── iconfont.js      # SVG Symbol Sprite 脚本（支持多色与 <use href="#..." />）
├── iconfont.json    # 图标元数据列表（含 icon_id / font_class / unicode / unicode_decimal）
├── iconfont.svg     # SVG 1.1 矢量字体文件
├── iconfont.ttf     # TrueType 标准字体文件
├── iconfont.woff    # Web 开放字体格式 (WOFF)
├── iconfont.woff2   # Web 开放字体格式 2.0 (WOFF2 高压缩)
└── demo_index.html  # 本地离线示例预览页</code></pre>

          <div style="margin-top: 10px; font-size: 12.5px; color: var(--text-secondary);">
            <strong>使用方法：</strong>解压后将 <code>iconfont</code> 文件夹复制到前端工程（如 <code>src/assets/iconfont/</code>），在 <code>main.js</code> 中引入 <code>import '@/assets/iconfont/iconfont.css'</code> 或 <code>import '@/assets/iconfont/iconfont.js'</code> 即可直接使用。
          </div>
        </div>

        <!-- 方式二：Font-Class 调用示例 -->
        <div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">
            方式二：Font-Class 引用（引入 <code>iconfont.css</code> 后使用）
          </div>
          <div class="symbol-code-box" style="justify-content: space-between;">
            <code>&lt;i class="iconfont {{ projectPrefix }}home"&gt;&lt;/i&gt;</code>
            <button class="btn btn-secondary btn-sm" @click="copyFontClassDemo">复制示例</button>
          </div>
        </div>

        <!-- 方式三：Symbol 在线/本地脚本 + Vue 3 组件 -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 600; font-size: 14px;">
              方式三：Symbol 引用（引入 <code>iconfont.js</code> 后配合 Vue 3 <code>&lt;SvgIcon /&gt;</code> 组件）
            </span>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" @click="copyScriptTag">复制在线 &lt;script&gt;</button>
              <button class="btn btn-secondary btn-sm" @click="copyVueComponent">复制 SvgIcon.vue</button>
            </div>
          </div>
          <pre
            style="background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 8px; font-size: 12.5px; overflow-x: auto;"
          ><code>{{ vueComponentCode }}</code></pre>
        </div>
      </div>

      <div class="modal-footer">
        <a
          :href="`/api/projects/${projectCode}/download-package`"
          class="btn btn-primary"
          style="text-decoration: none;"
        >
          ⬇️ 立即下载 iconfont.zip 本地包
        </a>
        <button class="btn btn-secondary" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { copyText } from '../utils/iconExport.js'

const props = defineProps({
  projectCode: { type: String, default: 'common' },
  projectPrefix: { type: String, default: 'icon-' },
  symbolJsUrl: { type: String, default: '/symbols/common.js' }
})

const emit = defineEmits(['close', 'toast'])

const origin = computed(() => window.location.origin)

const vueComponentCode = computed(
  () => `<template>
  <svg
    class="icon"
    aria-hidden="true"
    :style="{ width: sizePx, height: sizePx, color }"
  >
    <use :href="\`#${props.projectPrefix}\${name}\`" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import '@/assets/iconfont/iconfont.js' // 或在 index.html 引入在线脚本

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: 'currentColor' }
})

const sizePx = computed(() => (typeof props.size === 'number' ? \`\${props.size}px\` : props.size))
<\/script>

<style scoped>
.icon {
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>`
)

async function copyFontClassDemo() {
  await copyText(`<i class="iconfont ${props.projectPrefix}home"></i>`)
  emit('toast', '已复制 Font-Class 调用示例')
}

async function copyScriptTag() {
  await copyText(`<script src="${origin.value}${props.symbolJsUrl}"><\/script>`)
  emit('toast', '已复制在线 Symbol <script> 标签')
}

async function copyVueComponent() {
  await copyText(vueComponentCode.value)
  emit('toast', '已复制 SvgIcon.vue 组件源码')
}
</script>
