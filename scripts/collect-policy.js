// 抓取多源「大学生就业创业政策」新闻，并入「政策」板块。
//
// 设计动机：
//   - 早期"政策"板块被中新网时政/滚动的灾害体育新闻占据，几乎没有就业创业政策。
//   - 教育部目录由 collect-moe-policy.js 单独抓取（HTML 解析），本脚本补充其它来源：
//     1) 人社部、国务院等部委政策目录（HTML 解析，与教育部同思路）
//     2) Bing News RSS 关键词发现层（拿到媒体转载链接，覆盖地方政策与解读文章）
//   - 全部归到"政策"分类，与"就业"板块（招聘/求职/秋招等市场动态）形成互补。
//
// 产出结构与 raw-articles.json 完全一致，下游 fetch-content / ai-process / cluster 照常处理。

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const CATEGORY = '政策'

// ── 来源1：部委政策目录页（HTML 解析）──
// 每个目录页抓取 <a href="...srcsite/..."> 形式的政策条目。
// regex 用于在页面 HTML 中定位政策链接（与 collect-moe-policy.js 同思路）
const CATALOG_SOURCES = [
  {
    name: '人社部',
    // 人社部「就业创业」政策文件目录
    url: 'https://www.mohrss.gov.cn/xxgk2020/xxgk/zcfg/gfxwj/rcrs/',
    // 人社部政策链接通常含 srcsite 或 /xxgk 路径
    linkRegex: /<a[^>]*href="([^"]*(?:srcsite|xxgk)[^"]*\.s?html?)"[^>]*>([\s\S]*?)<\/a>/gi,
    // 进一步过滤：标题必须含就业/创业/高校毕业生/大学生 等关键词
    titleFilter: (t) => /(就业|创业|高校毕业生|大学生|毕业生|职业|技能|岗位|人才|灵活就业|见习|实习)/.test(t),
  },
  {
    name: '人社部·政策文件',
    url: 'https://www.mohrss.gov.cn/xxgk2020/xxgk/zcfg/gfxwj/',
    linkRegex: /<a[^>]*href="([^"]*(?:srcsite|xxgk)[^"]*\.s?html?)"[^>]*>([\s\S]*?)<\/a>/gi,
    titleFilter: (t) => /(就业|创业|高校毕业生|大学生|毕业生|职业|技能|人才|见习)/.test(t),
  },
  {
    name: '中国政府网·就业',
    // 中国政府网「就业」频道政策文件
    url: 'https://sousuo.www.gov.cn/sousuo/search.shtml?code=17da2e6d&t=zhengcelibrary_gw&q=%E5%B0%B1%E4%B8%9A%E5%88%9B%E4%B8%9A',
    linkRegex: /<a[^>]*href="(https?:\/\/[^"]*gov\.cn[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    titleFilter: (t) => /(就业|创业|高校毕业生|大学生|毕业生|职业|技能|人才|见习|灵活就业)/.test(t),
  },
]

// ── 来源2：Bing News RSS 关键词发现层 ──
// Bing 在中国大陆可正常访问，返回 bing.com/news/ap 跳转链接，
// 由 resolveRealUrl 解析成真实文章地址。
const BING_QUERIES = [
  '大学生就业创业政策',
  '高校毕业生就业政策',
  '人社部 就业创业 政策',
  '大学生创业扶持政策',
  '高校毕业生 就业补贴 政策',
  '大学生 创业担保贷款 政策',
  '应届生 就业见习 政策',
  '灵活就业 大学生 政策',
  '大学生 就业帮扶 政策',
  '高校毕业生 创业孵化 政策',
]

