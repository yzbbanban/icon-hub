import express from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { processSvgContent, buildProjectSymbolBundle, parseIconfontBundle } from './svgProcessor.js'
import { buildIconfontPackage } from './iconfontPackager.js'
import { IconHubStorage } from './storage.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const SYMBOLS_DIR = path.join(DATA_DIR, 'symbols')
const PACKAGES_DIR = path.join(DATA_DIR, 'packages')

const PORT = Number(process.env.PORT) || 3300
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'admin123'
const getTokenSecret = () => process.env.TOKEN_SECRET || 'icon-hub-team-secret-key'

for (const dir of [DATA_DIR, UPLOADS_DIR, SYMBOLS_DIR, PACKAGES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const storage = new IconHubStorage({
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR
})

function createAuthToken() {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(`admin:${getAdminPassword()}`)
    .digest('hex')
}

function verifyTokenOrPassword(req) {
  const expectedToken = createAuthToken()
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token && token === expectedToken) return true
  }
  const headerPwd = req.headers['x-admin-password']
  if (headerPwd && headerPwd === getAdminPassword()) {
    return true
  }
  return false
}

function requireAuth(req, res, next) {
  // 已取消密码验证，全员开放操作权限
  return next()
}

async function rebuildAllBundlesAndPackages(state) {
  for (const project of state.projects) {
    const projectIcons = state.icons.filter((i) => i.projectId === project.id)
    const bundle = buildProjectSymbolBundle(project, projectIcons)
    fs.writeFileSync(path.join(SYMBOLS_DIR, `${project.code}.js`), bundle.jsBundle, 'utf-8')
    fs.writeFileSync(path.join(SYMBOLS_DIR, `${project.code}.svg`), bundle.spriteSvg, 'utf-8')
    await buildIconfontPackage(project, projectIcons, PACKAGES_DIR)
  }

  const allProject = {
    id: 'all',
    name: '全部项目图标合集',
    code: 'all',
    prefix: 'icon-',
    description: '全站所有项目矢量图标合集'
  }
  const allBundle = buildProjectSymbolBundle(allProject, state.icons)
  fs.writeFileSync(path.join(SYMBOLS_DIR, 'all.js'), allBundle.jsBundle, 'utf-8')
  fs.writeFileSync(path.join(SYMBOLS_DIR, 'all.svg'), allBundle.spriteSvg, 'utf-8')
  await buildIconfontPackage(allProject, state.icons, PACKAGES_DIR)
}

async function saveAndRebuild(state) {
  storage.saveState(state)
  await rebuildAllBundlesAndPackages(storage.loadState())
}

function sanitizeSlug(input, fallback = 'icon') {
  const cleaned = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || `${fallback}-${Date.now().toString(36)}`
}

