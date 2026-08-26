// 合规求职数据采集：从有公开授权 / 免密 API 的合法数据源拉取真实岗位。
//
// 数据源（均为官方公开 API，非爬虫、不触碰招聘站反爬）：
//   - V2EX（国内优先）: https://www.v2ex.com/api/topics/show.json?node_name=jobs
//                       （中文技术社区公开 API，免密，岗位为中文，region=domestic）
//   - RemoteOK   : https://remoteok.com/api                       （免密，需 UA）
//   - Remotive   : https://remotive.com/api/remote-jobs           （免密）
//   - Arbeitnow  : https://www.arbeitnow.com/api/job-board-api    （免密）
//   - Adzuna     : https://api.adzuna.com/v1/api/jobs/{country}/search/1
//                  （可选；需免费 app_id/app_key，存于 GitHub Actions secret，不进代码）
//
// 红线：不直爬 智联/BOSS直聘/猎聘 等（SPA 反爬 + 违反 ToS + 不正当竞争风险）。
//
// 产出：public/data/jobs.json
//   { updated, count, sources:{...}, jobs:[ {id,title,company,location,remote,
//     salaryText,salaryMin,salaryMax,salaryCurrency,skills,category,postedDate,url,source} ] }

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const OUT_PATH = path.join(DATA_DIR, 'jobs.json')
const MAX_JOBS = 500
const UA = 'Mozilla/5.0 (compatible; NewsHubJobBot/1.0; +https://jun-feng111.github.io/news/)'

// ── 网络 ──────────────────────────────────────────────
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

// ── 薪资解析（尽力而为，仅用于按薪资排序）──────────────
function parseSalary(text) {
  if (!text || typeof text !== 'string') return { text: '', min: null, max: null, currency: '' }
  const t = text.trim()
  let currency = 'USD'
  if (/¥|￥|CNY|RMB/i.test(t)) currency = 'CNY'
  else if (/€|EUR/i.test(t)) currency = 'EUR'
  else if (/£|GBP/i.test(t)) currency = 'GBP'
  else if (/₹|INR/i.test(t)) currency = 'INR'
  else if (/\$|USD/i.test(t)) currency = 'USD'
  const re = /(?:[\$£€¥₹]|\b)\s*(\d[\d,.]*)\s*([kKmML]?)/g
  const nums = []
  let m
  while ((m = re.exec(t)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''))
    const suf = (m[2] || '').toLowerCase()
    if (suf === 'k') n *= 1000
    else if (suf === 'm') n *= 1000000
    else if (suf === 'l') n *= 100000
    if (n > 0) nums.push(n)
  }
  if (nums.length === 0) return { text: t, min: null, max: null, currency }
  return { text: t, min: Math.min(...nums), max: Math.max(...nums), currency }
}

