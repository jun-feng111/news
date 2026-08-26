// 国内专属招聘数据采集（合规、不爬 智联/BOSS直聘/猎聘）。
//
// 设计动机：
//   用户求职只找国内岗位，要求「真实招聘岗位 + 对应薪资 + 所需技能 + 职业前景/发展」。
//   直接爬 智联/BOSS 违反其 ToS 且有反爬/法律风险，故走合规渠道：
//
//   1) 技术社区（真实岗位发布）
//      - V2EX 招聘节点   https://www.v2ex.com/api/topics/show.json?node_name=jobs
//        （中文技术社区公开 API，免密，内容为真实中文招聘帖）
//      - 掘金招聘（尝试公开接口，不可达则跳过）
//
//   2) 大厂官方 / 政府公开（用搜索引擎公开报道聚合，合规）
//      - 大厂：字节/腾讯/阿里/百度/美团/京东/华为/小米/网易/拼多多/滴滴/快手 等
//        用 Bing News RSS 搜「公司 招聘 2026 薪资 岗位」，拿到真实公开发表的招聘/薪资报道，
//        结构化抽取薪资/技能/前景，标记为「大厂官方·公开报道」（非伪造岗位，是真实公开信息）。
//      - 政府：人社部/公务员/事业单位 公开招聘信息（同上，Bing 聚合真实公开报道）。
//
//   3) 搜索引擎按岗位聚合（行业洞见）
//      - 按常见岗位 × 维度（薪资/技能/前景/趋势）用 Bing News RSS 搜真实公开分析文章，
//        结构化抽取，作为「行业前景/发展」洞察区，供岗位卡匹配展示。
//
//   所有源在 GitHub Actions（海外 IP）可达；本地沙箱可能因域名限制/重定向失败，属正常。
//   任一源失败自动跳过，不影响其他源。
//
// 产出：public/data/jobs-cn.json
//   { updated, count, channels, jobs:[真实岗位], insights:[行业/大厂/政府 前景洞察] }

import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const OUT_PATH = path.join(DATA_DIR, 'jobs-cn.json')
const UA = 'Mozilla/5.0 (compatible; NewsHubCnJobBot/1.0; +https://jun-feng111.github.io/news/)'
const MAX_JOBS = 400

// ── 网络：JSON ────────────────────────────────────────
async function getJSON(url, { headers = {}, timeout = 15000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ctrl.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// ── 网络：Bing News RSS（带重定向跟随 + 超时）──────────
function fetchText(url, timeout = 30000) {
  const mod = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = mod.get(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN' },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href
        return fetchText(next, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')) })
  })
}
async function fetchTextRetry(url, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fetchText(url, 30000) }
    catch (e) { lastErr = e; if (i < tries - 1) await new Promise((r) => setTimeout(r, 800)) }
  }
  throw lastErr
}

