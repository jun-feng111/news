/**
 * resolve-urls.js — 扫描已生成的 JSON 数据，把 Bing/Google 跟踪链接解析成真实文章地址
 *
 * 用途：作为工作流步骤，在 generate-json 之后、vite build 之前运行。
 *       每次运行都会自动补救采集时 resolveRealUrl 失败（超时/网络抖动）的旧链接。
 *
 * 运行方式：node scripts/resolve-urls.js
 * 依赖：无（只用 Node 内置 https/http + URL）
 */

const fs = require('fs')
const path = require('path')
const { https, http } = require('url')

const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

// ── 匹配需要解析的跟踪 URL ──
const TRACKING_RE = /bing\.com\/news\/ap|news\.google\.com\/rss\/articles|bing\.com\/news\/search|google\.com\/url|google\.com\/search/

function isTrackingUrl(url) {
  return url && TRACKING_RE.test(url)
}

// ── 跟随重定向获取真实 URL（最多跳 5 次，每跳 6 秒超时）──
function resolveRealUrl(url) {
  return new Promise((resolve) => {
    if (!isTrackingUrl(url)) return resolve(url)

    const maxHops = 5
    let currentUrl = url
    let hops = 0

    const doHop = (targetUrl) => {
      hops++
      if (hops > maxHops) {
        // 跳太多次了，保留最后一次拿到的地址（可能还是跟踪页，但比原始好）
        console.log(`  ⚠ 达到最大跳转次数(${maxHops})，保留: ${currentUrl.slice(0, 80)}`)
        return resolve(currentUrl)
      }

      try {
        const parsed = new URL(targetUrl)
        const useHttps = parsed.protocol === 'https:'
        const mod = useHttps ? require('https') : require('http')

        const req = mod.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          },
          timeout: 6000
        }, (res) => {
          // 3xx 重定向 → 跟踪
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let next = res.headers.location
            // 处理相对路径
            if (!next.startsWith('http')) {
              next = new URL(next, targetUrl).href
            }
            console.log(`  → ${res.statusCode} → ${next.slice(0, 80)}`)
            currentUrl = next
            // 短暂延迟避免被限流
            setTimeout(() => doHop(next), 200)
          } else {
            // 2xx 或其他 → 这就是最终真实地址
            req.destroy() // 不需要读 body
            console.log(`  ✓ 解析成功 (${hops}跳): ${targetUrl.slice(0, 80)}`)
            resolve(targetUrl)
          }
        })

        req.on('error', (err) => {
          console.log(`  ✗ 网络错误: ${err.message}`)
          resolve(currentUrl) // 返回目前最好的结果
        })

        req.on('timeout', () => {
          console.log(`  ✗ 超时(6s)`)
          req.destroy()
          resolve(currentUrl)
        })
      } catch (e) {
        console.log(`  ✗ URL 解析异常: ${e.message}`)
        resolve(currentUrl)
      }
    }

    doHop(currentUrl)
  })
}

// ── 主流程 ──
async function main() {
  const jsonFiles = [
    'articles.json',
    'articles-by-category.json',
    'processed-articles.json'
  ]

  let totalFixed = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.log(`⏭ ${file} 不存在，跳过`)
      continue
    }

    console.log(`\n📂 处理 ${file} ...`)

    let data
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.log(`✗ ${file} JSON 解析失败: ${e.message}`)
      continue
    }

    // 支持数组或对象（articles-by-category 是 {分类: [文章]}）
    const isArray = Array.isArray(data)
    const items = isArray ? data : Object.values(data).flat()

    const trackingItems = items.filter(a => isTrackingUrl(a.url))
    console.log(`  总 ${items.length} 篇，其中跟踪链接 ${trackingItems.length} 篇`)

    if (trackingItems.length === 0) {
      console.log(`  ✅ 无需修复`)
      continue
    }

    // 批量解析（并发 8，避免触发限流）
    const BATCH_SIZE = 8
    let fixed = 0
    let failed = 0

    for (let i = 0; i < trackingItems.length; i += BATCH_SIZE) {
      const batch = trackingItems.slice(i, i + BATCH_SIZE)
      console.log(`\n  📦 批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(trackingItems.length / BATCH_SIZE)} (${batch.length} 条)`)

      const results = await Promise.all(
        batch.map(async (item) => {
          const originalUrl = item.url
          console.log(`\n  [${i + batch.indexOf(item) + 1}/${trackingItems.length}] ${item.title?.slice(0, 40) || '(无标题)'}`)
          console.log(`    原始: ${originalUrl.slice(0, 90)}`)

          const resolved = await resolveRealUrl(originalUrl)

          if (resolved !== originalUrl && !isTrackingUrl(resolved)) {
            item.url = resolved
            console.log(`    ✅ → ${resolved.slice(0, 90)}`)
            return true
          } else if (resolved !== originalUrl && isTrackingUrl(resolved)) {
            console.log(`    ⚠️ 仍为跟踪链接（可能是多级跳转链路）`)
            return false
          } else {
            console.log(`    ❌ 未改变`)
            return false
          }
        })
      )

      fixed += results.filter(Boolean).length
      failed += results.filter(r => !r).length

      // 批次间稍作停顿
      if (i + BATCH_SIZE < trackingItems.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    // 写回文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`\n  📊 ${file}: 修复 ${fixed} | 失败 ${failed} | 跳过非跟踪 ${items.length - trackingItems.length}`)

    totalFixed += fixed
    totalFailed += failed
    totalSkipped += items.length - trackingItems.length
  }

  console.log('\n' + '='.repeat(50))
  console.log(`🏁 总计: 修复 ${totalFixed} | 失败 ${totalFailed} | 跳过 ${totalSkipped}`)
  console.log('='.repeat(50))

  if (totalFixed > 0) {
    console.log('\n✅ 有链接被修复，后续 Build 步骤将使用更新后的数据')
  } else {
    console.log('\nℹ 本次无需修复（所有跟踪链接可能已解析完毕或网络不可达）')
  }
}

main().catch(e => {
  console.error('resolve-urls 致命错误:', e)
  process.exit(1)
})
