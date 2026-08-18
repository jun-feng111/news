/**
 * derive-lite.js — 在 resolve-urls 之后运行。
 * 从已修正链接的 articles-lite.json 派生 top-today.json / category-top.json
 * （均为精简字段，供首页/分类页使用）。放在 resolve-urls 之后，可保证
 * 其中的 url 已是解析后的真实地址，避免首页/分类页出现 Bing 跟踪跳转页。
 *
 * 运行方式：node scripts/derive-lite.js
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const LITE_PATH = path.join(DATA_DIR, 'articles-lite.json')

function main() {
  if (!fs.existsSync(LITE_PATH)) {
    console.error('articles-lite.json 不存在，请先运行 generate-json.js')
    process.exit(1)
  }
  const articles = JSON.parse(fs.readFileSync(LITE_PATH, 'utf8'))

  const topToday = articles.slice(0, 10)
  fs.writeFileSync(path.join(DATA_DIR, 'top-today.json'), JSON.stringify(topToday, null, 2))

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
  fs.writeFileSync(path.join(DATA_DIR, 'category-top.json'), JSON.stringify(categoryTop, null, 2))

  console.log(`derive-lite: top-today ${topToday.length} 篇, 分类 ${Object.keys(categoryTop).length} 个`)
}

main()