// ── 工具 ──────────────────────────────────────────────
const shortHash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 10)
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const toDate = (iso) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function parseSalary(text) {
  if (!text || typeof text !== 'string') return { text: '', min: null, max: null, currency: 'CNY' }
  const t = text.trim()
  let currency = 'CNY'
  if (/¥|￥|CNY|RMB|元|万|k|K|w|W/i.test(t)) currency = 'CNY'
  // 中文薪资：如 "15-30k"、"1.5-3万"、"20K-35K"、"月薪8千"
  const ranges = []
  const reWan = /(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*(万|w|W|k|K)/g
  let m
  while ((m = reWan.exec(t)) !== null) {
    const unit = m[3].toLowerCase()
    const mul = unit === '万' || unit === 'w' ? 10000 : 1000
    ranges.push(parseFloat(m[1]) * mul, parseFloat(m[2]) * mul)
  }
  const reK = /(\d+(?:\.\d+)?)\s*(?:k|K)\b/g
  while ((m = reK.exec(t)) !== null) ranges.push(parseFloat(m[1]) * 1000)
  const nums = ranges.filter((n) => n > 0)
  if (nums.length === 0) return { text: t, min: null, max: null, currency }
  return { text: t, min: Math.min(...nums), max: Math.max(...nums), currency }
}

// 疑似诈骗过滤（与 collect-jobs.js 同策略）
const SCAM_PATTERNS = [
  /押金|保证金|培训费|入职费|服装费|体检费|垫付|先交|付费|会员费|激活费|报名费|工本费|资料费|手续费/,
  /加微信|加我微信|加qq|加我qq|私聊|私信|telegram|whatsapp|微信：|qq：|加我私|加我微/,
  /刷单|返利|返佣|彩票|博彩|赌博|理财|高收益|稳赚|日赚|月入过万|零门槛|无需经验|在家办公日赚|轻松日结|日结高薪|躺赚/,
  /虚拟币|外汇|币圈|传销|拉人头|资金盘|投资返利|杀猪盘/,
]
function isScam(text) {
  if (!text) return false
  return SCAM_PATTERNS.some((rx) => rx.test(String(text)))
}

// 技术关键词（从标题/正文抽技能标签）
const TECH = ['python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'javascript',
  'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'spring', 'django',
  'flask', 'docker', 'kubernetes', 'k8s', 'aws', '阿里云', '腾讯云', 'linux', 'mysql',
  'postgresql', 'redis', 'mongodb', 'elasticsearch', 'grpc', 'graphql', 'flutter',
  'swift', 'kotlin', 'php', 'ruby', 'scala', 'spark', 'hadoop', 'pytorch', 'tensorflow',
  '前端', '后端', '全栈', '算法', '数据', '运维', '测试', '产品', 'ui', 'ux']

const CATEGORY_RULES = [
  [/前端|front[\s-]?end|web前端/i, '前端'],
  [/后端|back[\s-]?end|服务端|server/i, '后端'],
  [/全栈|full[\s-]?stack/i, '全栈'],
  [/算法|机器学习|machine learning|\bml\b|人工智能|深度学习|大模型|llm|ai /i, '算法/AI'],
  [/数据|data|分析|bi\b/i, '数据'],
  [/测试|qa\b|test/i, '测试'],
  [/运维|devops|sre|系统工程师/i, '运维/SRE'],
  [/产品|product|pm\b/i, '产品'],
  [/设计|design|ui|ux/i, '设计'],
  [/运营|operation|内容|新媒体/i, '运营'],
  [/市场|marketing|增长/i, '市场'],
  [/销售|sales|商务|bd\b/i, '销售'],
  [/hr|人力|招聘|猎头/i, '人力/HR'],
]
function classify(titleRaw) {
  for (const [rx, cat] of CATEGORY_RULES) if (rx.test(titleRaw)) return cat
  return '其他'
}

// ── 渠道 1：V2EX 招聘节点（真实岗位）──────────────────
async function fromV2EX() {
  const data = await getJSON('https://www.v2ex.com/api/topics/show.json?node_name=jobs')
  const list = Array.isArray(data) ? data : []
  return list
    .filter((t) => !isScam(clean(t.title) + ' ' + (t.content || '')))
    .map((t) => {
      const titleRaw = clean(t.title)
      const member = (t.member && t.member.username) || ''
      const url = `https://www.v2ex.com/t/${t.id}`
      let title = titleRaw
      let location = '国内'
      let salaryText = ''
      const m1 = title.match(/\[([^\]]+)\]/)
      if (m1) {
        const first = m1[1].trim()
        if (/\d|k|K|w|W|薪|元|rmb|￥|¥/i.test(first)) salaryText = first
        else location = first
        title = title.replace(m1[0], '').trim()
        const m2 = title.match(/\[([^\]]{1,40})\]/)
        if (m2 && /\d|k|K|w|W|薪|元|rmb|￥|¥/i.test(m2[1])) {
          salaryText = salaryText ? `${salaryText} ${m2[1].trim()}` : m2[1].trim()
          title = title.replace(m2[0], '').trim()
        }
      }
      const s = parseSalary(salaryText)
      const hay = (titleRaw + ' ' + (t.content || '')).toLowerCase()
      const skills = TECH.filter((k) => hay.includes(k.toLowerCase()))
      const remote = /远程|remote|在家|wfh|异地|线上/i.test(titleRaw)
      return {
        id: 'v2ex-' + (t.id || shortHash(url)),
        title: title || titleRaw,
        company: member || '个人/社区发布',
        location,
        remote,
        salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency || 'CNY',
        skills,
        category: classify(titleRaw),
        prospect: '',
        postedDate: toDate(t.created) || null,
        url,
        source: 'V2EX',
        channel: '社区',
        region: 'domestic',
      }
    })
}

