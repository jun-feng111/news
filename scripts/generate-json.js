import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const FEEDS_PATH = path.join(process.cwd(), 'src', 'data', 'feeds.json')

// 来源强制归类：修正历史上被错误归入其它板块的来源。
// 即使 raw/processed 里已存旧分类，每次生成都会按来源纠正，保证旧数据自愈。
//
// 关键修复（2026-08-18）：
//   - 中新网时政/滚动曾误标为"政策"，导致政策板块全是灾害/体育/外交新闻，已改为"综合"
//   - 教育部/人社部/国务院等部委政策曾误标为"就业"，已改为"政策"
//   - Bing·大学生就业政策/高校毕业生就业创业政策/人社部就业创业政策/大学生创业扶持政策
//     这几个 feeds.json 新增的政策源，强制归"政策"
const SOURCE_TO_CATEGORY = {
  '中新网社会': '社会',
  '中新网教育': '社会',
  '中新网时政': '综合',
  '中新网滚动': '综合',
  '教育部': '政策',
  '人社部': '政策',
  '人社部·政策文件': '政策',
  '中国政府网·就业': '政策',
  'Bing·大学生就业政策': '政策',
  'Bing·高校毕业生就业创业政策': '政策',
  'Bing·人社部就业创业政策': '政策',
  'Bing·大学生创业扶持政策': '政策',
  '就业创业政策': '政策',
}

function normalizeCategory(cat) {
  if (!cat) return '综合'
  const c = cat.toLowerCase()
  if (c.includes('ai') || c.includes('人工')) return 'AI'
  // "政策"分类严格化：只有明确标注为"政策"的才归政策，
  // "时政/政府/政务"不再归"政策"（这些是综合时政新闻，不是政策文件）
  if (c.includes('政策')) return '政策'
  if (c.includes('就业') || c.includes('创业') || c.includes('大学生') || c.includes('人社') || c.includes('招聘') || c.includes('人才')) return '就业'
  if (c.includes('财经') || c.includes('金融') || c.includes('经济')) return '财经'
  if (c.includes('开发') || c.includes('编程') || c.includes('代码') || c.includes('物联网') || c.includes('计算机') || c.includes('软件')) return '开发'
  if (c.includes('科技') || c.includes('tech')) return '科技'
  if (c.includes('社会') || c.includes('教育')) return '社会'
  if (c.includes('时政') || c.includes('政府') || c.includes('政务') || c.includes('综合')) return '综合'
  return '综合'
}

// 标题归一化：去空白、统一小写、去掉末尾 " - 媒体名" 之类后缀，用于同板块去重
// 注意：先去末尾" - 媒体名"后缀（此时还有空格），再去所有空白
// 早期版本用 /[-—|·_~].{0,40}$/ 会把 "2025-06-10教育部..." 截成 "2025"，导致多条政策误判重复
// 修复：要求分隔符前后有空格（\s[-—|·_~]\s），只匹配 " - 媒体名" 这种后缀，不误删日期
function normTitleKey(t) {
  return (t || '')
    .toLowerCase()
    .replace(/\s[-—|·_~]\s.{0,40}$/, '')   // 先去 " - 媒体名" 后缀（分隔符前后有空格）
    .replace(/\s+/g, '')                     // 再去所有空白
    .trim()
}

// 按 (分类, 归一化标题) 去重，保留评分最高的一篇，消除抓取重复（如 Bing 秋招 154→6）
function dedupeByCategory(articles) {
  const best = new Map()
  for (const a of articles) {
    const key = (a.category || '综合') + '|' + normTitleKey(a.title)
    const prev = best.get(key)
    if (!prev || (a.score || 0) > (prev.score || 0)) best.set(key, a)
  }
  return [...best.values()]
}

// ── 时间过滤：淘汰过期文章，只保留最近 N 天的内容 ──
// 默认 90 天（覆盖秋招/春招周期），可通过环境变量 MAX_AGE_DAYS 覆盖
// 政策分类例外：用户要求只保留一年内的政策，用 365 天窗口
const MAX_AGE_DAYS = Number(process.env.MAX_AGE_DAYS) || 90
const POLICY_MAX_AGE_DAYS = Number(process.env.POLICY_MAX_AGE_DAYS) || 365

