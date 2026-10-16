import svgpath from 'svgpath'

/**
 * 将字符串哈希为稳定的指定位数纯数字字符串（对齐阿里 Iconfont 的纯数字 id / icon_id）
 */
export function toNumericId(str, digits = 7) {
  const s = String(str || 'iconhub')
  if (/^\d+$/.test(s)) return s
  let hash = 2166136261
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const positive = Math.abs(hash >>> 0)
  const min = Math.pow(10, digits - 1)
  const mod = Math.pow(10, digits) - min
  return String(min + (positive % mod))
}

/**
 * 将基本 SVG 图形标签 (<rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>) 转换为等效的 path d
 */
export function shapeTagToPathD(tagName, attrsStr) {
  const getAttr = (name, def = 0) => {
    const m = attrsStr.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))
    return m ? parseFloat(m[1]) || def : def
  }
  const getStrAttr = (name) => {
    const m = attrsStr.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))
    return m ? m[1].trim() : ''
  }

  switch (tagName.toLowerCase()) {
    case 'rect': {
      const x = getAttr('x', 0)
      const y = getAttr('y', 0)
      const w = getAttr('width', 0)
      const h = getAttr('height', 0)
      if (w <= 0 || h <= 0) return ''
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`
    }
    case 'circle': {
      const cx = getAttr('cx', 0)
      const cy = getAttr('cy', 0)
      const r = getAttr('r', 0)
      if (r <= 0) return ''
      return `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`
    }
    case 'ellipse': {
      const cx = getAttr('cx', 0)
      const cy = getAttr('cy', 0)
      const rx = getAttr('rx', 0)
      const ry = getAttr('ry', 0)
      if (rx <= 0 || ry <= 0) return ''
      return `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 -${rx * 2},0`
    }
    case 'line': {
      const x1 = getAttr('x1', 0)
      const y1 = getAttr('y1', 0)
      const x2 = getAttr('x2', 0)
      const y2 = getAttr('y2', 0)
      return `M${x1} ${y1}L${x2} ${y2}`
    }
    case 'polyline':
    case 'polygon': {
      const pts = getStrAttr('points')
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !Number.isNaN(n))
      if (pts.length < 4) return ''
      const pairs = []
      for (let i = 0; i < pts.length - 1; i += 2) {
        pairs.push(`${pts[i]} ${pts[i + 1]}`)
      }
      return `M${pairs.join('L')}${tagName.toLowerCase() === 'polygon' ? 'Z' : ''}`
    }
    default:
      return ''
  }
}

/**
 * 提取 SVG 中的所有绘制元素并缩放至 viewBox="0 0 1024 1024" 的纯 <path> 数组
 * 彻底移除 <defs>、<clipPath>、<g clip-path="...">，100% 对齐阿里 Iconfont Symbol 结构
 */
export function extractNormalizedPaths1024(svgContent, viewBoxStr = '0 0 1024 1024', { stripColor = true } = {}) {
  if (!svgContent) return []

  const cleaned = svgContent
    .replace(/<defs[\s\S]*?<\/defs>/gi, '')
    .replace(/<clipPath[\s\S]*?<\/clipPath>/gi, '')
    .replace(/<mask[\s\S]*?<\/mask>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  const rawPaths = []

  const pathRegex = /<path\b([^>]*?)\/?>/gi
  let m
  while ((m = pathRegex.exec(cleaned)) !== null) {
    const attrs = m[1] || ''
    const dMatch = attrs.match(/\bd=["']([^"']+)["']/i)
    if (!dMatch || !dMatch[1].trim()) continue
    const fillMatch = attrs.match(/\bfill=["']([^"']+)["']/i)
    rawPaths.push({
      d: dMatch[1].trim(),
      fill: fillMatch ? fillMatch[1].trim() : ''
    })
  }

  const shapeRegex = /<(rect|circle|ellipse|line|polyline|polygon)\b([^>]*?)\/?>/gi
  while ((m = shapeRegex.exec(cleaned)) !== null) {
    const attrs = m[2] || ''
    const d = shapeTagToPathD(m[1], attrs)
    if (!d) continue
    const fillMatch = attrs.match(/\bfill=["']([^"']+)["']/i)
    rawPaths.push({
      d,
      fill: fillMatch ? fillMatch[1].trim() : ''
    })
  }

  const vb = (viewBoxStr || '0 0 1024 1024').split(/[\s,]+/).map(Number)
  const minX = vb[0] || 0
  const minY = vb[1] || 0
  const width = vb[2] > 0 ? vb[2] : 1024
  const height = vb[3] > 0 ? vb[3] : 1024

  const scale = 1024 / Math.max(width, height)
  const offsetX = (1024 - width * scale) / 2
  const offsetY = (1024 - height * scale) / 2

  return rawPaths
    .map((item) => {
      try {
        const d1024 = svgpath(item.d)
          .translate(-minX, -minY)
          .scale(scale, scale)
          .translate(offsetX, offsetY)
          .round(3)
          .toString()

        let fillAttr = ''
        if (!stripColor && item.fill) {
          const f = item.fill.toLowerCase()
          if (f !== 'none' && f !== 'currentcolor') {
            fillAttr = ` fill="${item.fill}"`
          }
        }
        return {
          d: d1024,
          fillAttr,
          tag: `<path d="${d1024}"${fillAttr} ></path>`
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

/**
 * 提取 SVG 的 viewBox 和内部内容，并按需执行清理与去色
 */
export function processSvgContent(rawSvg, { stripColor = true } = {}) {
  if (!rawSvg || typeof rawSvg !== 'string') {
    throw new Error('无效的 SVG 内容')
  }

  let svg = rawSvg.trim()

  svg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .trim()

  const svgTagMatch = svg.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/i)
  if (!svgTagMatch) {
    throw new Error('未找到合法的 <svg> 根标签')
  }

  const rootAttrs = svgTagMatch[1] || ''
  let innerContent = svgTagMatch[2] || ''

  let viewBox = '0 0 1024 1024'
  const viewBoxMatch = rootAttrs.match(/viewBox=["']([^"']+)["']/i)
  const widthMatch = rootAttrs.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i)
  const heightMatch = rootAttrs.match(/\bheight=["']([0-9.]+)(?:px)?["']/i)

  if (viewBoxMatch) {
    viewBox = viewBoxMatch[1].trim()
  } else if (widthMatch && heightMatch) {
    viewBox = `0 0 ${widthMatch[1]} ${heightMatch[1]}`
  } else {
    viewBox = '0 0 24 24'
  }

  const vbParts = viewBox.split(/[\s,]+/).map(Number)
  const width = vbParts[2] || 24
  const height = vbParts[3] || 24

  const rootHasStroke = /\bstroke=["'](?!none)[^"']+["']/i.test(rootAttrs)
  const rootFillNone = /\bfill=["']none["']/i.test(rootAttrs)
  const innerHasFill = /\bfill=["'](?!none)[^"']+["']/i.test(innerContent)

  innerContent = innerContent
    .replace(/<defs>\s*<clipPath[\s\S]*?<\/clipPath>\s*<\/defs>/gi, '')
    .replace(/<clipPath[\s\S]*?<\/clipPath>/gi, '')
    .replace(/\s+clip-path=["']url\([^"']+\)["']/gi, '')
    .replace(/\s+(?:xmlns:xlink|xml:space|data-name|fill-opacity)=["'][^"']*["']/gi, '')
    .trim()

  if (stripColor) {
    innerContent = innerContent.replace(
      /\b(fill|stroke)=["']([^"']+)["']/gi,
      (match, attr, val) => {
        const v = val.trim().toLowerCase()
        if (v === 'none' || v === 'transparent' || v.startsWith('url(') || v === 'currentcolor') {
          return match
        }
        return `${attr}="currentColor"`
      }
    )

    innerContent = innerContent.replace(
      /\b(fill|stroke)\s*:\s*([^;}"']+)/gi,
      (match, prop, val) => {
        const v = val.trim().toLowerCase()
        if (v === 'none' || v === 'transparent' || v.startsWith('url(') || v === 'currentcolor') {
          return match
        }
        return `${prop}:currentColor`
      }
    )
  }

  let rootExtraAttrs = ''
  if (stripColor) {
    if (rootFillNone && rootHasStroke && !innerHasFill) {
      rootExtraAttrs = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    } else {
      rootExtraAttrs = ' fill="currentColor"'
    }
  } else {
    const origFill = rootAttrs.match(/\bfill=["']([^"']+)["']/i)
    const origStroke = rootAttrs.match(/\bstroke=["']([^"']+)["']/i)
    if (origFill && origFill[1].toLowerCase() !== 'none') rootExtraAttrs += ` fill="${origFill[1]}"`
    if (origStroke) rootExtraAttrs += ` stroke="${origStroke[1]}"`
  }

  const normalizedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${rootExtraAttrs}>${innerContent}</svg>`

  return {
    svgContent: normalizedSvg,
    innerContent,
    viewBox,
    width,
    height,
    rootExtraAttrs
  }
}

/**
 * 解析阿里 Iconfont 导出的 iconfont.js 与 iconfont.json（及可选的 iconfont.svg 字体文件）
 * 提取出完整的 SVG 图标列表、原始名称、font_class、unicode 编码与项目信息
 */
export function parseIconfontBundle({ jsText = '', jsonText = '', svgFontText = '', defaultStripColor = true } = {}) {
  let projectMeta = {
    id: '',
    name: '',
    font_family: 'iconfont',
    css_prefix_text: 'icon-',
    description: ''
  }

  // 1. 解析 iconfont.json
  const glyphMapByClass = new Map()
  const glyphMapByUnicodeDec = new Map()
  let jsonGlyphs = []

  if (jsonText && String(jsonText).trim()) {
    try {
      const parsedJson = JSON.parse(String(jsonText).trim())
      projectMeta = {
        id: String(parsedJson.id || ''),
        name: String(parsedJson.name || '').trim(),
        font_family: String(parsedJson.font_family || 'iconfont').trim(),
        css_prefix_text: String(parsedJson.css_prefix_text || 'icon-').trim(),
        description: String(parsedJson.description || '').trim()
      }
      if (Array.isArray(parsedJson.glyphs)) {
        jsonGlyphs = parsedJson.glyphs
        for (const g of parsedJson.glyphs) {
          if (g.font_class) {
            glyphMapByClass.set(String(g.font_class).trim(), g)
            glyphMapByClass.set(`${projectMeta.css_prefix_text}${String(g.font_class).trim()}`, g)
          }
          if (g.unicode_decimal) {
            glyphMapByUnicodeDec.set(Number(g.unicode_decimal), g)
          } else if (g.unicode) {
            glyphMapByUnicodeDec.set(parseInt(String(g.unicode), 16), g)
          }
        }
      }
    } catch (err) {
      throw new Error(`iconfont.json 解析失败: ${err.message}`)
    }
  }

  const prefix = projectMeta.css_prefix_text || 'icon-'
  const items = []
  const seenCodes = new Set()

  // 2. 从 iconfont.js 中提取所有 <symbol id="..." viewBox="...">...</symbol>
  if (jsText && String(jsText).trim()) {
    const unescapedJs = String(jsText)
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\//g, '/')

    const symbolRegex = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/gi
    let match
    while ((match = symbolRegex.exec(unescapedJs)) !== null) {
      const attrs = match[1] || ''
      const inner = (match[2] || '').trim()
      if (!inner) continue

      const idMatch = attrs.match(/\bid=["']([^"']+)["']/i)
      const vbMatch = attrs.match(/\bviewBox=["']([^"']+)["']/i)
      const symbolId = idMatch ? idMatch[1].trim() : ''
      const viewBox = vbMatch ? vbMatch[1].trim() : '0 0 1024 1024'

      let code = symbolId
      if (prefix && code.startsWith(prefix)) {
        code = code.slice(prefix.length)
      } else if (code.startsWith('icon-')) {
        code = code.slice(5)
      }
      code = code || `icon-${items.length + 1}`
      if (seenCodes.has(code)) continue
      seenCodes.add(code)

      // 匹配 iconfont.json 中的元数据
      const meta = glyphMapByClass.get(code) || glyphMapByClass.get(symbolId) || null
      const displayName = meta?.name ? String(meta.name).trim() : code
      const unicode = meta?.unicode ? String(meta.unicode).toLowerCase() : undefined
      const unicode_decimal = meta?.unicode_decimal
        ? Number(meta.unicode_decimal)
        : unicode
          ? parseInt(unicode, 16)
          : undefined

      // 检测是否为多色图标（包含 2 种及以上不同颜色值则默认保留原色）
      const colorSet = new Set()
      const fillRegex = /\bfill=["']([^"']+)["']/gi
      let fm
      while ((fm = fillRegex.exec(inner)) !== null) {
        const c = fm[1].trim().toLowerCase()
        if (c && c !== 'none' && c !== 'currentcolor' && c !== 'transparent') {
          colorSet.add(c)
        }
      }
      const isMultiColor = colorSet.size >= 2
      const isColorStripped = isMultiColor ? false : Boolean(defaultStripColor)

      const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`
      const processed = processSvgContent(rawSvg, { stripColor: isColorStripped })

      items.push({
        tempId: `import_${Date.now()}_${items.length}`,
        name: displayName,
        code,
        type: 'svg',
        format: 'svg',
        rawSvg,
        previewSvg: processed.svgContent,
        isColorStripped,
        isMultiColor,
        width: processed.width || 1024,
        height: processed.height || 1024,
        unicode,
        unicode_decimal,
        icon_id: meta?.icon_id ? String(meta.icon_id) : undefined,
        tags: ['iconfont导入']
      })
    }
  }

  // 3. 如果未提供 iconfont.js 或未从中提取到 symbol，尝试从 iconfont.svg 字体文件提取 <glyph>
  if (items.length === 0 && svgFontText && String(svgFontText).includes('<glyph')) {
    const glyphRegex = /<glyph\b([^>]*?)\/?>/gi
    let gm
    while ((gm = glyphRegex.exec(svgFontText)) !== null) {
      const attrs = gm[1] || ''
      const dMatch = attrs.match(/\bd=["']([^"']+)["']/i)
      if (!dMatch || !dMatch[1].trim()) continue

      const nameMatch = attrs.match(/\bglyph-name=["']([^"']+)["']/i)
      const uniDecMatch = attrs.match(/\bunicode=["']&#(\d+);["']/i)
      const uniHexMatch = attrs.match(/\bunicode=["']&#x([0-9a-fA-F]+);["']/i)

      const dec = uniDecMatch
        ? Number(uniDecMatch[1])
        : uniHexMatch
          ? parseInt(uniHexMatch[1], 16)
          : undefined

      const glyphName = nameMatch ? nameMatch[1].trim() : ''
      const meta =
        (glyphName && glyphMapByClass.get(glyphName)) ||
        (dec && glyphMapByUnicodeDec.get(dec)) ||
        null

      const code = meta?.font_class || glyphName || `icon-${items.length + 1}`
      if (seenCodes.has(code)) continue
      seenCodes.add(code)

      try {
        // 将字体坐标系 (ascent 896, Y轴向上) 翻转回标准 SVG 坐标系 (1024x1024, Y轴向下)
        const normalD = svgpath(dMatch[1].trim())
          .translate(0, -896)
          .scale(1, -1)
          .round(2)
          .toString()

        const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path d="${normalD}" fill="#333333"/></svg>`
        const processed = processSvgContent(rawSvg, { stripColor: Boolean(defaultStripColor) })

        items.push({
          tempId: `import_svgfont_${Date.now()}_${items.length}`,
          name: meta?.name || code,
          code,
          type: 'svg',
          format: 'svg',
          rawSvg,
          previewSvg: processed.svgContent,
          isColorStripped: Boolean(defaultStripColor),
          isMultiColor: false,
          width: 1024,
          height: 1024,
          unicode: meta?.unicode || (dec ? dec.toString(16).toLowerCase() : undefined),
          unicode_decimal: meta?.unicode_decimal || dec,
          icon_id: meta?.icon_id ? String(meta.icon_id) : undefined,
          tags: ['iconfont导入']
        })
      } catch {
        // ignore malformed glyph
      }
    }
  }

  return {
    projectMeta,
    items,
    jsonGlyphCount: jsonGlyphs.length,
    onlyJsonProvided: Boolean(jsonGlyphs.length > 0 && items.length === 0)
  }
}

