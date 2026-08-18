// 抓取教育部「高校毕业生就业创业」政策文件目录，作为"政策"板块的权威政策源。
// 采集器 collect-rss.js 只支持 RSS，而教育部无 RSS，故这里单独做 HTML 目录解析。
// 产出结构与 raw-articles.json 完全一致，下游 fetch-content / ai-process / cluster 照常处理。
//
// 说明：早期版本曾把教育部政策归到"就业"分类，导致"政策"板块反而没有大学生就业创业政策，
// 全被中新网时政/滚动的灾害体育新闻占据。现已纠正：教育部政策归到"政策"板块，
// 与"就业"板块（招聘/求职/秋招等市场动态）形成互补。

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')

// 教育部「高校毕业生就业创业」政策文件目录页
const CATALOG_URL = 'https://www.moe.gov.cn/jyb_xxgk/xxgk/neirong/fenlei/sxml_gdjy/gdjy_bysjycy/bysjycy_bsxwj'
const SOURCE_NAME = '教育部'
const CATEGORY = '政策'

function fetchText(url) {
  const mod = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 NewsHub/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
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

// 从目录页提取「高校毕业生就业创业」政策条目：href 含 srcsite/A15/s3265 的 <a>
function parseCatalog(xml) {
  const re = /<a[^>]*href="([^"]*srcsite\/A15\/s3265[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  const out = []
  const seen = new Set()
  let m
  while ((m = re.exec(xml)) !== null) {
    const href = m[1]
    const title = stripHtml(m[2]).replace(/\s+/g, ' ').trim()
    if (title.length < 4) continue
    let abs
    try { abs = new URL(href, CATALOG_URL).href } catch { continue }
    if (seen.has(abs)) continue
    seen.add(abs)
    // 尽量从 URL 解析发布日期：.../t20260602_1438600.html
    const dm = abs.match(/\/t(\d{8})_/)
    const published = dm
      ? new Date(`${dm[1].slice(0, 4)}-${dm[1].slice(4, 6)}-${dm[1].slice(6, 8)}`).toISOString()
      : new Date().toISOString()
    out.push({ title, url: abs, published })
  }
  return out
}

async function main() {
  let existing = fs.existsSync(RAW_PATH) ? JSON.parse(fs.readFileSync(RAW_PATH, 'utf8')) : []
  const existingIds = new Set(existing.map(a => a.id))

  console.log('抓取教育部政策目录 ...')
  let items = []
  try {
    const xml = await fetchText(CATALOG_URL)
    items = parseCatalog(xml)
    console.log(`  目录解析到 ${items.length} 条政策`)
  } catch (e) {
    console.log(`  教育部目录抓取失败（跳过，不影响 RSS 主流程）: ${e.message}`)
    return
  }

  // 政策窗口 365 天（1 年）：用户要求只保留一年内的政策，超过 365 天的不要
  const POLICY_WINDOW = 365 * 86400000
  let added = 0
  for (const it of items) {
    const id = crypto.createHash('md5').update(it.url).digest('hex').slice(0, 12)
    // 教育部政策归到"政策"板块：即使 raw 里已存旧分类(就业)，也强制覆盖为"政策"
    if (existingIds.has(id)) {
      const idx = existing.findIndex(a => a.id === id)
      if (idx >= 0 && existing[idx].category !== CATEGORY) existing[idx].category = CATEGORY
      continue
    }
    // 保留近 730 天政策（政策生命周期长，比新闻放宽）
    const pubTime = new Date(it.published).getTime()
    if (!isNaN(pubTime) && Date.now() - pubTime > POLICY_WINDOW) continue
    existing.push({
      id,
      title: it.title,
      url: it.url,
      content: '',
      source: SOURCE_NAME,
      category: CATEGORY,
      published: it.published,
      fetched: new Date().toISOString(),
    })
    existingIds.add(id)
    added++
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(RAW_PATH, JSON.stringify(existing, null, 2))
  console.log(`教育部政策并入完成: 新增 ${added} 条，当前 raw 共 ${existing.length} 条（归到"政策"板块）`)
}

main().catch(console.error)
