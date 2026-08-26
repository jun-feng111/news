<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">🇨🇳 国内岗位</h1>
      <p class="text-sm" style="color: var(--text-secondary)">
        只收国内真实招聘信息：V2EX / 掘金 社区真实发布 + 大厂/政府/行业前景来自搜索引擎公开报道聚合（合规，不爬智联/BOSS直聘）
      </p>
      <div class="disclaimer">
        ⚠️ 岗位来自公开渠道，<b>未经平台核验</b>。社区帖为公司/个人自发发布，大厂/政府/前景为公开报道聚合（非平台逐条岗位）。
        求职请通过企业官方渠道核实公司、岗位与薪资，谨防「押金 / 培训费 / 垫付 / 私加微信」类诈骗；已自动过滤含此类特征的帖子。
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar mb-6">
      <button class="tab" :class="{ active: tab === 'jobs' }" @click="tab = 'jobs'">📋 真实岗位</button>
      <button class="tab" :class="{ active: tab === 'insights' }" @click="tab = 'insights'">📈 前景与发展</button>
    </div>

    <!-- 真实岗位 -->
    <div v-if="tab === 'jobs'">
      <div class="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model.trim="searchQuery" type="text" placeholder="搜索岗位 / 公司 / 技能 / 城市，如：前端 杭州" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
        <select v-model="sortBy" class="sort-select">
          <option value="newest">最新优先</option>
          <option value="salary_desc">薪资高→低</option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <button class="filter-chip" :class="{ active: activeCat === 'all' }" @click="activeCat = 'all'">全部分类</button>
        <button v-for="c in categories" :key="c" class="filter-chip" :class="{ active: activeCat === c }" @click="activeCat = c">{{ c }}</button>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
      </div>
      <div v-else-if="error" class="text-center py-20" style="color: var(--text-muted)">{{ error }}</div>
      <div v-else-if="filteredJobs.length === 0" class="text-center py-20" style="color: var(--text-muted)">
        没有匹配的岗位，换个关键词试试
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a v-for="(job, i) in filteredJobs" :key="job.id" :href="job.url" target="_blank" rel="noopener"
           class="job-card card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
          <div class="flex items-start justify-between gap-2 mb-2">
            <h3 class="job-title line-clamp-2">{{ job.title }}</h3>
            <span class="source-badge">🇨🇳 {{ job.source }}</span>
          </div>
          <p class="job-company mb-2">{{ job.company }}</p>
          <div class="flex items-center gap-2 mb-3 text-xs" style="color: var(--text-secondary)">
            <span>📍 {{ job.location }}</span>
            <span v-if="job.remote" class="remote-tag">远程</span>
            <span class="cat-tag">{{ job.category }}</span>
          </div>
          <div v-if="job.salaryText" class="salary-badge mb-3">{{ job.salaryText }}</div>
          <div v-else class="salary-badge muted mb-3">薪资面议</div>
          <div class="flex flex-wrap gap-1.5 mb-3" v-if="job.skills && job.skills.length">
            <span v-for="sk in job.skills.slice(0, 8)" :key="sk" class="skill-tag">{{ sk }}</span>
          </div>
          <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
            <span>{{ job.source }} · {{ relativeDate(job.postedDate) }}</span>
            <span class="view-link">去源头核验 ↗</span>
          </div>
        </a>
      </div>
    </div>

    <!-- 前景与发展 -->
    <div v-else>
      <div class="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model.trim="insightQuery" type="text" placeholder="搜索岗位/公司/前景，如：算法 前景" />
          <button v-if="insightQuery" class="search-clear" @click="insightQuery = ''">×</button>
        </div>
        <select v-model="insightType" class="sort-select">
          <option value="all">全部类型</option>
          <option value="company">大厂官方</option>
          <option value="government">政府公开</option>
          <option value="position">岗位行业</option>
        </select>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
      </div>
      <div v-else-if="filteredInsights.length === 0" class="text-center py-20" style="color: var(--text-muted)">
        暂无匹配的洞察，换个关键词试试
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(it, i) in filteredInsights" :key="it.id"
             class="insight-card card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
          <div class="flex items-center gap-2 mb-2">
            <span class="type-badge" :class="it.type">{{ typeLabel(it.type) }}</span>
            <span class="topic">{{ it.topic }}</span>
          </div>
          <a :href="it.url" target="_blank" rel="noopener" class="insight-title">{{ it.title }}</a>
          <div v-if="it.salary" class="salary-badge mb-2 mt-2">{{ it.salary }}</div>
          <div class="field"><span class="field-label">💡 职业前景 / 发展</span><p>{{ it.prospect }}</p></div>
          <div class="field" v-if="it.trend"><span class="field-label">📊 趋势</span><p>{{ it.trend }}</p></div>
          <div class="flex flex-wrap gap-1.5 my-2" v-if="it.skills && it.skills.length">
            <span v-for="sk in it.skills.slice(0, 8)" :key="sk" class="skill-tag">{{ sk }}</span>
          </div>
          <div class="flex items-center justify-between text-xs mt-2" style="color: var(--text-muted)">
            <span>{{ it.source }} · {{ relativeDate(it.published) }}</span>
            <span class="view-link">查看原文 ↗</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const tab = ref('jobs')