// ── 渠道 2：掘金招聘（尝试，不可达则跳过）──────────────
async function fromJuejin() {
  // 掘金招聘频道公开接口（带反爬，可能失败；失败即跳过）
  const url = 'https://api.juejin.cn/search_api/v1/search?spider=0&query=招聘&page=0&page_size=20&sort_type=0'
  const data = await getJSON(url, { headers: { Referer: 'https://juejin.cn/' } })
  const list = (data && data.data && data.data.length) ? data.data : []
  return list
    .filter((it) => !isScam(clean(it.title || '') + ' ' + clean(it.content || '')))
    .map((it) => {
      const titleRaw = clean(it.title || it.content || '')
      const url = it.url ? (it.url.startsWith('http') ? it.url : 'https://juejin.cn' + it.url) : 'https://juejin.cn/'
      const hay = titleRaw.toLowerCase()
      const skills = TECH.filter((k) => hay.includes(k.toLowerCase()))
      const s = parseSalary(titleRaw)
      return {
        id: 'juejin-' + (it.article_id || it.id || shortHash(url)),
        title: titleRaw.slice(0, 80),
        company: '掘金用户',
        location: '国内',
        remote: false,
        salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: 'CNY',
        skills,
        category: classify(titleRaw),
        prospect: '',
        postedDate: toDate(it.publish_time ? it.publish_time * 1000 : null) || null,
        url,
        source: '掘金',
        channel: '社区',
        region: 'domestic',
      }
    })
}

// ── Bing News RSS 解析（供渠道 3/4/5）──────────────────
function stripHtml(html) {
  return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
async function parseBingNews(xml, { includeFilter } = {}) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return mm ? mm[1].trim() : ''
    }
    const title = stripHtml(get('title'))
    const link = get('link')
    const pubDate = get('pubDate')
    const desc = stripHtml(get('description'))
    const source = stripHtml(get('source'))
    if (!title || !link) continue
    if (includeFilter && !includeFilter(title + ' ' + desc)) continue
    // 过滤明显无关
    if (/(台风|地震|暴雨|洪水|NBA|足球|篮球|奥运|娱乐|明星|电影|电视剧|股票|基金)/.test(title)) continue
    items.push({
      title,
      url: link,
      published: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      summary: desc.slice(0, 400),
      source: source || '公开报道',
    })
  }
  return items
}

// 从文本抽取结构化字段
function extractSalary(text) {
  const s = parseSalary(text)
  if (s.min) return { text: s.text, min: s.min, max: s.max }
  const m = text.match(/月薪[约]?(\d[\d.]*)\s*[-~到至]\s*(\d[\d.]*)\s*(万|k|K|元|块)/)
  if (m) return { text: m[0], min: parseFloat(m[1]) * (m[3] === '万' ? 10000 : 1000), max: parseFloat(m[2]) * (m[3] === '万' ? 10000 : 1000) }
  return { text: '', min: null, max: null }
}
function extractSkills(text) {
  return TECH.filter((k) => text.toLowerCase().includes(k.toLowerCase()))
}
function extractSentence(text, rx) {
  const sentences = text.split(/[。！？\n;；]/)
  const hit = sentences.find((s) => rx.test(s))
  return hit ? clean(hit).slice(0, 160) : ''
}

