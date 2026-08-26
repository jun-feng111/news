<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">💼 求职</h1>
      <p class="text-sm" style="color: var(--text-secondary)">
        真实岗位来自 V2EX（国内社区，优先）· RemoteOK / Remotive / Arbeitnow（海外公开 API）· 含技能要求与薪资（合规采集，不爬招聘站）
      </p>
      <div class="disclaimer">
        ⚠️ 岗位均来自公开渠道，<b>未经平台核验</b>。求职请通过企业官方渠道核实公司、岗位与薪资，谨防「押金 / 培训费 / 垫付 / 私加微信」类诈骗；已自动过滤含此类特征的帖子。
      </div>
    </div>

    <div class="card-base overflow-hidden mb-8">
      <div class="hero-banner relative h-40 flex items-center justify-center">
        <div class="absolute inset-0 opacity-40" style="background: linear-gradient(135deg, #0ea5e9, #6366f1)"></div>
        <div class="relative z-10 text-center">
          <div class="text-5xl mb-2">💼 🌍 💰</div>
          <p class="text-white text-lg font-semibold">真实岗位 · 技能要求 · 薪资水平，一站速览</p>
        </div>
      </div>
    </div>

    <!-- 控件区 -->
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model.trim="searchQuery" type="text" placeholder="搜索岗位 / 公司 / 技能，如：前端 杭州" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
        <div class="flex items-center gap-3">
          <label class="remote-toggle">
            <input type="checkbox" v-model="remoteOnly" /> 仅远程
          </label>
          <select v-model="sortBy" class="sort-select">
            <option value="domestic_first">国内优先</option>
            <option value="newest">最新优先</option>
            <option value="salary_desc">薪资高→低</option>
            <option value="salary_asc">薪资低→高</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="filter-chip" :class="{ active: activeRegion === 'all' }" @click="activeRegion = 'all'">全部地区</button>
        <button class="filter-chip" :class="{ active: activeRegion === 'domestic' }" @click="activeRegion = 'domestic'">🇨🇳 国内</button>
        <button class="filter-chip" :class="{ active: activeRegion === 'foreign' }" @click="activeRegion = 'foreign'">🌐 海外</button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="filter-chip" :class="{ active: activeSource === 'all' }" @click="activeSource = 'all'">全部来源</button>
        <button v-for="s in sources" :key="s" class="filter-chip" :class="{ active: activeSource === s }" @click="activeSource = s">{{ s }}</button>
      </div>

      <div class="flex flex-wrap items-center gap-2" v-if="categories.length">
        <button class="filter-chip cat" :class="{ active: activeCategory === 'all' }" @click="activeCategory = 'all'">全部分类</button>
        <button v-for="c in categories" :key="c" class="filter-chip cat" :class="{ active: activeCategory === c }" @click="activeCategory = c">{{ catZH(c) }}</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="error" class="text-center py-20" style="color: var(--text-muted)">
      {{ error }}
    </div>
    <div v-else-if="filteredJobs.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      没有匹配的岗位，试试别的关键词
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <a v-for="(job, i) in filteredJobs" :key="job.id" :href="job.url" target="_blank" rel="noopener"
         class="job-card card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="job-title line-clamp-2">{{ job.title }}</h3>
          <span class="source-badge" :class="job.region === 'domestic' ? 'domestic' : 'foreign'">
            {{ sourceLabel(job) }}
          </span>
        </div>
        <p class="job-company mb-2">{{ job.company }}</p>
        <div class="flex items-center gap-2 mb-3 text-xs" style="color: var(--text-secondary)">
          <span>📍 {{ locZH(job.location) }}</span>
          <span v-if="job.remote" class="remote-tag">远程</span>
          <span v-if="job.region === 'domestic'" class="region-tag domestic">国内</span>
          <span v-else class="region-tag foreign">海外</span>
        </div>
        <div v-if="job.salaryText" class="salary-badge mb-3">{{ formatSalary(job) }}</div>
        <div v-else class="salary-badge muted mb-3">薪资面议</div>
        <div class="flex flex-wrap gap-1.5 mb-3" v-if="displaySkills(job).length">
          <span v-for="sk in displaySkills(job)" :key="sk" class="skill-tag" :title="sk">{{ tagZH(sk) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
          <span>{{ sourceLabel(job) }} · {{ relativeDate(job.postedDate) }}</span>
          <span class="view-link">去源头核验 ↗</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const jobs = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const sortBy = ref('domestic_first')
const remoteOnly = ref(false)
const activeSource = ref('all')
const activeCategory = ref('all')
const activeRegion = ref('all')

const CURRENCY = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', INR: '₹' }
const SKILL_STOP = new Set(['senior', 'junior', 'mid', 'lead', 'engineer', 'developer', 'remote', 'full', 'time', 'part', 'job', 'hiring', 'new', 'apply', 'work', 'role', 'position', 'level', 'exp', 'year', 'contract', 'permanent', 'freelance', 'intern', 'internship'])

// ── 中文化映射 ────────────────────────────────────────
// 海外源的分类/标签是英文，界面统一翻译成中文。
const CATEGORY_ZH = {
  'Software': '软件', 'Software Development': '软件开发', 'Software Engineering': '软件工程',
  'Data and Analytics': '数据分析', 'Data Science': '数据科学', 'Data': '数据',
  'Design': '设计', 'Customer Service': '客服', 'Customer Success': '客户成功',
  'Sales': '销售', 'Marketing': '市场', 'Writing': '写作/编辑',
  'Information Technology': '信息技术', 'IT': '信息技术', 'All others': '其他', 'Other': '其他',
  'Accounting': '会计', 'Finance': '财务', 'Human Resources': '人力资源', 'HR': '人力资源',
  'Product': '产品', 'Operations': '运营', 'Education': '教育', 'Legal': '法务',
  'Consulting': '咨询', 'Engineering': '工程', 'DevOps': '运维', 'QA': '测试',
  'Management': '管理', 'Healthcare': '医疗', 'Research': '研究',
}
const TAG_ZH = {
  'backend': '后端', 'back-end': '后端', 'frontend': '前端', 'front-end': '前端',
  'full stack': '全栈', 'fullstack': '全栈', 'full-stack': '全栈',
  'devops': '运维', 'sre': 'SRE', 'sys admin': '系统管理员', 'system administrator': '系统管理员',
  'golang': 'Go', 'go': 'Go', 'python': 'Python', 'java': 'Java', 'rust': 'Rust',
  'react': 'React', 'vue': 'Vue', 'node': 'Node', 'nodejs': 'Node', 'typescript': 'TypeScript',
  'javascript': 'JavaScript', 'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP',
  'kubernetes': 'Kubernetes', 'docker': 'Docker', 'linux': 'Linux', 'remote': '远程',
  'consulting': '咨询', 'customer support': '客户支持', 'customer service': '客服',
  'design': '设计', 'education': '教育', 'exec': '高管', 'finance': '财务',
  'hr': '人力资源', 'infosec': '信息安全', 'marketing': '市场', 'recruiter': '招聘',
  'sales': '销售', 'supervisor': '主管', 'technical': '技术', 'testing': '测试',
  'qa': '测试', 'travel': '出差', 'virtual assistant': '虚拟助理', 'developer': '开发',
  'engineer': '工程师', 'mobile': '移动端', 'ios': 'iOS', 'android': 'Android',
  'data': '数据', 'analytics': '分析', 'security': '安全', 'cloud': '云', 'api': 'API',
  'machine learning': '机器学习', 'ai': '人工智能', 'sql': 'SQL', 'nosql': 'NoSQL',
}
const LOC_ZH = {
  'remote': '远程', 'anywhere': '全球远程', 'worldwide': '全球', 'europe': '欧洲',
  'us': '美国', 'usa': '美国', 'united states': '美国', 'uk': '英国', 'global': '全球',
  '国内': '国内', 'china': '中国', '中国': '中国',
}
const firstWordCap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
function catZH(c) {
  if (!c) return '其他'
  if (CATEGORY_ZH[c]) return CATEGORY_ZH[c]
  const low = c.toLowerCase()
  if (CATEGORY_ZH[low]) return CATEGORY_ZH[low]
  if (TAG_ZH[low]) return TAG_ZH[low]
  // 未命中：原样返回（多为已中文或专有名词）
  return /[一-龥]/.test(c) ? c : firstWordCap(c)
}
function tagZH(t) {
  if (!t) return t
  if (TAG_ZH[t]) return TAG_ZH[t]
  const low = t.toLowerCase()
  if (TAG_ZH[low]) return TAG_ZH[low]
  return t
}
function locZH(loc) {
  if (!loc) return '—'
  if (LOC_ZH[loc]) return LOC_ZH[loc]
  const low = loc.toLowerCase()
  if (LOC_ZH[low]) return LOC_ZH[low]
  return loc
}
function sourceLabel(job) {
  const region = job.region === 'domestic' ? '国内' : '海外'
  return `${job.source}·${region}`
}

const sources = computed(() => [...new Set(jobs.value.map(j => j.source))].sort())
const categories = computed(() => [...new Set(jobs.value.map(j => j.category).filter(Boolean))].sort())

const filteredJobs = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase()
  let list = jobs.value.filter(j => {
    if (activeRegion.value !== 'all' && (j.region || 'foreign') !== activeRegion.value) return false
    if (activeSource.value !== 'all' && j.source !== activeSource.value) return false
    if (activeCategory.value !== 'all' && j.category !== activeCategory.value) return false
    if (remoteOnly.value && !j.remote) return false
    if (kw) {
      const hay = [
        j.title, j.company, locZH(j.location), catZH(j.category),
        ...(j.skills || []).map(tagZH),
      ].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
  const byDate = (a, b) => (b.postedDate || '').localeCompare(a.postedDate || '')
  const bySalary = (dir) => (a, b) => {
    const av = a.salaryMin ?? -1, bv = b.salaryMin ?? -1
    return dir === 'asc' ? av - bv : bv - av
  }
  if (sortBy.value === 'salary_desc') list.sort(bySalary('desc'))
  else if (sortBy.value === 'salary_asc') list.sort(bySalary('asc'))
  else if (sortBy.value === 'newest') list.sort(byDate)
  else { // domestic_first（默认）：国内优先，再按时间
    list.sort((a, b) => {
      const ra = (a.region === 'domestic') ? 0 : 1
      const rb = (b.region === 'domestic') ? 0 : 1
      if (ra !== rb) return ra - rb
      return byDate(a, b)
    })
  }
  return list
})

function displaySkills(job) {
  return (job.skills || [])
    .map(s => String(s).trim())
    .filter(s => s && !SKILL_STOP.has(s.toLowerCase()))
    .slice(0, 8)
}

function formatSalary(job) {
  const sym = CURRENCY[job.salaryCurrency] || '$'
  const fmt = (n) => sym + Number(n).toLocaleString()
  if (job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax) {
    return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)}`
  }
  if (job.salaryMin) return `${fmt(job.salaryMin)}+`
  return job.salaryText
}

function relativeDate(iso) {
  if (!iso) return '日期未知'
  const d = new Date(iso)
  if (isNaN(d)) return '日期未知'
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('./public/data/jobs.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    jobs.value = Array.isArray(data.jobs) ? data.jobs : []
  } catch (e) {
    error.value = '岗位数据加载失败：' + e.message
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.hero-banner { border-radius: 12px; overflow: hidden; }
.disclaimer {
  margin-top: 10px; font-size: 12.5px; line-height: 1.6;
  color: #b45309; background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 10px; padding: 8px 12px;
}
.disclaimer b { color: #92400e; }
.search-box {
  position: relative; display: flex; align-items: center;
  min-width: 240px; flex: 1; max-width: 460px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 10px; padding: 0 12px; height: 42px;
}
.search-box input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text-primary); font-size: 14px; padding: 0 8px;
}
.search-box input::placeholder { color: var(--text-muted); }
.search-icon { opacity: 0.6; }
.search-clear {
  border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; font-size: 18px; line-height: 1;
}
.remote-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
  user-select: none;
}
.sort-select {
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-primary); border-radius: 10px; height: 42px;
  padding: 0 10px; font-size: 14px; outline: none; cursor: pointer;
}
.filter-chip {
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-secondary); border-radius: 999px;
  padding: 5px 14px; font-size: 13px; cursor: pointer;
  transition: all 0.2s ease;
}
.filter-chip:hover { color: var(--text-primary); border-color: var(--border-strong); }
.filter-chip.active {
  color: #fff; background: var(--accent-blue); border-color: var(--accent-blue);
}
.filter-chip.cat.active { background: var(--accent-purple); border-color: var(--accent-purple); }
.job-card { display: block; text-decoration: none; }
.job-card:hover { text-decoration: none; }
.job-title {
  font-size: 15px; font-weight: 600; line-height: 1.4;
  color: var(--text-primary); flex: 1;
}
.source-badge {
  flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 999px;
  background: var(--bg-hover); color: var(--text-secondary);
}
.source-badge.domestic { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.source-badge.foreign { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; }
.job-company { font-size: 13px; color: var(--text-secondary); }
.remote-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: rgba(34, 197, 94, 0.15); color: #4ade80;
}
.region-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 999px; font-weight: 600;
}
.region-tag.domestic { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.region-tag.foreign { background: rgba(99, 102, 241, 0.12); color: #a5b4fc; }
.salary-badge {
  display: inline-block; font-size: 13px; font-weight: 600;
  color: #fbbf24; background: rgba(251, 191, 36, 0.12);
  padding: 3px 10px; border-radius: 8px;
}
.salary-badge.muted { color: var(--text-muted); background: var(--bg-hover); font-weight: 400; }
.skill-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  background: var(--bg-hover); color: var(--text-secondary);
}
.view-link { color: var(--accent-blue); }
</style>