const shortHash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 10)
const toDate = (isoOrUnix) => {
  const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

// ── 疑似诈骗过滤（合规红线之上的额外防护）─────────────
// 招聘板/V2EX 论坛均可能混入驻骗帖（押金/垫付/刷单/私加微信等），从源头剔除。
const SCAM_PATTERNS = [
  /押金|保证金|培训费|入职费|服装费|体检费|垫付|先交|付费|会员费|激活费|报名费|工本费|资料费|手续费/,
  /加微信|加我微信|加qq|加我qq|私聊|私信|telegram|whatsapp|微信：|qq：|加我私|加我微/,
  /刷单|返利|返佣|彩票|博彩|赌博|理财|高收益|稳赚|日赚|月入过万|零门槛|无需经验|在家办公日赚|轻松日结|日结高薪|躺赚/,
  /虚拟币|外汇|币圈|传销|拉人头|资金盘|投资返利|杀猪盘/,
  /upfront|deposit fee|pay.{0,12}(fee|first)|training fee|recruiting fee|whatsapp|telegram|get rich|easy money|work from home.{0,6}(daily|earn)/i,
]
function isScam(text) {
  if (!text) return false
  return SCAM_PATTERNS.some((rx) => rx.test(String(text)))
}

// ── 各源适配器 ────────────────────────────────────────
async function fromRemoteOK() {
  const data = await getJSON('https://remoteok.com/api', { headers: { 'User-Agent': UA } })
  // 第一个元素是法律声明，跳过
  return (Array.isArray(data) ? data.slice(1) : []).map((j) => {
    const s = parseSalary(j.salary)
    const loc = clean(j.location)
    return {
      id: 'remoteok-' + (j.id || shortHash(j.url || j.position)),
      title: clean(j.position),
      company: clean(j.company),
      location: loc || 'Remote',
      remote: /remote|worldwide|anywhere/i.test(loc) || !loc,
      salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency,
      skills: (j.tags || []).map((t) => clean(t)).filter(Boolean).slice(0, 12),
      category: (j.tags && j.tags[0]) ? clean(j.tags[0]) : 'Software',
      postedDate: toDate(j.date) || null,
      url: j.url && j.url.startsWith('http') ? j.url : 'https://remoteok.com' + (j.url || ''),
      source: 'RemoteOK',
      region: 'foreign',
    }
  }).filter((j) => !isScam(j.title + ' ' + (j.skills || []).join(' ')))
}

async function fromRemotive() {
  const data = await getJSON('https://remotive.com/api/remote-jobs?limit=100')
  const list = (data && data.jobs) || []
  return list.map((j) => {
    const s = parseSalary(j.salary)
    const loc = clean(j.candidate_required_location)
    return {
      id: 'remotive-' + (j.id || shortHash(j.url || j.title)),
      title: clean(j.title),
      company: clean(j.company_name),
      location: loc || 'Remote',
      remote: true,
      salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency,
      skills: (j.tags || []).map((t) => clean(t)).filter(Boolean).slice(0, 12),
      category: clean(j.category) || 'Software',
      postedDate: (j.publication_date || '').slice(0, 10) || null,
      url: j.url,
      source: 'Remotive',
      region: 'foreign',
    }
  }).filter((j) => !isScam(j.title + ' ' + (j.skills || []).join(' ')))
}

async function fromArbeitnow() {
  const data = await getJSON('https://www.arbeitnow.com/api/job-board-api')
  const list = (data && data.data) || []
  return list.map((j) => {
    const s = parseSalary(j.salary || '')
    const loc = clean(j.location)
    return {
      id: 'arbeitnow-' + (j.slug || shortHash(j.url || j.title)),
      title: clean(j.title),
      company: clean(j.company_name),
      location: loc || 'Europe',
      remote: j.remote === true || /remote|worldwide|anywhere/i.test(loc),
      salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency,
      skills: (j.tags || []).map((t) => clean(t)).filter(Boolean).slice(0, 12),
      category: (j.job_types && j.job_types[0]) ? clean(j.job_types[0]) : 'Software',
      postedDate: (j.created_at || '').slice(0, 10) || null,
      url: j.url,
      source: 'Arbeitnow',
      region: 'foreign',
    }
  }).filter((j) => !isScam(j.title + ' ' + (j.skills || []).join(' ')))
}

async function fromAdzuna() {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []
  const country = process.env.ADZUNA_COUNTRY || 'gb'
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1` +
    `?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
    `&results_per_page=50&what=developer&content-type=application/json`
  const data = await getJSON(url)
  const list = (data && data.results) || []
  return list.map((j) => {
    const loc = clean(j.location && j.location.display_name)
    const sal = (j.salary_min || j.salary_max)
      ? { text: `${j.salary_min || ''}-${j.salary_max || ''}`, min: j.salary_min || null, max: j.salary_max || null, currency: 'GBP' }
      : { text: '', min: null, max: null, currency: '' }
    return {
      id: 'adzuna-' + (j.id || shortHash(j.redirect_url || j.title)),
      title: clean(j.title),
      company: clean(j.company && j.company.display_name),
      location: loc || 'Unknown',
      remote: false,
      salaryText: sal.text, salaryMin: sal.min, salaryMax: sal.max, salaryCurrency: sal.currency,
      skills: [],
      category: clean(j.category && j.category.label) || 'Software',
      postedDate: (j.created || '').slice(0, 10) || null,
      url: j.redirect_url,
      source: 'Adzuna',
      region: 'foreign',
    }
  }).filter((j) => !isScam(j.title + ' ' + (j.skills || []).join(' ')))
}

// ── 国内源：V2EX 招聘节点（中文社区，公开 API）────────────
async function fromV2EX() {
  const data = await getJSON('https://www.v2ex.com/api/topics/show.json?node_name=jobs')
  const list = Array.isArray(data) ? data : []
  // 常见技术关键词（用于从标题/正文抽取技能标签，便于搜索）
  const TECH = ['python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'javascript',
    'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'spring', 'django',
    'flask', 'docker', 'kubernetes', 'k8s', 'aws', '阿里云', '腾讯云', 'linux', 'mysql',
    'postgresql', 'redis', 'mongodb', 'elasticsearch', 'grpc', 'graphql', 'flutter',
    'swift', 'kotlin', 'php', 'ruby', 'scala', 'spark', 'hadoop', 'pytorch', 'tensorflow']
  // 先按标题+正文过滤疑似诈骗帖（V2EX 论坛审核最松，重点防护）
  return list
    .filter((t) => !isScam(clean(t.title) + ' ' + (t.content || '')))
    .map((t) => {
    const titleRaw = clean(t.title)
    const member = (t.member && t.member.username) || ''
    const url = `https://www.v2ex.com/t/${t.id}`
    // 解析标题中的 [地点][薪资] 前缀，如 "[杭州][20-35K] 高级前端"
    let title = titleRaw
    let location = '国内'
    let salaryText = ''
    const m1 = title.match(/\[([^\]]+)\]/)
    if (m1) {
      const first = m1[1].trim()
      if (/\d|k|K|w|W|薪|元|rmb|￥|¥/i.test(first)) salaryText = first
      else location = first
      title = title.replace(m1[0], '').trim()
      const m2 = title.match(/\[([^\]]+)\]/)
      if (m2 && /\d|k|K|w|W|薪|元|rmb|￥|¥/i.test(m2[1])) {
        salaryText = salaryText ? `${salaryText} ${m2[1].trim()}` : m2[1].trim()
        title = title.replace(m2[0], '').trim()
      }
    }
    const s = parseSalary(salaryText)
    const hay = (titleRaw + ' ' + (t.content || '')).toLowerCase()
    const skills = TECH.filter((k) => hay.includes(k.toLowerCase()))
    let category = '其他'
    if (/前端|front[\s-]?end|web 前端/i.test(titleRaw)) category = '前端'
    else if (/后端|back[\s-]?end|服务端|server/i.test(titleRaw)) category = '后端'
    else if (/全栈|full[\s-]?stack/i.test(titleRaw)) category = '全栈'
    else if (/算法|机器学习|machine learning|\bml\b|人工智能|深度学习|ai /i.test(titleRaw)) category = '算法/AI'
    else if (/数据|data|分析|bi\b/i.test(titleRaw)) category = '数据'
    else if (/测试|qa\b|test/i.test(titleRaw)) category = '测试'
    else if (/运维|devops|sre|系统工程师/i.test(titleRaw)) category = '运维/SRE'
    else if (/产品|product|pm\b/i.test(titleRaw)) category = '产品'
    else if (/设计|design|ui|ux/i.test(titleRaw)) category = '设计'
    else if (/运营|operation|内容|新媒体/i.test(titleRaw)) category = '运营'
    else if (/市场|marketing|增长/i.test(titleRaw)) category = '市场'
    else if (/销售|sales|商务|bd\b/i.test(titleRaw)) category = '销售'
    else if (/hr|人力|招聘|猎头/i.test(titleRaw)) category = '人力/HR'
    const remote = /远程|remote|在家|wfh|异地|线上/i.test(titleRaw)
    return {
      id: 'v2ex-' + (t.id || shortHash(url)),
      title: title || titleRaw,
      company: member || '个人发布',
      location,
      remote,
      salaryText: s.text, salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency || 'CNY',
      skills,
      category,
      postedDate: toDate(t.created) || null,
      url,
      source: 'V2EX',
      region: 'domestic',
    }
  })
}