// ── 渠道 3：大厂官方（Bing 聚合真实公开招聘/薪资报道）──
const COMPANIES = ['字节跳动', '腾讯', '阿里巴巴', '百度', '美团', '京东', '华为', '小米', '网易', '拼多多', '滴滴', '快手']
async function fromBigTech() {
  const out = []
  for (const c of COMPANIES) {
    const q = `${c} 招聘 2026 薪资 岗位 要求`
    const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
    let xml
    try { xml = await fetchTextRetry(url) }
    catch (e) { console.log(`  [大厂·${c}] 跳过: ${e.message}`); continue }
    const items = await parseBingNews(xml, { includeFilter: (t) => t.includes(c) })
    for (const it of items.slice(0, 3)) {
      const sal = extractSalary(it.title + ' ' + it.summary)
      const skills = extractSkills(it.title + ' ' + it.summary)
      const prospect = extractSentence(it.summary, /(前景|趋势|需求|缺口|增长|扩招|内卷|饱和)/)
      out.push({
        id: 'big-' + shortHash(c + it.url),
        topic: c,
        type: 'company',
        title: it.title,
        salary: sal.text,
        salaryMin: sal.min, salaryMax: sal.max,
        skills,
        prospect: prospect || '（报道未直接提及前景，可点开原文查看）',
        trend: extractSentence(it.summary, /(招聘|扩招|增长|供需|行情)/),
        summary: it.summary,
        source: it.source,
        url: it.url,
        published: it.published,
        channel: '大厂官方',
      })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return out
}

// ── 渠道 4：政府公共招聘（Bing 聚合真实公开招聘信息）──
const GOV_QUERIES = [
  '人社部 公开招聘 2026 岗位',
  '公务员 招考 2026 公告',
  '事业单位 招聘 2026 岗位要求',
  '国企 招聘 2026 薪资待遇',
]
async function fromGovernment() {
  const out = []
  for (const q of GOV_QUERIES) {
    const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
    let xml
    try { xml = await fetchTextRetry(url) }
    catch (e) { console.log(`  [政府·${q.slice(0, 8)}] 跳过: ${e.message}`); continue }
    const items = await parseBingNews(xml, { includeFilter: (t) => /(招聘|招考|公考|事业单位|国企|公务员)/.test(t) })
    for (const it of items.slice(0, 4)) {
      const sal = extractSalary(it.title + ' ' + it.summary)
      const skills = extractSkills(it.title + ' ' + it.summary)
      const prospect = extractSentence(it.summary, /(前景|趋势|需求|编制|待遇|福利)/)
      out.push({
        id: 'gov-' + shortHash(q + it.url),
        topic: (it.title.slice(0, 20)),
        type: 'government',
        title: it.title,
        salary: sal.text,
        salaryMin: sal.min, salaryMax: sal.max,
        skills,
        prospect: prospect || '（公告未直接提及前景，可点开原文查看）',
        trend: extractSentence(it.summary, /(招聘|报名|考试|录用)/),
        summary: it.summary,
        source: it.source,
        url: it.url,
        published: it.published,
        channel: '政府公开',
      })
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return out
}

// ── 渠道 5：搜索引擎按岗位聚合（行业洞见/前景发展）──
const POSITIONS = [
  { name: '算法工程师', aliases: ['算法工程师', '算法岗', '机器学习工程师'] },
  { name: 'Java开发', aliases: ['Java开发', 'Java工程师', 'Java后端'] },
  { name: 'Go开发', aliases: ['Go开发', 'Go工程师', 'Golang'] },
  { name: 'Python开发', aliases: ['Python开发', 'Python工程师'] },
  { name: '前端开发', aliases: ['前端开发', '前端工程师', 'Web前端'] },
  { name: '数据分析', aliases: ['数据分析', '数据分析师', 'BI工程师'] },
  { name: '后端开发', aliases: ['后端开发', '后端工程师', '服务端'] },
  { name: '测试开发', aliases: ['测试开发', '测试工程师', '自动化测试'] },
  { name: '运维开发', aliases: ['运维开发', '运维工程师', 'DevOps', 'SRE'] },
  { name: '产品经理', aliases: ['产品经理', '产品策划'] },
  { name: 'UI设计', aliases: ['UI设计', 'UI设计师', '交互设计'] },
  { name: '嵌入式开发', aliases: ['嵌入式', '嵌入式开发', '固件工程师'] },
  { name: '安全工程师', aliases: ['安全工程师', '网络安全', '信息安全'] },
  { name: '全栈工程师', aliases: ['全栈', '全栈工程师', '全栈开发'] },
]
const DIMENSIONS = [
  { key: 'salary', label: '薪资待遇', suffix: '薪资 待遇 2026' },
  { key: 'skill', label: '技能要求', suffix: '技能要求 岗位要求' },
  { key: 'prospect', label: '就业前景', suffix: '就业前景 行业趋势' },
  { key: 'trend', label: '招聘趋势', suffix: '招聘 就业分析 报告' },
]
async function fromSearchAggregation() {
  const out = []
  for (const position of POSITIONS) {
    for (const dim of DIMENSIONS) {
      const q = `${position.name} ${dim.suffix}`
      const url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN&format=rss'
      let xml
      try { xml = await fetchTextRetry(url) }
      catch (e) { continue }
      const items = await parseBingNews(xml, {
        includeFilter: (t) => position.aliases.some((a) => t.includes(a)),
      })
      for (const it of items.slice(0, 2)) {
        const sal = extractSalary(it.title + ' ' + it.summary)
        const skills = extractSkills(it.title + ' ' + it.summary)
        const prospect = extractSentence(it.summary, /(前景|趋势|需求|缺口|增长|内卷|饱和)/)
        const trend = extractSentence(it.summary, /(招聘|增长|供需|行情|扩招)/)
        out.push({
          id: 'agg-' + shortHash(position.name + dim.key + it.url),
          topic: position.name,
          type: 'position',
          dimension: dim.key,
          dimensionLabel: dim.label,
          title: it.title,
          salary: sal.text,
          salaryMin: sal.min, salaryMax: sal.max,
          skills,
          prospect: prospect || '（报道未直接提及前景，可点开原文查看）',
          trend: trend || '（报道未直接提及趋势，可点开原文查看）',
          summary: it.summary,
          source: it.source,
          url: it.url,
          published: it.published,
          channel: '搜索引擎聚合',
        })
      }
      await new Promise((r) => setTimeout(r, 350))
    }
  }
  return out
}

// ── 主流程 ────────────────────────────────────────────
async function main() {
  const channels = {}
  const jobs = []
  const insights = []

  // 真实岗位（社区）
  for (const [name, fn, bucket] of [['V2EX', fromV2EX, 'jobs'], ['掘金', fromJuejin, 'jobs']]) {
    try {
      const items = await fn()
      channels[name] = items.length
      if (bucket === 'jobs') jobs.push(...items)
      console.log(`  [${name}] ${items.length} 条`)
    } catch (e) {
      channels[name] = 0
      console.log(`  [${name}] 跳过: ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  // 洞察（大厂/政府/岗位聚合）
  const big = await fromBigTech().catch((e) => { console.log('  [大厂官方] 异常跳过: ' + e.message); return [] })
  channels['大厂官方'] = big.length
  insights.push(...big)
  console.log(`  [大厂官方] ${big.length} 条`)

  const gov = await fromGovernment().catch((e) => { console.log('  [政府公开] 异常跳过: ' + e.message); return [] })
  channels['政府公开'] = gov.length
  insights.push(...gov)
  console.log(`  [政府公开] ${gov.length} 条`)

  const agg = await fromSearchAggregation().catch((e) => { console.log('  [搜索引擎聚合] 异常跳过: ' + e.message); return [] })
  channels['搜索引擎聚合'] = agg.length
  insights.push(...agg)
  console.log(`  [搜索引擎聚合] ${agg.length} 条`)

  // 岗位去重
  const seen = new Set()
  const deduped = []
  for (const j of jobs) {
    const key = j.url.startsWith('http') ? j.url : (j.title + '|' + j.company)
    const h = shortHash(key)
    if (seen.has(h)) continue
    seen.add(h)
    deduped.push(j)
  }
  deduped.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))
  const finalJobs = deduped.slice(0, MAX_JOBS)

  // 洞察按发布时间倒序
  insights.sort((a, b) => (b.published || '').localeCompare(a.published || ''))

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated: new Date().toISOString(),
    count: finalJobs.length,
    insightCount: insights.length,
    channels,
    note: '国内岗位来自 V2EX/掘金 等社区真实发布；大厂/政府/行业前景来自搜索引擎公开报道聚合（合规，非伪造岗位）。求职请以企业官方渠道核实。',
    jobs: finalJobs,
    insights,
  }, null, 2))
  console.log(`jobs-cn.json 写入完成: 岗位 ${finalJobs.length} 条，洞察 ${insights.length} 条`)
}

main().catch((e) => {
  console.log('collect-jobs-cn 异常（已跳过，不影响主流程）: ' + e.message)
})