/**
 * 为指定项目生成 100% 同构于阿里 Iconfont 官方格式的 iconfont.js 与 SVG Sprite
 */
export function buildProjectSymbolBundle(project, icons) {
  const prefix = project.prefix || 'icon-'
  const numericProjectId = toNumericId(project.id || project.code || '4831748', 7)

  const dedupedMap = new Map()
  for (const item of icons) {
    if (item.type === 'svg' && (item.originalSvgContent || item.svgContent)) {
      if (!dedupedMap.has(item.code)) {
        dedupedMap.set(item.code, item)
      }
    }
  }
  const svgIcons = Array.from(dedupedMap.values())

  const symbols = svgIcons
    .map((icon) => {
      const symbolId = `${prefix}${icon.code}`
      const sourceSvg = icon.originalSvgContent || icon.svgContent
      const paths1024 = extractNormalizedPaths1024(sourceSvg, icon.viewBox, {
        stripColor: Boolean(icon.isColorStripped)
      })
      if (paths1024.length > 0) {
        return `<symbol id="${symbolId}" viewBox="0 0 1024 1024">${paths1024.map((p) => p.tag).join('')}</symbol>`
      }
      return ''
    })
    .filter(Boolean)

  const spriteSvg = `<svg>${symbols.join('')}</svg>`
  const escapedSpriteSvg = spriteSvg.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  const jsBundle = `window._iconfont_svg_string_${numericProjectId}='${escapedSpriteSvg}',(h=>{var c=(l=(l=document.getElementsByTagName("script"))[l.length-1]).getAttribute("data-injectcss"),l=l.getAttribute("data-disable-injectsvg");if(!l){var a,s,t,i,z,v=function(c,l){l.parentNode.insertBefore(c,l)};if(c&&!h.__iconfont__svg__cssinject__){h.__iconfont__svg__cssinject__=!0;try{document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>")}catch(c){console&&console.log(c)}}a=function(){var c,l=document.createElement("div");l.innerHTML=h._iconfont_svg_string_${numericProjectId},(l=l.getElementsByTagName("svg")[0])&&(l.setAttribute("aria-hidden","true"),l.style.position="absolute",l.style.width=0,l.style.height=0,l.style.overflow="hidden",l=l,(c=document.body).firstChild?v(l,c.firstChild):c.appendChild(l))},document.addEventListener?~["complete","loaded","interactive"].indexOf(document.readyState)?setTimeout(a,0):(s=function(){document.removeEventListener("DOMContentLoaded",s,!1),a()},document.addEventListener("DOMContentLoaded",s,!1)):document.attachEvent&&(t=a,i=h.document,z=!1,o(),i.onreadystatechange=function(){"complete"==i.readyState&&(i.onreadystatechange=null,m())})}function m(){z||(z=!0,t())}function o(){try{i.documentElement.doScroll("left")}catch(c){return void setTimeout(o,50)}m()}})(window);`

  return {
    spriteSvg,
    jsBundle,
    count: symbols.length
  }
}