// ── 主流程 ────────────────────────────────────────────
async function main() {
  const sources = [
    ['V2EX', fromV2EX],
    ['RemoteOK', fromRemoteOK],
    ['Remotive', fromRemotive],
    ['Arbeitnow', fromArbeitnow],
    ['Adzuna', fromAdzuna],
  ]
  const all = []
  const counts = {}
  for (const [name, fn] of sources) {
    try {
      const items = await fn()
      counts[name] = items.length
      all.push(...items)
      console.log(`  [${name}] ${items.length} 条`)
    } catch (e) {
      counts[name] = 0
      console.log(`  [${name}] 跳过: ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  if (all.length === 0) {
    if (fs.existsSync(OUT_PATH)) {
      console.log('所有数据源不可达，保留上次 jobs.json。')
    } else {
      console.log('所有数据源不可达且无历史文件，跳过写入。')
    }
    return
  }

  // 去重（按 url；url 缺失则按 title+company）
  const seen = new Set()
  const deduped = []
  for (const j of all) {
    const key = j.url && j.url.startsWith('http') ? j.url : (j.title + '|' + j.company)
    const h = shortHash(key)
    if (seen.has(h)) continue
    seen.add(h)
    deduped.push(j)
  }

  // 国内优先（region=domestic 排前），同区按发布时间倒序，截断
  deduped.sort((a, b) => {
    const ra = a.region === 'domestic' ? 0 : 1
    const rb = b.region === 'domestic' ? 0 : 1
    if (ra !== rb) return ra - rb
    return (b.postedDate || '').localeCompare(a.postedDate || '')
  })
  const final = deduped.slice(0, MAX_JOBS)

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated: new Date().toISOString(),
    count: final.length,
    sources: counts,
    jobs: final,
  }, null, 2))
  console.log(`jobs.json 写入完成: ${final.length} 条（去重前 ${deduped.length}）`)
}

main().catch((e) => {
  console.log('collect-jobs 异常（已跳过，不影响主流程）: ' + e.message)
})