const jobs = ref([])
const insights = ref([])
const loading = ref(false)
const error = ref('')

const searchQuery = ref('')
const sortBy = ref('newest')
const activeCat = ref('all')

const insightQuery = ref('')
const insightType = ref('all')

const categories = computed(() => [...new Set(jobs.value.map(j => j.category).filter(Boolean))].sort())

const filteredJobs = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase()
  let list = jobs.value.filter(j => {
    if (activeCat.value !== 'all' && j.category !== activeCat.value) return false
    if (kw) {
      const hay = [j.title, j.company, j.location, j.category, ...(j.skills || [])].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
  if (sortBy.value === 'salary_desc') {
    list = [...list].sort((a, b) => (b.salaryMin ?? -1) - (a.salaryMin ?? -1))
  } else {
    list = [...list].sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))
  }
  return list
})

const filteredInsights = computed(() => {
  const kw = insightQuery.value.trim().toLowerCase()
  let list = insights.value.filter(it => {
    if (insightType.value !== 'all' && it.type !== insightType.value) return false
    if (kw) {
      const hay = [it.topic, it.title, it.prospect, it.trend, ...(it.skills || [])].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
  return [...list].sort((a, b) => (b.published || '').localeCompare(a.published || ''))
})

function typeLabel(t) {
  return t === 'company' ? '大厂官方' : t === 'government' ? '政府公开' : '岗位行业'
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
    const res = await fetch('./public/data/jobs-cn.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    jobs.value = Array.isArray(data.jobs) ? data.jobs : []
    insights.value = Array.isArray(data.insights) ? data.insights : []
  } catch (e) {
    error.value = '国内岗位数据加载失败：' + e.message + '（需等 Collect News 跑出 jobs-cn.json）'
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.tab-bar { display: flex; gap: 8px; border-bottom: 1px solid var(--border); }
.tab {
  border: none; background: transparent; cursor: pointer;
  padding: 10px 18px; font-size: 15px; font-weight: 600;
  color: var(--text-secondary); border-bottom: 2px solid transparent;
}
.tab.active { color: var(--text-primary); border-bottom-color: var(--accent-blue); }
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
.search-clear { border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1; }
.sort-select {
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-primary); border-radius: 10px; height: 42px;
  padding: 0 10px; font-size: 14px; outline: none; cursor: pointer;
}
.filter-chip {
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-secondary); border-radius: 999px;
  padding: 5px 14px; font-size: 13px; cursor: pointer; transition: all 0.2s ease;
}
.filter-chip:hover { color: var(--text-primary); border-color: var(--border-strong); }
.filter-chip.active { color: #fff; background: var(--accent-blue); border-color: var(--accent-blue); }
.job-card { display: block; text-decoration: none; }
.job-card:hover { text-decoration: none; }
.job-title { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--text-primary); flex: 1; }
.source-badge {
  flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 999px;
  background: rgba(34, 197, 94, 0.15); color: #4ade80;
}
.job-company { font-size: 13px; color: var(--text-secondary); }
.remote-tag, .cat-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: rgba(34, 197, 94, 0.15); color: #4ade80;
}
.cat-tag { background: var(--bg-hover); color: var(--text-secondary); }
.salary-badge {
  display: inline-block; font-size: 13px; font-weight: 600;
  color: #fbbf24; background: rgba(251, 191, 36, 0.12);
  padding: 3px 10px; border-radius: 8px;
}
.salary-badge.muted { color: var(--text-muted); background: var(--bg-hover); font-weight: 400; }
.skill-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: var(--bg-hover); color: var(--text-secondary); }
.view-link { color: var(--accent-blue); }
.insight-card { display: block; }
.type-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
.type-badge.company { background: rgba(99, 102, 241, 0.18); color: #a5b4fc; }
.type-badge.government { background: rgba(34, 197, 94, 0.18); color: #4ade80; }
.type-badge.position { background: rgba(14, 165, 233, 0.18); color: #38bdf8; }
.topic { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.insight-title { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.5; text-decoration: none; margin: 4px 0; }
.insight-title:hover { color: var(--accent-blue); }
.field { margin-top: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--accent-blue); }
.field p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 2px 0 0; }
</style>
