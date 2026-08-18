// 一次性修复脚本：纠正 raw-articles.json / processed-articles.json 中被错误分类的文章。
//
// 修复背景（2026-08-18）：
//   "政策"板块曾被灾害/体育/外交等综合时政新闻占据，几乎没有大学生就业创业政策。
//   根因：
//     1) feeds.json 把"中新网时政"标为"政策"，但中新网时政涵盖各类时政新闻
//     2) generate-json.js 的 normalizeCategory 把含"政府/时政/政务"的分类都归到"政策"
//     3) collect-moe-policy.js 把教育部政策归到了"就业"分类
//   本脚本对历史数据做一次性纠正，配合上述根因修复一起生效。
//
// 用法：node scripts/fix-policy-category.js
// 安全：原文件会备份为 *.bak.json，可随时回滚。

import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')

// 来源 → 强制分类（与 generate-json.js 的 SOURCE_TO_CATEGORY 保持一致）
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

// 政策文种词：标题必须命中才认定为"政策文件"
const POLICY_DOC = /(通知|办法|条例|意见|方案|规定|决定|公告|通告|实施细则|印发|若干政策|政策措施|扶持政策|补贴政策|帮扶政策|三年行动|行动计划)/
// 政策主体词
const POLICY_BODY = /(国务院|部委|教育部|人社部|财政部|发改委|省政府|省厅|市局|办公室|办公厅|部门|中央|省政府办公厅|联合开展)/
// 就业创业主题词
const EMP_TOPIC = /(就业|创业|高校毕业生|大学生|毕业生|职业|技能|人才|见习|灵活就业|就业帮扶|创业担保|创业孵化|就业补贴|求职|招聘|职场|春招|秋招|校招)/

// 综合判定一篇新闻是否真的是"政策文件"
function isRealPolicy(article) {
  const title = article.title || ''
  const content = (article.content || '').slice(0, 500)
  // 1) 标题含政策文种 + (政策主体 或 就业创业主题) → 政策
  if (POLICY_DOC.test(title) && (POLICY_BODY.test(title) || EMP_TOPIC.test(title))) return true
  // 2) 标题含"政策" + 就业创业主题 → 政策（如"大学生就业政策解读"）
  if (/政策/.test(title) && EMP_TOPIC.test(title)) return true
  // 3) 来源是部委/政策目录 → 政策
  if (SOURCE_TO_CATEGORY[article.source] === '政策') return true
  // 4) URL 是 moe.gov.cn / mohrss.gov.cn / gov.cn 等政府站点 → 政策
  if (/(moe\.gov\.cn|mohrss\.gov\.cn|www\.gov\.cn|gov\.cn\/zhengce)/.test(article.url || '')) return true
  // 5) 内容里同时命中政策文种 + 就业创业主题 + 政策主体 → 政策
  if (POLICY_DOC.test(content) && EMP_TOPIC.test(content) && POLICY_BODY.test(content)) return true
  return false
}

// 对单篇文章重新判定分类（仅在需要时调用）
function reclassify(article) {
  // 优先按来源强制归类
  if (SOURCE_TO_CATEGORY[article.source]) {
    return SOURCE_TO_CATEGORY[article.source]
  }
  // 当前是"政策"但不符合真实政策判定 → 重新归到"综合"或"社会"
  if (article.category === '政策' && !isRealPolicy(article)) {
    const text = (article.title + ' ' + (article.content || '')).toLowerCase()
    if (/社会|事故|灾害|救援|民生|台风|地震|暴雨|洪水/.test(text)) return '社会'
    if (/股市|基金|融资|经济|金融|投资|国债|金价|央行|货币/.test(text)) return '财经'
    if (/体育|nba|足球|篮球|比赛|奥运|全运会|热身赛/.test(text)) return '综合'
    return '综合'
  }
  // 当前是"就业"但其实是政策文件（如教育部政策曾误标"就业"）→ 政策
  if (article.category === '就业' && isRealPolicy(article) && !/(招聘|求职|秋招|春招|校招|薪酬|职场|面试|offer|内推)/.test(article.title)) {
    return '政策'
  }
  return article.category
}

function backupAndFix(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`跳过(不存在): ${filePath}`)
    return
  }
  const bakPath = filePath.replace(/\.json$/, '.bak.json')
  // 已有备份就不覆盖，保留最早的原始版本
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(filePath, bakPath)
    console.log(`已备份: ${path.basename(bakPath)}`)
  }

  const articles = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const stat = { policyToOther: 0, jobToPolicy: 0, sourceForce: 0, total: articles.length }

  for (const a of articles) {
    const before = a.category
    const after = reclassify(a)
    if (before !== after) {
      a.category = after
      if (before === '政策' && after !== '政策') stat.policyToOther++
      else if (before === '就业' && after === '政策') stat.jobToPolicy++
      else stat.sourceForce++
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(articles, null, 2))
  console.log(`修复 ${path.basename(filePath)}: 共 ${stat.total} 篇`)
  console.log(`  政策 → 其它: ${stat.policyToOther} 篇`)
  console.log(`  就业 → 政策: ${stat.jobToPolicy} 篇`)
  console.log(`  来源强制归类: ${stat.sourceForce} 篇`)
}

function main() {
  console.log('=== 修复历史分类错误 ===\n')
  console.log('[1/2] 修复 raw-articles.json')
  backupAndFix(RAW_PATH)
  console.log('')
  console.log('[2/2] 修复 processed-articles.json')
  backupAndFix(PROCESSED_PATH)
  console.log('\n修复完成。下一步请运行: node scripts/generate-json.js')
}

main()