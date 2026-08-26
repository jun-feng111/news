// 抓取各技术岗位的详细就业分析：薪资区间、技能需求、行业前景、就业趋势。
//
// 设计动机：
//   用户要求就业板块像 BOSS 直聘/智联招聘那样有详细的岗位薪资、前景、技能需求。
//   BOSS/智联是 SPA，职位详情走 XHR API，纯 Node HTTP 抓不到；其研究院报告散落在媒体转载页。
//   本脚本用 Bing News RSS 做发现层，按「岗位 × 维度」组合搜索，拿到媒体转载的岗位分析文章：
//     - 维度1: 薪资（"{岗位} 薪资 2026"）
//     - 维度2: 前景（"{岗位} 就业前景 行业"）
//     - 维度3: 技能（"{岗位} 技能要求 岗位"）
//     - 维度4: 趋势（"{岗位} 就业趋势 招聘"）
//   Bing News RSS 在 GitHub Actions（海外 IP）可达，本地可能被重定向到 cn.bing.com。
//
// 产出结构与 raw-articles.json 完全一致，归到"就业"分类；
// 同时额外导出结构化文件 public/data/china-jobs.json（按岗位+维度聚合），
// 供「中国岗位分析」独立展示区（src/views/ChinaJobs.vue）使用。

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const CHINA_JOBS_PATH = path.join(DATA_DIR, 'china-jobs.json')
const CATEGORY = '就业'

// ── 岗位列表：覆盖全部常见技术岗 ──
// 每个岗位配一组别名（用于标题匹配过滤）和搜索后缀
const POSITIONS = [
  { name: '算法工程师', aliases: ['算法工程师', '算法岗', '机器学习工程师', 'ML工程师'] },
  { name: 'AI工程师', aliases: ['AI工程师', '人工智能工程师', '大模型工程师', 'LLM工程师', 'AIGC工程师'] },
  { name: 'Java开发', aliases: ['Java开发', 'Java工程师', 'Java后端', 'Java程序员'] },
  { name: 'Go开发', aliases: ['Go开发', 'Go工程师', 'Golang', 'Go后端'] },
  { name: 'Python开发', aliases: ['Python开发', 'Python工程师', 'Python后端', 'Python程序员'] },
  { name: '前端开发', aliases: ['前端开发', '前端工程师', 'Web前端', '前端程序员', 'Vue', 'React开发'] },
  { name: '数据分析', aliases: ['数据分析', '数据分析师', '数据挖掘', 'BI工程师'] },
  { name: '数据科学', aliases: ['数据科学', '数据科学家', '数据工程师', '大数据工程师'] },
  { name: '产品经理', aliases: ['产品经理', '产品总监', '产品策划'] },
  { name: '测试开发', aliases: ['测试开发', '测试工程师', '软件测试', '自动化测试'] },
  { name: '运维开发', aliases: ['运维开发', '运维工程师', 'DevOps', 'SRE', '系统运维'] },
  { name: 'UI设计', aliases: ['UI设计', 'UI设计师', '视觉设计', '交互设计', 'UX设计'] },
  { name: '全栈工程师', aliases: ['全栈', '全栈工程师', '全栈开发'] },
  { name: '嵌入式开发', aliases: ['嵌入式', '嵌入式开发', '固件工程师'] },
  { name: '安全工程师', aliases: ['安全工程师', '网络安全', '信息安全', '渗透测试'] },
]

// ── 搜索维度：每个岗位 × 每个维度 = 一条 Bing News RSS 查询 ──
// label 用于前端「中国岗位分析」页的维度筛选展示
const DIMENSIONS = [
  { key: 'salary', label: '薪资待遇', suffix: '薪资 待遇 2026', filter: /(薪资|薪水|待遇|月薪|年薪|薪酬|工资|收入)/ },
  { key: 'prospect', label: '就业前景', suffix: '就业前景 行业趋势', filter: /(前景|趋势|行业|市场|需求|缺口|饱和|内卷|就业率)/ },
  { key: 'skill', label: '技能要求', suffix: '技能要求 岗位要求', filter: /(技能|要求|能力|技术栈|必备|掌握|熟练|精通|资格)/ },
  { key: 'trend', label: '招聘趋势', suffix: '招聘 就业分析 报告', filter: /(招聘|就业|分析|报告|趋势|行情|供需)/ },
]

