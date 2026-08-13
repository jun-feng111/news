// 抓取「智联招聘 / BOSS直聘」相关就业市场信息，并入「就业」板块。
//
// 背景：智联(zhaopin.com)与BOSS(zhipin.com)首页均为 SPA，职位/报告数据走 XHR，
// 纯 Node HTTP 抓不到正文；且其研究院报告散落在 21财经/搜狐/新浪等媒体转载页。
// 本脚本用「新闻搜索 RSS」做发现层，自动拿到这些报告的媒体转载链接与摘要：
//   - 发现层 = Google News RSS（news.google.com/rss/search），在美国 IP（GitHub Actions）直连可用。
//   - 注意：从中国大陆（如广西）直连 Google 会被墙，该步会超时并优雅跳过；
//     此时由 feeds.json 里的主干 RSS（中新网财经/社会、教育部）兜底就业内容。
// 产出结构与 raw-articles.json 完全一致，下游 fetch-content / ai-process / cluster 照常处理。

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const CATEGORY = '就业'
const SOURCE_DEFAULT = '就业报告'

// 发现层：Google News RSS 搜索（按关键词）。gl/hl/ceid 设为中国简体。
function discoveryUrl(q) {
  return 'https://news.google.com/rss/search?q=' +
    encodeURIComponent(q) + '&hl=zh-CN&gl=CN&ceid=CN:zh-Hans'
}

// 检索词：覆盖「智联/Boss 品牌报告」+「大学生就业市场行情」
const QUERIES = [
  '智联招聘 就业报告',
  'BOSS直聘 研究院 报告',
  '大学生就业 市场行情',
  '春招 秋招 应届生 就业',
]

function fetchText(url, timeout = 30000) {
  const mod = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0', 'Accept-Language': 'zh-CN' },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(new URL(res.headers.location, url).href, timeout).then(resolve, reject)
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

// Bing News RSS 兜底（美国 runner 上通常比 Google 更稳，且返回真实文章链接）
function bingUrl(q) {
  return 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
}

// 带一次重试的抓取，避免偶发超时
async function fetchTextRetry(url, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fetchText(url, 30000) }
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

// 从标题/摘要判断品牌，用于 source 标注
function detectBrand(text) {
  if (/智联/.test(text)) return '智联招聘'
  if (/BOSS|看准|直聘/.test(text)) return 'BOSS直聘'
  return ''
}

// 只保留与「就业/招聘/应届」相关的条目，过滤无关噪声
function isJobRelated(text) {
  return /(就业|招聘|智联|BOSS|看准|直聘|春招|秋招|应届|毕业生|职场|求职|人才|薪酬|工资|岗位)/.test(text)
}

function parseNews(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return mm ? mm[1].trim() : ''
    }
    const title = decodeEntities(get('title'))
    const link = get('link')
    const pubDate = get('pubDate')
    const desc = stripHtml(get('description'))
    const source = get('source')
    if (title && link && isJobRelated(title + desc)) {
      const brand = detectBrand(title + desc)
      items.push({
        title: title.replace(/\s*-\s*[^-\s]{1,20}$/, ''), // 去掉 " - 媒体名" 后缀
        url: link,
        published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        content: desc.slice(0, 1500),
        source: brand || source || SOURCE_DEFAULT,
      })
    }
  }
  return items
}

async function main() {
  const existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map(a => a.id))

  let collected = []
  let okQueries = 0
  for (const q of QUERIES) {
    let xml = null, used = ''
    try {
      xml = await fetchTextRetry(discoveryUrl(q)); used = 'Google'
    } catch (e1) {
      try {
        xml = await fetchTextRetry(bingUrl(q)); used = 'Bing'
      } catch (e2) {
        console.log(`  发现[${q}] 跳过（Google/Bing 均不可达）: ${e2.message}`)
        continue
      }
    }
    const items = parseNews(xml)
    collected.push(...items)
    okQueries++
    console.log(`  发现[${q}](${used}): ${items.length} 条`)
    await new Promise(r => setTimeout(r, 600))
  }

  if (okQueries === 0) {
    console.log('Google/Bing News RSS 发现层全部不可达。「就业」板块由 feeds.json 主干 RSS 兜底。')
    return
  }

  // 去重（同一条可能被多个关键词命中）
  const seen = new Set()
  let added = 0
  for (const it of collected) {
    const id = crypto.createHash('md5').update(it.url).digest('hex').slice(0, 12)
    if (existingIds.has(id) || seen.has(id)) continue
    seen.add(id)
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
    added++
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(existing, null, 2))
  console.log(`就业市场报告并入完成: 新增 ${added} 条，当前 raw 共 ${existing.length} 条`)
}

main().catch((e) => {
  // 整步失败也不拖垮主流程：仅记录，raw 文件保持上一步状态
  console.log('collect-job-reports 异常（已跳过，不影响 RSS 主干）: ' + e.message)
})
