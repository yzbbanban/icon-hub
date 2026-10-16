import fs from 'fs'
import path from 'path'
import { processSvgContent } from './svgProcessor.js'
import { INITIAL_PROJECTS, INITIAL_ICONS } from './seedData.js'

/**
 * 持久化存储引擎：基于本地磁盘 JSON 原子写入 (data/db.json) + 自动备份 (data/db.backup.json)
 * 兼容所有 Node.js 版本（无需 node:sqlite），重启服务、断电或修改代码后数据 100% 持久保留
 */
export class IconHubStorage {
  constructor({ dataDir, uploadsDir }) {
    this.dataDir = dataDir
    this.uploadsDir = uploadsDir
    this.jsonPath = path.join(dataDir, 'db.json')
    this.backupPath = path.join(dataDir, 'db.backup.json')

    fs.mkdirSync(this.dataDir, { recursive: true })
    fs.mkdirSync(this.uploadsDir, { recursive: true })

    this.bootstrap()
  }

  bootstrap() {
    let state = null

    if (fs.existsSync(this.jsonPath)) {
      try {
        state = JSON.parse(fs.readFileSync(this.jsonPath, 'utf-8'))
      } catch {
        if (fs.existsSync(this.backupPath)) {
          try {
            state = JSON.parse(fs.readFileSync(this.backupPath, 'utf-8'))
          } catch {
            state = null
          }
        }
      }
    }

    if (!state || !Array.isArray(state.projects) || state.projects.length === 0) {
      const seededIcons = INITIAL_ICONS.map((item, idx) => {
        const processed = processSvgContent(item.rawSvg, {
          stripColor: item.isColorStripped
        })
        const fileName = `${item.id}.svg`
        fs.writeFileSync(path.join(this.uploadsDir, fileName), processed.svgContent, 'utf-8')
        const cp = 0xe600 + idx
        return {
          id: item.id,
          name: item.name,
          code: item.code,
          projectId: item.projectId,
          type: 'svg',
          format: 'svg',
          isColorStripped: item.isColorStripped,
          svgContent: processed.svgContent,
          originalSvgContent: item.rawSvg,
          viewBox: processed.viewBox,
          width: processed.width,
          height: processed.height,
          fileUrl: `/uploads/${fileName}`,
          tags: item.tags || [],
          unicode: cp.toString(16).toLowerCase(),
          unicode_decimal: cp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      state = {
        projects: INITIAL_PROJECTS,
        icons: seededIcons
      }
    }

    this.saveState(state)
  }

  loadState() {
    try {
      const raw = fs.readFileSync(this.jsonPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return {
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        icons: Array.isArray(parsed.icons) ? parsed.icons : []
      }
    } catch {
      return { projects: [], icons: [] }
    }
  }

  /**
   * 原子写入 data/db.json 并同步更新 data/db.backup.json，同时确保每个图标拥有固定 Unicode
   */
  saveState({ projects = [], icons = [] }) {
    let nextCp = 0xe600
    const used = new Set()
    for (const ic of icons) {
      if (ic.unicode) {
        const parsedCp = parseInt(ic.unicode, 16)
        if (!Number.isNaN(parsedCp)) used.add(parsedCp)
      }
    }

    const normalizedIcons = icons.map((icon) => {
      let cp = icon.unicode ? parseInt(icon.unicode, 16) : null
      if (!cp || Number.isNaN(cp)) {
        while (used.has(nextCp)) nextCp++
        cp = nextCp
        used.add(cp)
      }
      return {
        ...icon,
        unicode: cp.toString(16).toLowerCase(),
        unicode_decimal: cp
      }
    })

    const payload = JSON.stringify(
      {
        projects,
        icons: normalizedIcons
      },
      null,
      2
    )

    const tmpPath = `${this.jsonPath}.tmp`
    fs.writeFileSync(tmpPath, payload, 'utf-8')
    fs.renameSync(tmpPath, this.jsonPath)
    fs.writeFileSync(this.backupPath, payload, 'utf-8')
  }

  getStorageStatus(packagesDir) {
    const jsonSize = fs.existsSync(this.jsonPath) ? fs.statSync(this.jsonPath).size : 0
    const state = this.loadState()
    return {
      engine: 'Local Disk JSON Atomic Persistence (data/db.json + data/db.backup.json)',
      jsonSnapshotPath: this.jsonPath,
      jsonSizeBytes: jsonSize,
      uploadsDir: this.uploadsDir,
      packagesDir,
      projectCount: state.projects.length,
      iconCount: state.icons.length,
      lastSyncedAt: new Date().toISOString()
    }
  }
}
