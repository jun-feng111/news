import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')
const CLUSTER_PATH = path.join(DATA_DIR, 'clusters.json')

function similarity(a, b) {
  const setA = new Set(a.tags || [])
  const setB = new Set(b.tags || [])
  const intersection = [...setA].filter(x => setB.has(x)).length
  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0
}

function main() {
  if (!fs.existsSync(PROCESSED_PATH)) {
    console.log('无处理数据，请先运行 ai-process.js')
    return
  }

  const articles = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'))
  const clusters = []
  const assigned = new Set()

  for (const article of articles) {
    if (assigned.has(article.id)) continue
    const cluster = { id: `event_${clusters.length}`, title: article.title.slice(0, 30), articles: [article.id] }
    assigned.add(article.id)

    for (const other of articles) {
      if (assigned.has(other.id)) continue
      if (similarity(article, other) > 0.3) {
        cluster.articles.push(other.id)
        assigned.add(other.id)
      }
    }

    if (cluster.articles.length > 1) {
      clusters.push(cluster)
    }
  }

  for (const article of articles) {
    const cluster = clusters.find(c => c.articles.includes(article.id))
    if (cluster) article.cluster_id = cluster.id
  }

  fs.writeFileSync(CLUSTER_PATH, JSON.stringify(clusters, null, 2))
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(articles, null, 2))
  console.log(`聚合完成: ${clusters.length} 个事件组`)
}

main()