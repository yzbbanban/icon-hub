import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import svgpath from 'svgpath'
import svg2ttf from 'svg2ttf'
import ttf2woff from 'ttf2woff'
import wawoff2 from 'wawoff2'
import { buildProjectSymbolBundle, toNumericId, shapeTagToPathD } from './svgProcessor.js'

/**
 * 纯 Node.js 原生 ZIP 打包实现（基于内置 zlib，无需系统安装 zip 命令或 apk add zip）
 */
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipArchive(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8')
    const rawData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data)
    const compressed = zlib.deflateRawSync(rawData)
    const crc = crc32(rawData)

    const localHeader = Buffer.alloc(30 + nameBuf.length)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0x21, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(rawData.length, 22)
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBuf.copy(localHeader, 30)

    localParts.push(localHeader, compressed)

    const centralHeader = Buffer.alloc(46 + nameBuf.length)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0x21, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(rawData.length, 24)
    centralHeader.writeUInt16LE(nameBuf.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    nameBuf.copy(centralHeader, 46)

    centralParts.push(centralHeader)
    offset += localHeader.length + compressed.length
  }

  const centralDirSize = centralParts.reduce((acc, b) => acc + b.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDirSize, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, ...centralParts, eocd])
}

export function extractGlyphPath1024(svgContent, viewBoxStr = '0 0 24 24') {
  if (!svgContent) return ''

  const cleaned = svgContent
    .replace(/<defs[\s\S]*?<\/defs>/gi, '')
    .replace(/<clipPath[\s\S]*?<\/clipPath>/gi, '')
    .replace(/<mask[\s\S]*?<\/mask>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  const pathSegments = []

  const pathRegex = /<path\b([^>]*?)\/?>/gi
  let m
  while ((m = pathRegex.exec(cleaned)) !== null) {
    const attrs = m[1] || ''
    const dMatch = attrs.match(/\bd=["']([^"']+)["']/i)
    if (dMatch && dMatch[1].trim()) {
      pathSegments.push(dMatch[1].trim())
    }
  }

  const shapeRegex = /<(rect|circle|ellipse|line|polyline|polygon)\b([^>]*?)\/?>/gi
  while ((m = shapeRegex.exec(cleaned)) !== null) {
    const d = shapeTagToPathD(m[1], m[2] || '')
    if (d) pathSegments.push(d)
  }

  if (pathSegments.length === 0) return ''

  const vb = (viewBoxStr || '0 0 24 24').split(/[\s,]+/).map(Number)
  const minX = vb[0] || 0
  const minY = vb[1] || 0
  const width = vb[2] > 0 ? vb[2] : 24
  const height = vb[3] > 0 ? vb[3] : 24

  const scale = 1024 / Math.max(width, height)
  const offsetX = (1024 - width * scale) / 2
  const offsetY = (1024 - height * scale) / 2

  try {
    const combinedD = pathSegments.join(' ')
    return svgpath(combinedD)
      .translate(-minX, -minY)
      .scale(scale, -scale)
      .translate(offsetX, 896 - offsetY)
      .round(2)
      .toString()
  } catch {
    return ''
  }
}

export async function buildIconfontPackage(project, icons, packagesRootDir) {
  const projectCode = project.code || 'common'
  const prefix = project.prefix || 'icon-'
  const fontFamily = 'iconfont'
  const timestamp = Date.now()
  const numericProjectId = toNumericId(project.id || projectCode || '4831748', 7)

  const projectPkgDir = path.join(packagesRootDir, projectCode)
  const iconfontDir = path.join(projectPkgDir, 'iconfont')
  fs.mkdirSync(iconfontDir, { recursive: true })

  // 按 font_class (icon.code) 去重，保留最新一条，彻底杜绝重复类名与重复 symbol id
  const dedupedMap = new Map()
  for (const item of icons) {
    if (item.type === 'svg' && (item.originalSvgContent || item.svgContent)) {
      if (!dedupedMap.has(item.code)) {
        dedupedMap.set(item.code, item)
      }
    }
  }
  const svgIcons = Array.from(dedupedMap.values())

  let nextCodepoint = 0xe600
  const usedCodepoints = new Set()
  for (const icon of svgIcons) {
    if (icon.unicode && /^[0-9a-f]{4,5}$/i.test(icon.unicode)) {
      usedCodepoints.add(parseInt(icon.unicode, 16))
    }
  }

  const glyphsMeta = []
  const svgFontGlyphs = []

  for (const icon of svgIcons) {
    let cp = icon.unicode ? parseInt(icon.unicode, 16) : null
    if (!cp || Number.isNaN(cp)) {
      while (usedCodepoints.has(nextCodepoint)) {
        nextCodepoint++
      }
      cp = nextCodepoint
      usedCodepoints.add(cp)
      icon.unicode = cp.toString(16).toLowerCase()
      icon.unicode_decimal = cp
    }

    const hexUnicode = cp.toString(16).toLowerCase()
    const decUnicode = cp
    const sourceSvg = icon.originalSvgContent || icon.svgContent
    const dPath = extractGlyphPath1024(sourceSvg, icon.viewBox)

    glyphsMeta.push({
      icon_id: toNumericId(icon.id, 8),
      name: icon.name,
      font_class: icon.code,
      unicode: hexUnicode,
      unicode_decimal: decUnicode
    })

    if (dPath) {
      svgFontGlyphs.push(
        `      <glyph glyph-name="${icon.code}" unicode="&#${decUnicode};" d="${dPath}" horiz-adv-x="1024" />`
      )
    }
  }

  // 1. 生成 iconfont.json（纯数字 id 与 icon_id，100% 对齐阿里 Iconfont）
  const iconfontJsonStr = JSON.stringify(
    {
      id: numericProjectId,
      name: project.name,
      font_family: fontFamily,
      css_prefix_text: prefix,
      description: project.description || '',
      glyphs: glyphsMeta
    },
    null,
    2
  )
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.json'), iconfontJsonStr, 'utf-8')

  // 2. 生成 iconfont.svg
  const iconfontSvg = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >
<svg xmlns="http://www.w3.org/2000/svg">
  <metadata>Created by iconfont</metadata>
  <defs>
  <font id="${fontFamily}" horiz-adv-x="1024">
    <font-face
      font-family="${fontFamily}"
      font-weight="400"
      font-stretch="normal"
      units-per-em="1024"
      ascent="896"
      descent="-128"
    />
      <missing-glyph />
${svgFontGlyphs.join('\n')}
  </font>
</defs></svg>
`
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.svg'), iconfontSvg, 'utf-8')

  // 3. 生成 iconfont.ttf
  const ttfResult = svg2ttf(iconfontSvg, {
    copyright: `Generated by IconHub - ${project.name}`
  })
  const ttfBuffer = Buffer.from(ttfResult.buffer)
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.ttf'), ttfBuffer)

  // 4. 生成 iconfont.woff
  const woffResult = ttf2woff(new Uint8Array(ttfBuffer), {})
  const woffBuffer = Buffer.from(woffResult.buffer)
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.woff'), woffBuffer)

  // 5. 生成 iconfont.woff2
  let woff2Buffer = woffBuffer
  try {
    const woff2Uint8 = await wawoff2.compress(ttfBuffer)
    woff2Buffer = Buffer.from(woff2Uint8)
  } catch {
    woff2Buffer = woffBuffer
  }
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.woff2'), woff2Buffer)

  // 6. 生成 iconfont.css（对齐阿里 Iconfont 官方格式）
  const cssRules = glyphsMeta
    .map((g) => `.${prefix}${g.font_class}:before {\n  content: "\\${g.unicode}";\n}`)
    .join('\n\n')

  const iconfontCss = `@font-face {
  font-family: "${fontFamily}"; /* Project id ${numericProjectId} */
  src: url('iconfont.woff2?t=${timestamp}') format('woff2'),
       url('iconfont.woff?t=${timestamp}') format('woff'),
       url('iconfont.ttf?t=${timestamp}') format('truetype'),
       url('iconfont.svg?t=${timestamp}#${fontFamily}') format('svg');
}

.${fontFamily} {
  font-family: "${fontFamily}" !important;
  font-size: 16px;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${cssRules}
`
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.css'), iconfontCss, 'utf-8')

  // 7. 生成 iconfont.js（100% 复刻阿里 Iconfont window._iconfont_svg_string_<id> 格式）
  const symbolBundle = buildProjectSymbolBundle(project, svgIcons)
  fs.writeFileSync(path.join(iconfontDir, 'iconfont.js'), symbolBundle.jsBundle, 'utf-8')

  // 8. 生成 demo_index.html
  const demoHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>IconHub 离线图标包预览 - ${project.name}</title>
  <link rel="stylesheet" href="./iconfont.css">
  <script src="./iconfont.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; padding: 32px; margin: 0; }
    .header { max-width: 1080px; margin: 0 auto 24px; background: #fff; padding: 20px 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .grid { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 12px; text-align: center; }
    .icon { width: 32px; height: 32px; vertical-align: -0.15em; fill: currentColor; overflow: hidden; }
    .name { font-size: 13px; font-weight: 600; margin-top: 10px; }
    .code { font-size: 11.5px; color: #64748b; font-family: monospace; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0 0 6px;">${project.name} (${projectCode}) - 本地离线包预览</h2>
    <div style="font-size:13px;color:#475569;">
      Font-Class 前缀: <code>.${prefix}*</code> &nbsp;|&nbsp; Symbol 引用: <code>#${prefix}*</code> &nbsp;|&nbsp; 共 ${glyphsMeta.length} 个矢量图标
    </div>
  </div>
  <div class="grid">
    ${glyphsMeta
      .map(
        (g) => `<div class="card">
      <svg class="icon" aria-hidden="true"><use xlink:href="#${prefix}${g.font_class}"></use></svg>
      <div class="name">${g.name}</div>
      <div class="code">.${prefix}${g.font_class}</div>
      <div class="code">&amp;#x${g.unicode};</div>
    </div>`
      )
      .join('\n    ')}
  </div>
</body>
</html>`
  fs.writeFileSync(path.join(iconfontDir, 'demo_index.html'), demoHtml, 'utf-8')

  const zipFilePath = path.join(projectPkgDir, 'iconfont.zip')
  const zipBuffer = createZipArchive([
    { name: 'iconfont/iconfont.css', data: iconfontCss },
    { name: 'iconfont/iconfont.js', data: symbolBundle.jsBundle },
    { name: 'iconfont/iconfont.json', data: iconfontJsonStr },
    { name: 'iconfont/iconfont.svg', data: iconfontSvg },
    { name: 'iconfont/iconfont.ttf', data: ttfBuffer },
    { name: 'iconfont/iconfont.woff', data: woffBuffer },
    { name: 'iconfont/iconfont.woff2', data: woff2Buffer },
    { name: 'iconfont/demo_index.html', data: demoHtml }
  ])
  try {
    fs.writeFileSync(zipFilePath, zipBuffer)
  } catch {
    // ignore volume write issues
  }

  return {
    iconfontDir,
    zipFilePath,
    zipBuffer,
    glyphCount: glyphsMeta.length,
    files: [
      'iconfont.css',
      'iconfont.js',
      'iconfont.json',
      'iconfont.svg',
      'iconfont.ttf',
      'iconfont.woff',
      'iconfont.woff2',
      'demo_index.html'
    ]
  }
}