// 只保留近 180 天的文章（岗位分析有时效性，但比新闻宽）
const MAX_AGE_MS = 180 * 86400000

function fetchText(url, timeout = 30000) {
  const mod = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0', 'Accept-Language': 'zh-CN' },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href
        return fetchText(next, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function fetchTextRetry(url, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fetchText(url, 30000) }
    catch (e) { lastErr = e; if (i < tries - 1) await new Promise((r) => setTimeout(r, 800)) }
  }
  throw lastErr
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
}

function stripHtml(html) {
  return decodeEntities(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// 解析 Bing/Google/百度 跟踪 URL 获取真实文章地址
function extractEmbeddedUrl(url) {
  try {
    let clean = url.replace(/&amp;/g, '&')
    const p = new URL(clean)
    if (p.hostname.includes('bing.com') && p.pathname.includes('apiclick')) {
      const e = p.searchParams.get('url')
      if (e) { const d = decodeURIComponent(e); if (d.startsWith('http')) return d }
    }
    if (p.hostname.includes('baidu.com') && p.pathname.includes('/link')) {
      const e = p.searchParams.get('url')
      if (e) { const d = decodeURIComponent(e); if (d.startsWith('http')) return d }
    }
  } catch (_) {}
  return null
}

async function resolveRealUrl(url) {
  if (!/(bing\.com\/news\/ap|bing\.com\/news\/search|google\.com\/url|news\.google\.com\/rss\/articles|news\.baidu\.com\/link)/.test(url)) return url
  const embedded = extractEmbeddedUrl(url)
  if (embedded) return embedded
  return new Promise((resolve) => {
    try {
      const mod = url.startsWith('https') ? https : http
      const req = mod.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0' },
        timeout: 8000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href
          resolve(resolveRealUrl(next))
        } else {
          try {
            if (new URL(res.url || url).hostname.includes('bing.com')) resolve(url)
            else resolve(res.url || url)
          } catch { resolve(url) }
        }
        req.destroy()
      })
      req.on('error', () => resolve(url))
      req.on('timeout', () => { req.destroy(); resolve(url) })
    } catch { resolve(url) }
  })
}

function normalizeTitle(t) {
  return t.toLowerCase().replace(/\s+/g, '').replace(/\s[-—|·_~]\s.{0,40}$/, '').trim()
}

// 判定一篇文章是否真的是「岗位分析」（含岗位名 + 维度关键词）
function isJobAnalysis(title, desc, position, dimension) {
  const text = title + ' ' + desc
  // 必须命中岗位名（任一别名）
  const hitPosition = position.aliases.some((a) => text.includes(a))
  if (!hitPosition) return false
  // 必须命中维度关键词
  if (!dimension.filter.test(text)) return false
  // 排除明显无关的（灾害/体育/娱乐）
  if (/(台风|地震|暴雨|洪水|NBA|足球|篮球|奥运|娱乐|明星|电影|电视剧)/.test(title)) return false
  return true
}

// 从标题/摘要判断品牌（用于「中国岗位分析」页标注来源机构）
function detectBrand(text) {
  if (/智联/.test(text)) return '智联招聘'
  if (/BOSS|看准|直聘/.test(text)) return 'BOSS直聘'
  return ''
}

async function parseBingNews(xml, position, dimension) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return mm ? mm[1].trim() : ''
    }
    const title = stripHtml(get('title'))
    const link = get('link')
    const pubDate = get('pubDate')
    const desc = stripHtml(get('description'))
    const source = stripHtml(get('source'))
    if (!title || !link) continue
    if (!isJobAnalysis(title, desc, position, dimension)) continue
    const realLink = await resolveRealUrl(link)
    items.push({
      title: title.replace(/\s*-\s*[^-\s]{1,20}$/, ''),
      url: realLink,
      published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      content: desc.slice(0, 1500),
      source: source || `${position.name}·就业分析`,
      // ↓ 供「中国岗位分析」页做结构化展示（独立数据集 china-jobs.json）
      position: position.name,
      dimension: dimension.key,
      dimensionLabel: dimension.label,
      brand: detectBrand(title + ' ' + desc),
      summary: desc.slice(0, 280),
    })
  }
  return items
}

