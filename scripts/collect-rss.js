import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const FEEDS_PATH = path.join(process.cwd(), 'src', 'data', 'feeds.json')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve, reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        // 检测字符编码（默认 UTF-8；GBK/GB2312 等需正确解码，否则中文变乱码）
        let charset = 'utf-8'
        const ct = (res.headers['content-type'] || '').toLowerCase()
        const cm = ct.match(/charset=([\w-]+)/)
        if (cm) charset = cm[1]
        // 若 content-type 未声明，从 <?xml ... encoding="..."?> 探测
        if (charset === 'utf-8') {
          const head = buf.slice(0, 1024).toString('latin1')
          const xm = head.match(/encoding=["']?([\w-]+)/i)
          if (xm) charset = xm[1]
        }
        try {
          resolve(new TextDecoder(charset).decode(buf))
        } catch {
          // 解码失败时退化为 UTF-8，避免整批崩溃
          resolve(buf.toString('utf-8'))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// 解析 Bing/Google 跟踪 URL，跟随重定向获取真实文章地址
// Bing News RSS 返回的 link 通常是 bing.com/news/ap/... 跳转页，
// 直接在浏览器打开会报"此URL可能不是由Bing生成的"
// 策略1：从查询参数直接提取嵌入 URL（零网络开销）
// 策略2：跟随 HTTP 重定向
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
  // 非跟踪 URL 直接返回
  if (!/(bing\.com\/news\/ap|bing\.com\/news\/search|google\.com\/url|google\.com\/search|news\.google\.com\/rss\/articles|news\.baidu\.com\/link)/.test(url)) return url
  // 先尝试参数提取
  const embedded = extractEmbeddedUrl(url)
  if (embedded) return embedded
  // 提取不到再走 HTTP 重定向
  return new Promise((resolve) => {
    try {
      const mod = url.startsWith('https') ? https : http
      const req = mod.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0' },
        timeout: 8000,
      }, (res) => {
        // 跟随重定向链到最终 URL
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // 处理相对路径
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href
          resolve(resolveRealUrl(next)) // 递归跟随
        } else {
          // 到达最终地址（可能是真实文章页或无法继续）
          // 如果最终仍是 bing 域名，说明无法解析，保留原 URL 让前端处理
          if (new URL(res.url || url).hostname.includes('bing.com')) {
            resolve(url) // 无法解析，返回原始 URL
          } else {
            resolve(res.url || url)
          }
        }
        req.destroy() // 不需要读取 body
      })
      req.on('error', () => resolve(url)) // 解析失败时保留原 URL
      req.on('timeout', () => { req.destroy(); resolve(url) })
    } catch {
      resolve(url)
    }
  })
}

// 标题归一化：用于去重比较（去空格、统一大小写、去掉常见媒体后缀）
function normalizeTitle(t) {
  return t.toLowerCase().replace(/\s+/g, '').replace(/[-—|·_~].{0,40}$/, '').trim()
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim()
}

async function parseRSS(xml, sourceName, category) {
  const articles = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

  const parseItem = async (block) => {
    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return m ? stripHtml(m[1]).trim() : ''
    }
    const getLink = () => {
      const m = block.match(/<link[^>]*href="([^"]+)"/i) || block.match(/<link>([^<]+)<\/link>/i)
      return m ? m[1].trim() : ''
    }
    const title = getTag('title')
    const link = getLink()
    const pubDate = getTag('pubDate') || getTag('published') || getTag('updated')
    const description = getTag('description') || getTag('summary') || ''
    // 必须有可解析的发布时间，否则丢弃：避免把"无日期/远古"的垃圾(如 2008 年中新网旧闻)
    // 因解析失败被强行填成"今天"而混入综合等板块
    const pubTime = pubDate ? new Date(pubDate).getTime() : NaN
    if (title && link && !isNaN(pubTime)) {
      // 解析 Bing/Google 跟踪 URL 为真实文章地址
      const realLink = await resolveRealUrl(link)
      articles.push({
        id: crypto.createHash('md5').update(realLink).digest('hex').slice(0, 12),
        title,
        url: realLink,
        content: stripHtml(description).slice(0, 2000),
        source: sourceName,
        category,
        published: new Date(pubTime).toISOString(),
        fetched: new Date().toISOString(),
      })
    }
  }

  let match
  while ((match = itemRegex.exec(xml)) !== null) await parseItem(match[1])
  while ((match = entryRegex.exec(xml)) !== null) await parseItem(match[1])
  return articles
}

async function main() {
  const feeds = JSON.parse(fs.readFileSync(FEEDS_PATH, 'utf8'))
  const existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map(a => a.id))
  // 标题去重集合（归一化后的标题）
  const existingTitles = new Set(existing.map(a => normalizeTitle(a.title)))

  let newCount = 0
  for (const feed of feeds) {
    try {
      console.log(`采集: ${feed.name} ...`)
      const xml = await fetchText(feed.url)
      const articles = await parseRSS(xml, feed.name, feed.category)
      for (const article of articles) {
        if (!existingIds.has(article.id)) {
          // 双重去重：URL + 标题
          const normTitle = normalizeTitle(article.title)
          if (!existingTitles.has(normTitle) && article.title.length > 8) {
            existing.push(article)
            existingIds.add(article.id)
            existingTitles.add(normTitle)
            newCount++
          }
        }
      }
      console.log(`  ${feed.name}: ${articles.length} 篇 (新增 ${articles.filter(a => !existingTitles.has(normalizeTitle(a.title))).length})`)
    } catch (e) {
      console.log(`  ${feed.name} 失败: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  const sevenDaysAgo = Date.now() - 7 * 86400000
  const filtered = existing.filter(a => {
    const t = new Date(a.published).getTime()
    return isNaN(t) || t > sevenDaysAgo
  })

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(filtered, null, 2))
  console.log(`\n采集完成: 新增${newCount}篇, 共${filtered.length}篇`)
  console.log(`DEBUG: existing=${existing.length}, filtered=${filtered.length}, newCount=${newCount}`)
}

main().catch(console.error)