async function startServer() {
  await rebuildAllBundlesAndPackages(storage.loadState())

  const app = express()
  const isDev = process.argv.includes('--dev')

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use(express.json({ limit: '50mb' }))

  app.use('/uploads', express.static(UPLOADS_DIR))
  app.use('/symbols', express.static(SYMBOLS_DIR))
  app.use('/packages', express.static(PACKAGES_DIR))

  app.get('/api/storage/status', (req, res) => {
    res.json(storage.getStorageStatus(PACKAGES_DIR))
  })

  app.get('/api/auth/status', (req, res) => {
    res.json({
      authenticated: true
    })
  })

  app.post('/api/auth/verify', (req, res) => {
    const { password } = req.body || {}
    if (!password || password !== getAdminPassword()) {
      return res.status(401).json({
        success: false,
        error: '管理密码不正确，请重试（默认密码可在 .env 的 ADMIN_PASSWORD 中查看或修改）'
      })
    }
    return res.json({
      success: true,
      token: createAuthToken()
    })
  })

  app.get('/api/projects', (req, res) => {
    const db = storage.loadState()
    const projectsWithStats = db.projects.map((p) => {
      const projIcons = db.icons.filter((i) => i.projectId === p.id)
      const svgCount = projIcons.filter((i) => i.type === 'svg').length
      const rasterCount = projIcons.filter((i) => i.type !== 'svg').length
      return {
        ...p,
        totalCount: projIcons.length,
        svgCount,
        rasterCount,
        symbolJsUrl: `/symbols/${p.code}.js`,
        symbolSvgUrl: `/symbols/${p.code}.svg`,
        packageZipUrl: `/api/projects/${p.code}/download-package`,
        packagePreviewUrl: `/packages/${p.code}/iconfont/demo_index.html`
      }
    })
    res.json({
      projects: projectsWithStats,
      totalIcons: db.icons.length,
      allSymbolJsUrl: '/symbols/all.js',
      allPackageZipUrl: '/api/projects/all/download-package',
      storage: storage.getStorageStatus(PACKAGES_DIR)
    })
  })

  app.get('/api/projects/:code/download-package', async (req, res) => {
    try {
      const code = req.params.code || 'all'
      const db = storage.loadState()
      let targetProject = db.projects.find((p) => p.code === code || p.id === code)
      let targetIcons = []

      if (code === 'all' || !targetProject) {
        targetProject = {
          id: 'all',
          name: '全部项目图标合集',
          code: 'all',
          prefix: 'icon-',
          description: '全站所有项目矢量图标合集'
        }
        targetIcons = db.icons
      } else {
        targetIcons = db.icons.filter((i) => i.projectId === targetProject.id)
      }

      const pkg = await buildIconfontPackage(targetProject, targetIcons, PACKAGES_DIR)
      if (pkg.zipBuffer) {
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', `attachment; filename="iconfont-${targetProject.code}.zip"`)
        return res.send(pkg.zipBuffer)
      }
      if (!fs.existsSync(pkg.zipFilePath)) {
        return res.status(500).json({ error: '本地压缩包生成失败' })
      }
      res.download(pkg.zipFilePath, `iconfont-${targetProject.code}.zip`)
    } catch (err) {
      res.status(500).json({ error: err.message || '打包下载失败' })
    }
  })

  app.post('/api/projects', requireAuth, async (req, res) => {
    try {
      const { name, code, prefix, description } = req.body || {}
      if (!name || !code) {
        return res.status(400).json({ error: '项目名称和项目英文标识不能为空' })
      }
      const cleanCode = sanitizeSlug(code, 'project')
      const db = storage.loadState()
      if (db.projects.some((p) => p.code === cleanCode)) {
        return res.status(400).json({ error: `项目标识 "${cleanCode}" 已存在` })
      }
      const cleanPrefix = (prefix || `${cleanCode}-`).trim().replace(/[^a-zA-Z0-9_-]/g, '')
      const finalPrefix = (cleanPrefix.endsWith('-') || cleanPrefix.endsWith('_')) ? cleanPrefix : `${cleanPrefix}-`
      const newProject = {
        id: `proj_${Date.now().toString(36)}`,
        name: name.trim(),
        code: cleanCode,
        prefix: finalPrefix,
        description: (description || '').trim(),
        createdAt: new Date().toISOString()
      }
      db.projects.push(newProject)
      await saveAndRebuild(db)
      res.json({ project: newProject })
    } catch (err) {
      res.status(500).json({ error: err.message || '创建项目失败' })
    }
  })

  app.put('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const db = storage.loadState()
      const idx = db.projects.findIndex((p) => p.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: '项目不存在' })

      const { name, prefix, description } = req.body || {}
      if (name) db.projects[idx].name = name.trim()
      if (prefix) {
        const pfx = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '')
        db.projects[idx].prefix = (pfx.endsWith('-') || pfx.endsWith('_')) ? pfx : `${pfx}-`
      }
      if (description !== undefined) db.projects[idx].description = description.trim()

      await saveAndRebuild(db)
      res.json({ project: db.projects[idx] })
    } catch (err) {
      res.status(500).json({ error: err.message || '更新项目失败' })
    }
  })

  app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const db = storage.loadState()
      if (db.projects.length <= 1) {
        return res.status(400).json({ error: '至少需要保留一个默认项目分组' })
      }
      const target = db.projects.find((p) => p.id === req.params.id)
      if (!target) return res.status(404).json({ error: '项目不存在' })

      db.projects = db.projects.filter((p) => p.id !== req.params.id)
      const fallbackProjectId = db.projects[0].id
      db.icons.forEach((icon) => {
        if (icon.projectId === req.params.id) {
          icon.projectId = fallbackProjectId
        }
      })
      await saveAndRebuild(db)
      res.json({ success: true, fallbackProjectId })
    } catch (err) {
      res.status(500).json({ error: err.message || '删除项目失败' })
    }
  })

  app.get('/api/icons', (req, res) => {
    const { projectId, q, type } = req.query
    const db = storage.loadState()
    const projectMap = Object.fromEntries(db.projects.map((p) => [p.id, p]))

    let list = db.icons.map((icon) => {
      const proj = projectMap[icon.projectId] || { name: '未分组', prefix: 'icon-', code: 'common' }
      return {
        ...icon,
        projectName: proj.name,
        projectCode: proj.code,
        symbolId: `${proj.prefix}${icon.code}`,
        fontClass: `${proj.prefix}${icon.code}`
      }
    })

    if (projectId && projectId !== 'all') {
      list = list.filter((i) => i.projectId === projectId)
    }
    if (type === 'svg') {
      list = list.filter((i) => i.type === 'svg')
    } else if (type === 'raster') {
      list = list.filter((i) => i.type !== 'svg')
    }

    if (q && String(q).trim()) {
      const keyword = String(q).trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(keyword) ||
          i.code.toLowerCase().includes(keyword) ||
          i.symbolId.toLowerCase().includes(keyword) ||
          (i.unicode && i.unicode.toLowerCase().includes(keyword)) ||
          (i.tags || []).some((t) => String(t).toLowerCase().includes(keyword))
      )
    }

    list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    res.json({ icons: list })
  })

  app.post('/api/icons/preview-svg', (req, res) => {
    try {
      const { rawSvg, stripColor = true } = req.body || {}
      const result = processSvgContent(rawSvg, { stripColor: Boolean(stripColor) })
      res.json(result)
    } catch (err) {
      res.status(400).json({ error: err.message || 'SVG 解析失败' })
    }
  })

  // 新增：解析阿里 Iconfont 的 iconfont.js 与 iconfont.json，提取出全部可预览的 SVG 图标列表
  app.post('/api/icons/parse-iconfont', (req, res) => {
    try {
      const { jsText, jsonText, svgFontText, defaultStripColor = true } = req.body || {}
      const parsed = parseIconfontBundle({
        jsText,
        jsonText,
        svgFontText,
        defaultStripColor: Boolean(defaultStripColor)
      })
      res.json(parsed)
    } catch (err) {
      res.status(400).json({ error: err.message || '解析 Iconfont 文件失败' })
    }
  })

  app.post('/api/icons/batch', requireAuth, async (req, res) => {
    try {
      const { projectId, autoProject, items } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: '至少需要上传或导入一个图标' })
      }

      const db = storage.loadState()
      let project = null

      // 如果勾选了“按导入的 iconfont.json 自动创建/归入原项目分组”
      if (autoProject && autoProject.name) {
        const cleanCode = sanitizeSlug(autoProject.code || autoProject.name, 'iconfont')
        project = db.projects.find(
          (p) => p.code === cleanCode || p.name === autoProject.name.trim()
        )
        if (!project) {
          const pfx = (autoProject.prefix || 'icon-').trim().replace(/[^a-zA-Z0-9_-]/g, '')
          const finalPfx = (pfx.endsWith('-') || pfx.endsWith('_')) ? pfx : `${pfx}-`
          project = {
            id: autoProject.id ? `proj_${autoProject.id}` : `proj_${Date.now().toString(36)}`,
            name: autoProject.name.trim(),
            code: cleanCode,
            prefix: finalPfx,
            description: (autoProject.description || '从 Iconfont 导入的项目分组').trim(),
            createdAt: new Date().toISOString()
          }
          db.projects.push(project)
        }
      } else {
        project = db.projects.find((p) => p.id === projectId)
      }

      if (!project) {
        return res.status(404).json({ error: '目标项目不存在' })
      }

      const usedCodepoints = new Set(
        db.icons.map((i) => (i.unicode ? parseInt(i.unicode, 16) : 0)).filter(Boolean)
      )
      let nextCp = 0xe600

      const createdIcons = []
      for (const item of items) {
        const name = (item.name || item.code || '未命名图标').trim()
        const code = sanitizeSlug(item.code || item.name, 'icon')
        const tags = Array.isArray(item.tags)
          ? item.tags.map((t) => String(t).trim()).filter(Boolean)
          : []

        // 优先保留从 iconfont.json 导入的原始 unicode
        let cp = item.unicode ? parseInt(String(item.unicode), 16) : null
        if (!cp || Number.isNaN(cp)) {
          while (usedCodepoints.has(nextCp)) nextCp++
          cp = nextCp
        }
        usedCodepoints.add(cp)
        const unicodeHex = cp.toString(16).toLowerCase()

        // 检查同项目下是否已存在相同 code 的图标（若存在则覆盖更新，避免产生重复 symbol id）
        const existingIdx = db.icons.findIndex(
          (i) => i.projectId === project.id && i.code === code
        )
        const id =
          existingIdx !== -1
            ? db.icons[existingIdx].id
            : item.icon_id && /^\d+$/.test(String(item.icon_id))
              ? `icon_${item.icon_id}`
              : `icon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

        if (item.type === 'svg') {
          const isColorStripped = Boolean(item.isColorStripped)
          const rawSvg = item.rawSvg || item.svgContent || ''
          const processed = processSvgContent(rawSvg, { stripColor: isColorStripped })
          const fileName = `${id}.svg`
          fs.writeFileSync(path.join(UPLOADS_DIR, fileName), processed.svgContent, 'utf-8')

          const newIcon = {
            id,
            name,
            code,
            projectId: project.id,
            type: 'svg',
            format: 'svg',
            isColorStripped,
            svgContent: processed.svgContent,
            originalSvgContent: rawSvg,
            viewBox: processed.viewBox,
            width: processed.width,
            height: processed.height,
            fileUrl: `/uploads/${fileName}`,
            tags,
            unicode: unicodeHex,
            unicode_decimal: cp,
            createdAt: existingIdx !== -1 ? db.icons[existingIdx].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          if (existingIdx !== -1) {
            db.icons[existingIdx] = newIcon
          } else {
            db.icons.push(newIcon)
          }
          createdIcons.push(newIcon)
        } else {
          const dataUrl = item.dataUrl || ''
          const match = dataUrl.match(/^data:(image\/([a-zA-Z0-9+.-]+));base64,(.+)$/)
          if (!match) continue
          const extRaw = match[2].toLowerCase().replace('jpeg', 'jpg')
          const ext = ['png', 'webp', 'jpg', 'gif', 'avif'].includes(extRaw) ? extRaw : 'png'
          const buffer = Buffer.from(match[3], 'base64')
          const fileName = `${id}.${ext}`
          fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer)

          const newIcon = {
            id,
            name,
            code,
            projectId: project.id,
            type: 'raster',
            format: ext,
            isColorStripped: false,
            svgContent: null,
            originalSvgContent: null,
            viewBox: null,
            width: Number(item.width) || 128,
            height: Number(item.height) || 128,
            fileUrl: `/uploads/${fileName}`,
            tags,
            unicode: unicodeHex,
            unicode_decimal: cp,
            createdAt: existingIdx !== -1 ? db.icons[existingIdx].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          if (existingIdx !== -1) {
            db.icons[existingIdx] = newIcon
          } else {
            db.icons.push(newIcon)
          }
          createdIcons.push(newIcon)
        }
      }

      await saveAndRebuild(db)
      res.json({
        success: true,
        count: createdIcons.length,
        projectId: project.id,
        icons: createdIcons,
        symbolJsUrl: `/symbols/${project.code}.js`,
        packageZipUrl: `/api/projects/${project.code}/download-package`
      })
    } catch (err) {
      res.status(500).json({ error: err.message || '批量上传失败' })
    }
  })

  // 批量删除图标
  app.post('/api/icons/batch-delete', requireAuth, async (req, res) => {
    try {
      const { ids } = req.body || {}
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供要删除的图标 ID 列表' })
      }
      const db = storage.loadState()
      const idSet = new Set(ids)
      const toDelete = db.icons.filter((i) => idSet.has(i.id))

      for (const icon of toDelete) {
        if (icon.fileUrl) {
          const localFile = path.join(DATA_DIR, icon.fileUrl.replace(/^\//, ''))
          if (fs.existsSync(localFile)) {
            try {
              fs.unlinkSync(localFile)
            } catch {
              // ignore
            }
          }
        }
      }

      db.icons = db.icons.filter((i) => !idSet.has(i.id))
      await saveAndRebuild(db)
      res.json({ success: true, count: toDelete.length })
    } catch (err) {
      res.status(500).json({ error: err.message || '批量删除图标失败' })
    }
  })

  app.delete('/api/icons/batch', requireAuth, async (req, res) => {
    try {
      const { ids } = req.body || {}
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '请提供要删除的图标 ID 列表' })
      }
      const db = storage.loadState()
      const idSet = new Set(ids)
      const toDelete = db.icons.filter((i) => idSet.has(i.id))

      for (const icon of toDelete) {
        if (icon.fileUrl) {
          const localFile = path.join(DATA_DIR, icon.fileUrl.replace(/^\//, ''))
          if (fs.existsSync(localFile)) {
            try {
              fs.unlinkSync(localFile)
            } catch {
              // ignore
            }
          }
        }
      }

      db.icons = db.icons.filter((i) => !idSet.has(i.id))
      await saveAndRebuild(db)
      res.json({ success: true, count: toDelete.length })
    } catch (err) {
      res.status(500).json({ error: err.message || '批量删除图标失败' })
    }
  })

  app.put('/api/icons/:id', requireAuth, async (req, res) => {
    try {
      const db = storage.loadState()
      const idx = db.icons.findIndex((i) => i.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: '图标不存在' })

      const icon = db.icons[idx]
      const { name, code, projectId, tags, isColorStripped } = req.body || {}

      if (name !== undefined) icon.name = String(name).trim() || icon.name
      if (code !== undefined) icon.code = sanitizeSlug(code, icon.code)
      if (projectId !== undefined && db.projects.some((p) => p.id === projectId)) {
        icon.projectId = projectId
      }
      if (Array.isArray(tags)) {
        icon.tags = tags.map((t) => String(t).trim()).filter(Boolean)
      }

      if (
        icon.type === 'svg' &&
        isColorStripped !== undefined &&
        Boolean(isColorStripped) !== icon.isColorStripped
      ) {
        icon.isColorStripped = Boolean(isColorStripped)
        const sourceSvg = icon.originalSvgContent || icon.svgContent
        const processed = processSvgContent(sourceSvg, { stripColor: icon.isColorStripped })
        icon.svgContent = processed.svgContent
        const fileName = `${icon.id}.svg`
        fs.writeFileSync(path.join(UPLOADS_DIR, fileName), processed.svgContent, 'utf-8')
      }

      icon.updatedAt = new Date().toISOString()
      await saveAndRebuild(db)

      const proj = db.projects.find((p) => p.id === icon.projectId) || {
        name: '未分组',
        prefix: 'icon-',
        code: 'common'
      }
      res.json({
        icon: {
          ...icon,
          projectName: proj.name,
          projectCode: proj.code,
          symbolId: `${proj.prefix}${icon.code}`,
          fontClass: `${proj.prefix}${icon.code}`
        }
      })
    } catch (err) {
      res.status(500).json({ error: err.message || '更新图标失败' })
    }
  })

  app.delete('/api/icons/:id', requireAuth, async (req, res) => {
    try {
      const db = storage.loadState()
      const icon = db.icons.find((i) => i.id === req.params.id)
      if (!icon) return res.status(404).json({ error: '图标不存在' })

      if (icon.fileUrl) {
        const localFile = path.join(DATA_DIR, icon.fileUrl.replace(/^\//, ''))
        if (fs.existsSync(localFile)) {
          try {
            fs.unlinkSync(localFile)
          } catch {
            // ignore
          }
        }
      }

      db.icons = db.icons.filter((i) => i.id !== req.params.id)
      await saveAndRebuild(db)
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message || '删除图标失败' })
    }
  })

  if (isDev) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    })
    app.use(vite.middlewares)
  } else {
    const distDir = path.join(ROOT_DIR, 'dist')
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir))
      app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'))
      })
    }
  }

  app.listen(PORT, () => {
    console.log(`\n======================================================`)
    console.log(`🚀 IconHub 团队图标管理系统已启动: http://localhost:${PORT}`)
    console.log(`💾 本地数据持久化: ${path.join(DATA_DIR, 'db.json')}`)
    console.log(`📦 Iconfont 离线包目录: ${PACKAGES_DIR}`)
    console.log(`======================================================\n`)
  })
}

startServer()
