/**
 * 前端图标导出、改色、Canvas 转 PNG 与剪贴板工具
 */

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return true
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return true
}

/**
 * 将 SVG 文本注入指定颜色和宽高（用于复制带色 SVG 或 Canvas 渲染）
 */
export function buildColoredSvg(svgContent, { color = '#1e293b', size = 64, useCurrentColor = false } = {}) {
  if (!svgContent) return ''
  let output = svgContent.trim()

  const targetColor = useCurrentColor ? 'currentColor' : (color || '#1e293b')
  if (!useCurrentColor) {
    output = output.replace(/currentColor/g, targetColor)
  }

  // 在 <svg> 根标签注入 width 和 height
  output = output.replace(/<svg([^>]*)>/i, (match, attrs) => {
    const cleanedAttrs = attrs
      .replace(/\s+width=["'][^"']*["']/gi, '')
      .replace(/\s+height=["'][^"']*["']/gi, '')
      .replace(/\s+style=["'][^"']*["']/gi, '')
    return `<svg${cleanedAttrs} width="${size}" height="${size}" style="color: ${targetColor};">`
  })

  return output
}

/**
 * 将 SVG 或位图通过浏览器 Canvas 渲染为指定尺寸（及颜色）的 PNG DataURL
 */
export function renderIconToPngDataUrl({ icon, color = '#1e293b', size = 64 }) {
  return new Promise((resolve, reject) => {
    const targetSize = Math.max(8, Math.min(2048, Number(size) || 64))
    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')

    const img = new Image()
    img.crossOrigin = 'anonymous'

    let objectUrl = null
    img.onload = () => {
      ctx.clearRect(0, 0, targetSize, targetSize)
      ctx.drawImage(img, 0, 0, targetSize, targetSize)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      try {
        const pngDataUrl = canvas.toDataURL('image/png')
        resolve(pngDataUrl)
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('图标渲染为 PNG 失败'))
    }

    if (icon.type === 'svg' && icon.svgContent) {
      const coloredSvg = buildColoredSvg(icon.svgContent, {
        color: icon.isColorStripped ? color : undefined,
        size: targetSize,
        useCurrentColor: false
      })
      const blob = new Blob([coloredSvg], { type: 'image/svg+xml;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      img.src = objectUrl
    } else if (icon.fileUrl) {
      img.src = icon.fileUrl
    } else {
      reject(new Error('不支持的图标源'))
    }
  })
}

/**
 * 触发浏览器下载 DataURL 文件
 */
export function triggerDataUrlDownload(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 触发浏览器下载文本文件（如 .svg / .js）
 */
export function triggerTextDownload(content, filename, mimeType = 'image/svg+xml;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  triggerDataUrlDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
