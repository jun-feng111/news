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
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim()
}

function parseRSS(xml, sourceName, category) {
  const articles = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi

  const parseItem = (block) => {
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
    if (title && link) {
      articles.push({
        id: crypto.createHash('md5').update(link).digest('hex').slice(0, 12),
        title,
        url: link,
        content: stripHtml(description).slice(0, 2000),
        source: sourceName,
        category,
        published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        fetched: new Date().toISOString(),
      })
    }
  }

  let match
  while ((match = itemRegex.exec(xml)) !== null) parseItem(match[1])
  while ((match = entryRegex.exec(xml)) !== null) parseItem(match[1])
  return articles
}

async function main() {
  const feeds = JSON.parse(fs.readFileSync(FEEDS_PATH, 'utf8'))
  const existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map(a => a.id))

  let newCount = 0
  for (const feed of feeds) {
    try {
      console.log(`采集: ${feed.name} ...`)
      const xml = await fetchText(feed.url)
      const articles = parseRSS(xml, feed.name, feed.category)
      for (const article of articles) {
        if (!existingIds.has(article.id)) {
          existing.push(article)
          existingIds.add(article.id)
          newCount++
        }
      }
      console.log(`  ${feed.name}: ${articles.length} 篇`)
    } catch (e) {
      console.log(`  ${feed.name} 失败: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  const sevenDaysAgo = Date.now() - 7 * 86400000
  const filtered = existing.filter(a => new Date(a.published).getTime() > sevenDaysAgo)

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(filtered, null, 2))
  console.log(`\n采集完成: 新增${newCount}篇, 共${filtered.length}篇`)
}

main().catch(console.error)