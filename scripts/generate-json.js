import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')
const FEEDS_PATH = path.join(process.cwd(), 'src', 'data', 'feeds.json')

// 来源强制归类：修正历史上被错误归入其它板块的来源（如中新网社会/教育曾误标为"就业"）。
// 即使 raw/processed 里已存旧分类，每次生成都会按来源纠正，保证旧数据自愈。
const SOURCE_TO_CATEGORY = {
  '中新网社会': '社会',
  '中新网教育': '社会',
}

function normalizeCategory(cat) {
  if (!cat) return '综合'
  const c = cat.toLowerCase()
  if (c.includes('ai') || c.includes('人工')) return 'AI'
  if (c.includes('政策') || c.includes('政府') || c.includes('时政') || c.includes('政务')) return '政策'
  if (c.includes('就业') || c.includes('创业') || c.includes('大学生') || c.includes('人社') || c.includes('招聘') || c.includes('人才')) return '就业'
  if (c.includes('财经') || c.includes('金融') || c.includes('经济')) return '财经'
  if (c.includes('开发') || c.includes('编程') || c.includes('代码') || c.includes('物联网') || c.includes('计算机') || c.includes('软件')) return '开发'
  if (c.includes('科技') || c.includes('tech')) return '科技'
  if (c.includes('社会') || c.includes('教育')) return '社会'
  return '综合'
}

// 标题归一化：去空白、统一小写、去掉末尾 " - 媒体名" 之类后缀，用于同板块去重
function normTitleKey(t) {
  return (t || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-—|·_~].{0,40}$/, '')
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

function main() {
  let articles = []
  if (fs.existsSync(PROCESSED_PATH)) {
    articles = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'))
  }

  for (const a of articles) {
    // 优先按来源强制归类（修正历史错误），否则走关键词归一化
    a.category = SOURCE_TO_CATEGORY[a.source] || normalizeCategory(a.category)
  }

  // 同板块标题去重（必须在归一化分类之后、排序之前）
  articles = dedupeByCategory(articles)

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
