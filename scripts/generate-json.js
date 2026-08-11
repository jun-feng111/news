import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')
const FEEDS_PATH = path.join(process.cwd(), 'src', 'data', 'feeds.json')

function normalizeCategory(cat) {
  if (!cat) return '综合'
  const c = cat.toLowerCase()
  if (c.includes('ai') || c.includes('人工')) return 'AI'
  if (c.includes('政策') || c.includes('政府') || c.includes('时政') || c.includes('政务')) return '政策'
  if (c.includes('就业') || c.includes('创业') || c.includes('大学生') || c.includes('人社') || c.includes('招聘') || c.includes('人才')) return '就业'
  if (c.includes('财经') || c.includes('金融') || c.includes('经济')) return '财经'
  if (c.includes('开发') || c.includes('编程') || c.includes('代码') || c.includes('物联网') || c.includes('计算机') || c.includes('软件')) return '开发'
  if (c.includes('科技') || c.includes('tech')) return '科技'
  return '综合'
}

function main() {
  let articles = []
  if (fs.existsSync(PROCESSED_PATH)) {
    articles = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'))
  }

  for (const a of articles) {
    a.category = normalizeCategory(a.category)
  }

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
