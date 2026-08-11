import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')

function fetchHtml(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 NewsHub/2.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        const loc = res.headers.location
        if (loc) return fetchHtml(loc, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function extractImage(dom, url) {
  try {
    const doc = dom.window.document
    const og = doc.querySelector('meta[property="og:image"]')
    if (og?.content) return og.content
    const tw = doc.querySelector('meta[name="twitter:image"]')
    if (tw?.content) return tw.content
    const article = doc.querySelector('article img, .article-content img, .post-content img, main img')
    if (article?.src) {
      try { return new URL(article.src, url).href } catch { return article.src }
    }
    const firstImg = doc.querySelector('img[src]')
    if (firstImg?.src) {
      try { return new URL(firstImg.src, url).href } catch { return firstImg.src }
    }
  } catch {}
  return ''
}

async function fetchFullContent(url) {
  const html = await fetchHtml(url)
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  const image = extractImage(dom, url)
  return {
    contentHtml: article?.content || '',
    contentText: article?.textContent || '',
    excerpt: article?.excerpt || '',
    image,
  }
}

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.log('无原始数据，请先运行 collect-rss.js')
    return
  }

  const articles = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
  const needFetch = articles.filter(a => !a.contentFull && !a.fetchedFull)
  console.log(`全文抓取: ${needFetch.length}/${articles.length} 篇需要抓取`)

  let ok = 0, fail = 0
  for (let i = 0; i < needFetch.length; i++) {
    const a = needFetch[i]
    try {
      const result = await fetchFullContent(a.url)
      a.contentFull = result.contentText.slice(0, 8000) || a.content
      a.contentHtml = result.contentHtml.slice(0, 30000) || ''
      a.image = result.image || a.image || ''
      a.fetchedFull = new Date().toISOString()
      ok++
      process.stdout.write('✓')
    } catch (e) {
      a.contentFull = a.content || ''
      a.fetchedFull = 'failed'
      fail++
      process.stdout.write('✗')
    }

    if ((i + 1) % 3 === 0) {
      fs.writeFileSync(RAW_PATH, JSON.stringify(articles, null, 2))
      process.stdout.write(` ${i + 1}/${needFetch.length}\n`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  fs.writeFileSync(RAW_PATH, JSON.stringify(articles, null, 2))
  console.log(`\n全文抓取完成: ${ok}篇成功, ${fail}篇失败`)
}

main().catch(console.error)