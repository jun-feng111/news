// 合规求职数据采集：从有公开授权 / 免密 API 的合法数据源拉取真实岗位。
//
// 数据源（均为官方公开 API，非爬虫、不触碰招聘站反爬）：
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
    }
  })
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
    }
  })
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
    }
  })
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
    }
  })
}

// ── 主流程 ────────────────────────────────────────────
async function main() {
  const sources = [
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

  // 按发布时间倒序，截断
  deduped.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))
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