function filterByAge(articles) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000
  const policyCutoff = Date.now() - POLICY_MAX_AGE_DAYS * 86400000
  const before = articles.length
  const fresh = articles.filter(a => {
    const d = a.pubDate || a.date || a.published || ''
    if (!d) return true // 无日期的保留，不误杀
    const ts = new Date(d).getTime()
    if (isNaN(ts)) return true // 无法解析的保留
    // 政策分类用更长的窗口
    if (a.category === '政策') return ts >= policyCutoff
    return ts >= cutoff
  })
  const removed = before - fresh.length
  if (removed > 0) {
    console.log(`  时间过滤: 淘汰 ${removed} 篇超过 ${MAX_AGE_DAYS} 天的旧文章（政策分类用 ${POLICY_MAX_AGE_DAYS} 天），保留 ${fresh.length} 篇`)
  }
  return fresh
}

function main() {
  let articles = []
  // 合并 processed-articles.json（AI 处理后，含摘要/评分/标签）和 raw-articles.json（最新采集）
  // 场景：collect-moe-policy.js / collect-policy.js 新抓的政策在 raw 里，但还没跑 ai-process.js，
  // 此时 processed 里没有这些新文章。合并确保新采集的政策能立即出现在前端，不必等 AI 处理。
  const processedMap = new Map()
  if (fs.existsSync(PROCESSED_PATH)) {
    const processed = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'))
    for (const a of processed) processedMap.set(a.id, a)
  }
  if (fs.existsSync(RAW_PATH)) {
    const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
    for (const a of raw) {
      if (!processedMap.has(a.id)) {
        // raw 里有但 processed 里没有：用 raw 的原始字段，补默认摘要/评分
        processedMap.set(a.id, {
          ...a,
          summary: a.summary || a.title,
          score: a.score || 50,
          tags: a.tags || [],
        })
      }
    }
  }
  articles = [...processedMap.values()]

  for (const a of articles) {
    // 优先按来源强制归类（修正历史错误），否则走关键词归一化
    a.category = SOURCE_TO_CATEGORY[a.source] || normalizeCategory(a.category)
  }

  // 同板块标题去重（必须在归一化分类之后、排序之前）
  articles = dedupeByCategory(articles)

  // 淘汰过期旧文章（默认保留 90 天内）
  articles = filterByAge(articles)

  articles.sort((a, b) => (b.score || 0) - (a.score || 0))

  const topToday = articles.slice(0, 10)

  const byCategory = {}
  for (const a of articles) {
    const cat = a.category || '综合'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(a)
  }

  const categoryTop = {}
  for (const [cat, list] of Object.entries(byCategory)) {
    categoryTop[cat] = list.slice(0, 5)
  }

  const byDate = {}
  for (const a of articles) {
    const date = (a.published || '').slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(a)
  }

  fs.writeFileSync(path.join(DATA_DIR, 'articles.json'), JSON.stringify(articles, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'top-today.json'), JSON.stringify(topToday, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'category-top.json'), JSON.stringify(categoryTop, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'articles-by-category.json'), JSON.stringify(byCategory, null, 2))
  fs.writeFileSync(path.join(DATA_DIR, 'articles-by-date.json'), JSON.stringify(byDate, null, 2))

  const feeds = JSON.parse(fs.readFileSync(FEEDS_PATH, 'utf8'))
  fs.writeFileSync(path.join(DATA_DIR, 'feeds.json'), JSON.stringify(feeds, null, 2))

  console.log(`生成完成: ${articles.length} 篇文章`)
  console.log(`  top-today.json: ${topToday.length} 篇`)
  console.log(`  category-top.json: ${Object.keys(categoryTop).map(k => `${k}(${categoryTop[k].length})`).join(', ')}`)
  console.log(`  分类: ${Object.keys(byCategory).join(', ')}`)
}

main()