async function main() {
  const existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map((a) => a.id))
  const existingTitles = new Set(existing.map((a) => normalizeTitle(a.title)))

  console.log('抓取各技术岗位就业分析（薪资/前景/技能/趋势）...\n')
  const allItems = []
  let okQueries = 0
  let totalQueries = 0

  for (const position of POSITIONS) {
    for (const dimension of DIMENSIONS) {
      totalQueries++
      const q = `${position.name} ${dimension.suffix}`
      const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
      let xml = null
      try {
        xml = await fetchTextRetry(url)
      } catch (e) {
        console.log(`  [${position.name}/${dimension.key}] 跳过: ${e.message}`)
        continue
      }
      const items = await parseBingNews(xml, position, dimension)
      allItems.push(...items)
      okQueries++
      console.log(`  [${position.name}/${dimension.key}] ${items.length} 条`)
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`\n查询完成: ${okQueries}/${totalQueries} 成功，共 ${allItems.length} 条候选`)

  if (okQueries === 0) {
    console.log('Bing News RSS 全部不可达（本地环境常见）。在 GitHub Actions 海外环境下会正常抓取。')
    console.log('就业板块由 feeds.json 主干 RSS + collect-job-reports.js 兜底。')
    return
  }

  // 去重并并入 raw
  const seen = new Set()
  let added = 0
  const now = Date.now()
  for (const it of allItems) {
    const id = crypto.createHash('md5').update(it.url).digest('hex').slice(0, 12)
    if (existingIds.has(id) || seen.has(id)) continue
    const normTitle = normalizeTitle(it.title)
    if (existingTitles.has(normTitle) || seen.has(normTitle)) continue
    // 时间过滤
    const pubTime = new Date(it.published).getTime()
    if (!isNaN(pubTime) && now - pubTime > MAX_AGE_MS) continue

    existing.push({
      id,
      title: it.title,
      url: it.url,
      content: it.content,
      source: it.source,
      category: CATEGORY,
      published: it.published,
      fetched: new Date().toISOString(),
    })
    existingIds.add(id)
    existingTitles.add(normTitle)
    seen.add(id)
    seen.add(normTitle)
    added++
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(existing, null, 2))
  console.log(`岗位就业分析并入完成: 新增 ${added} 条，当前 raw 共 ${existing.length} 条`)

  // ── 额外导出结构化「中国岗位分析」数据集（独立展示区用）──
  // 同一篇文章可能命中多个岗位/维度，按 id 聚合为一条，union 岗位与维度，便于前端按岗位/维度筛选。
  const chinaMap = new Map()
  for (const it of allItems) {
    const id = crypto.createHash('md5').update(it.url).digest('hex').slice(0, 12)
    const pubTime = new Date(it.published).getTime()
    if (!isNaN(pubTime) && now - pubTime > MAX_AGE_MS) continue
    if (!chinaMap.has(id)) {
      chinaMap.set(id, {
        id,
        title: it.title,
        url: it.url,
        source: it.source,
        brand: it.brand || '',
        published: it.published,
        summary: it.summary || '',
        position: it.position,
        positions: [it.position],
        dimensions: [it.dimensionLabel],
        tags: [it.position, it.dimensionLabel],
      })
    } else {
      const e = chinaMap.get(id)
      if (!e.positions.includes(it.position)) e.positions.push(it.position)
      if (!e.dimensions.includes(it.dimensionLabel)) e.dimensions.push(it.dimensionLabel)
      for (const t of [it.position, it.dimensionLabel]) {
        if (!e.tags.includes(t)) e.tags.push(t)
      }
    }
  }
  const chinaItems = [...chinaMap.values()].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  )
  const chinaData = {
    generatedAt: new Date().toISOString(),
    count: chinaItems.length,
    positions: [...new Set(chinaItems.flatMap((i) => i.positions))].sort(),
    dimensions: DIMENSIONS.map((d) => ({ key: d.key, label: d.label })),
    items: chinaItems,
  }
  fs.writeFileSync(CHINA_JOBS_PATH, JSON.stringify(chinaData, null, 2))
  console.log(`中国岗位分析数据集导出完成: ${chinaItems.length} 条 -> ${path.basename(CHINA_JOBS_PATH)}`)
}

main().catch((e) => {
  console.log('collect-job-details 异常（已跳过，不影响主流程）: ' + e.message)
})