function fetchText(url, timeout = 20000) {
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
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function fetchTextRetry(url, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fetchText(url, 20000) }
    catch (e) { lastErr = e; if (i < tries - 1) await new Promise(r => setTimeout(r, 800)) }
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

// 标题归一化（去重用）
function normalizeTitle(t) {
  return t.toLowerCase().replace(/\s+/g, '').replace(/[-—|·_~].{0,40}$/, '').trim()
}

// 政策文种词：用于判定一条新闻是否真的是"政策文件"而非"政策解读/会议报道"
const POLICY_DOC_TYPES = /(通知|办法|条例|意见|方案|规定|决定|公告|通告|实施细则|印发|若干政策|政策措施|扶持政策|补贴政策|帮扶政策|三年行动|行动计划)/

// 主题词：必须命中至少一个，才认定为"就业创业政策"
const POLICY_TOPIC = /(就业|创业|高校毕业生|大学生|毕业生|职业|技能|人才|见习|实习|灵活就业|就业帮扶|创业担保|创业孵化|就业补贴)/

// 综合判定：标题或正文是否属于"大学生就业创业政策"
function isEmploymentPolicyNews(title, content) {
  const text = (title + ' ' + (content || '')).slice(0, 500)
  if (!POLICY_TOPIC.test(text)) return false
  // 标题含政策文种词，直接认定
  if (POLICY_DOC_TYPES.test(title)) return true
  // 否则要求正文也命中政策文种词，且标题含"政策"二字
  if (/政策/.test(title) && POLICY_DOC_TYPES.test(content || '')) return true
  return false
}

// ── 抓取部委目录页 ──
async function collectFromCatalogs() {
  const items = []
  for (const src of CATALOG_SOURCES) {
    let xml = null
    try {
      xml = await fetchTextRetry(src.url)
    } catch (e) {
      console.log(`  目录[${src.name}] 跳过: ${e.message}`)
      continue
    }
    const re = new RegExp(src.linkRegex.source, src.linkRegex.flags)
    const seen = new Set()
    let m
    let cnt = 0
    while ((m = re.exec(xml)) !== null) {
      const href = m[1]
      const title = stripHtml(m[2]).replace(/\s+/g, ' ').trim()
      if (title.length < 6) continue
      if (!src.titleFilter(title)) continue
      let abs
      try { abs = new URL(href, src.url).href } catch { continue }
      if (seen.has(abs)) continue
      seen.add(abs)
      // 从 URL 解析发布日期：.../t20260602_1438600.html
      const dm = abs.match(/\/t(\d{8})_/)
      const published = dm
        ? new Date(`${dm[1].slice(0, 4)}-${dm[1].slice(4, 6)}-${dm[1].slice(6, 8)}`).toISOString()
        : new Date().toISOString()
      items.push({ title, url: abs, published, source: src.name, content: '' })
      cnt++
    }
    console.log(`  目录[${src.name}]: ${cnt} 条`)
    await new Promise(r => setTimeout(r, 500))
  }
  return items
}

// ── 抓取 Bing News RSS 发现层 ──
async function collectFromBing() {
  const items = []
  let okQueries = 0
  for (const q of BING_QUERIES) {
    const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
    let xml = null
    try {
      xml = await fetchTextRetry(url)
    } catch (e) {
      console.log(`  发现[${q}] 跳过: ${e.message}`)
      continue
    }
    const re = /<item>([\s\S]*?)<\/item>/gi
    let m
    let cnt = 0
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
      const srcTag = stripHtml(get('source'))
      if (!title || !link) continue
      // 严格过滤：必须是就业创业政策新闻，避免噪声
      if (!isEmploymentPolicyNews(title, desc)) continue
      const realLink = await resolveRealUrl(link)
      items.push({
        title: title.replace(/\s*-\s*[^-\s]{1,20}$/, ''),
        url: realLink,
        published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        content: desc.slice(0, 1500),
        source: srcTag || '就业创业政策',
      })
      cnt++
    }

    console.log(`  发现[${q}](Bing): ${cnt} 条`)
    okQueries++
    await new Promise(r => setTimeout(r, 600))
  }
  if (okQueries === 0) {
    console.log('  Bing News RSS 发现层全部不可达，仅依赖部委目录源。')
  }
  return items
}

async function main() {
  const existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map(a => a.id))
  const existingTitles = new Set(existing.map(a => normalizeTitle(a.title)))

  console.log('抓取部委就业创业政策目录 ...')
  const catalogItems = await collectFromCatalogs()

  console.log('抓取 Bing 就业创业政策发现层 ...')
  const bingItems = await collectFromBing()

  const allItems = [...catalogItems, ...bingItems]
  console.log(`  共收集 ${allItems.length} 条候选政策`)

  // 只保留近 180 天政策（政策生命周期较长，比新闻放宽）
  const WINDOW = 180 * 86400000
  let added = 0
  for (const it of allItems) {
    const id = crypto.createHash('md5').update(it.url).digest('hex').slice(0, 12)
    if (existingIds.has(id)) {
      // 已存在：若旧分类不是"政策"，强制纠正为"政策"
      const idx = existing.findIndex(a => a.id === id)
      if (idx >= 0 && existing[idx].category !== CATEGORY) existing[idx].category = CATEGORY
      continue
    }
    const normTitle = normalizeTitle(it.title)
    if (existingTitles.has(normTitle)) continue
    const pubTime = new Date(it.published).getTime()
    if (!isNaN(pubTime) && Date.now() - pubTime > WINDOW) continue

    existing.push({
      id,
      title: it.title,
      url: it.url,
      content: it.content || '',
      source: it.source,
      category: CATEGORY,
      published: it.published,
      fetched: new Date().toISOString(),
    })
    existingIds.add(id)
    existingTitles.add(normTitle)
    added++
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(existing, null, 2))
  console.log(`就业创业政策并入完成: 新增 ${added} 条，当前 raw 共 ${existing.length} 条（归到"政策"板块）`)
}

main().catch((e) => {
  console.log('collect-policy 异常（已跳过，不影响主流程）: ' + e.message)
})