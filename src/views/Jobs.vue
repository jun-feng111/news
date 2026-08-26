<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">💼 求职</h1>
      <p class="text-sm" style="color: var(--text-secondary)">
        真实岗位来自 RemoteOK / Remotive / Arbeitnow 等公开 API · 含技能要求与薪资（合规采集，不爬招聘站）
      </p>
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
          <input v-model.trim="searchQuery" type="text" placeholder="搜索岗位 / 公司 / 技能，如：python 后端" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
        <div class="flex items-center gap-3">
          <label class="remote-toggle">
            <input type="checkbox" v-model="remoteOnly" /> 仅远程
          </label>
          <select v-model="sortBy" class="sort-select">
            <option value="newest">最新优先</option>
            <option value="salary_desc">薪资高→低</option>
            <option value="salary_asc">薪资低→高</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button class="filter-chip" :class="{ active: activeSource === 'all' }" @click="activeSource = 'all'">全部来源</button>
        <button v-for="s in sources" :key="s" class="filter-chip" :class="{ active: activeSource === s }" @click="activeSource = s">{{ s }}</button>
      </div>

      <div class="flex flex-wrap items-center gap-2" v-if="categories.length">
        <button class="filter-chip cat" :class="{ active: activeCategory === 'all' }" @click="activeCategory = 'all'">全部分类</button>
        <button v-for="c in categories" :key="c" class="filter-chip cat" :class="{ active: activeCategory === c }" @click="activeCategory = c">{{ c }}</button>
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
          <span class="source-badge">{{ job.source }}</span>
        </div>
        <p class="job-company mb-2">{{ job.company }}</p>
        <div class="flex items-center gap-2 mb-3 text-xs" style="color: var(--text-secondary)">
          <span>📍 {{ job.location || '—' }}</span>
          <span v-if="job.remote" class="remote-tag">远程</span>
        </div>
        <div v-if="job.salaryText" class="salary-badge mb-3">{{ formatSalary(job) }}</div>
        <div v-else class="salary-badge muted mb-3">薪资面议</div>
        <div class="flex flex-wrap gap-1.5 mb-3" v-if="displaySkills(job).length">
          <span v-for="sk in displaySkills(job)" :key="sk" class="skill-tag">{{ sk }}</span>
        </div>
        <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
          <span>{{ relativeDate(job.postedDate) }}</span>
          <span class="view-link">查看详情 →</span>
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
const sortBy = ref('newest')
const remoteOnly = ref(false)
const activeSource = ref('all')
const activeCategory = ref('all')

const CURRENCY = { USD: '$', CNY: '¥', EUR: '€', GBP: '£', INR: '₹' }
const SKILL_STOP = new Set(['senior', 'junior', 'mid', 'lead', 'engineer', 'developer', 'remote', 'full', 'time', 'part', 'job', 'hiring', 'new', 'apply', 'work', 'role', 'position', 'level', 'exp', 'year', 'contract', 'permanent', 'freelance', 'intern', 'internship'])

const sources = computed(() => [...new Set(jobs.value.map(j => j.source))].sort())
const categories = computed(() => [...new Set(jobs.value.map(j => j.category).filter(Boolean))].sort())

const filteredJobs = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase()
  let list = jobs.value.filter(j => {
    if (activeSource.value !== 'all' && j.source !== activeSource.value) return false
    if (activeCategory.value !== 'all' && j.category !== activeCategory.value) return false
    if (remoteOnly.value && !j.remote) return false
    if (kw) {
      const hay = [j.title, j.company, j.location, ...(j.skills || [])].join(' ').toLowerCase()
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
  else list.sort(byDate)
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
.job-company { font-size: 13px; color: var(--text-secondary); }
.remote-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: rgba(34, 197, 94, 0.15); color: #4ade80;
}
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
