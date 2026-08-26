<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">📊 中国岗位分析</h1>
      <p class="text-sm" style="color: var(--text-secondary)">
        基于 Bing News 公开资讯的岗位市场二次分析 · 覆盖各技术岗的薪资 / 技能 / 前景 / 趋势
      </p>
      <p class="text-xs mt-1" style="color: var(--text-muted)">
        ⚠️ 数据来源为媒体与研究机构的公开分析报道，属行业洞见而非逐条真实招聘岗位，仅供求职参考。
      </p>
    </div>

    <div class="card-base overflow-hidden mb-8">
      <div class="hero-banner relative h-36 flex items-center justify-center">
        <div class="absolute inset-0 opacity-40" style="background: linear-gradient(135deg, #f59e0b, #ef4444)"></div>
        <div class="relative z-10 text-center">
          <div class="text-4xl mb-2">📊 🇨🇳 💡</div>
          <p class="text-white text-lg font-semibold">按岗位看薪资 · 按维度看要求，一站对比</p>
        </div>
      </div>
    </div>

    <!-- 控件区 -->
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model.trim="searchQuery" type="text" placeholder="搜索岗位 / 技能 / 关键词，如：Java 薪资" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
        <div class="flex items-center gap-3">
          <select v-model="sortBy" class="sort-select">
            <option value="newest">最新优先</option>
            <option value="relevant">相关度</option>
          </select>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2" v-if="positions.length">
        <span class="filter-label">岗位：</span>
        <button class="filter-chip" :class="{ active: activePosition === 'all' }" @click="activePosition = 'all'">全部</button>
        <button v-for="p in positions" :key="p" class="filter-chip" :class="{ active: activePosition === p }" @click="activePosition = p">{{ p }}</button>
      </div>

      <div class="flex flex-wrap items-center gap-2" v-if="dimensions.length">
        <span class="filter-label">维度：</span>
        <button class="filter-chip dim" :class="{ active: activeDimension === 'all' }" @click="activeDimension = 'all'">全部</button>
        <button v-for="d in dimensions" :key="d.key" class="filter-chip dim" :class="{ active: activeDimension === d.label }" @click="activeDimension = d.label">{{ d.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="error" class="text-center py-20" style="color: var(--text-muted)">
      {{ error }}
    </div>
    <div v-else-if="filteredItems.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      暂无匹配的分析，换个关键词或筛选条件试试
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <a v-for="(item, i) in filteredItems" :key="item.id" :href="item.url" target="_blank" rel="noopener"
         class="analysis-card card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
        <div class="flex flex-wrap items-center gap-1.5 mb-3">
          <span v-for="dim in item.dimensions" :key="dim" class="dim-badge" :style="dimStyle(dim)">{{ dim }}</span>
          <span v-for="pos in item.positions" :key="pos" class="pos-badge">{{ pos }}</span>
        </div>
        <h3 class="analysis-title line-clamp-2 mb-2">{{ item.title }}</h3>
        <p class="analysis-summary line-clamp-3 mb-3" style="color: var(--text-secondary)">{{ item.summary || '（无摘要）' }}</p>
        <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
          <span>{{ item.brand || item.source || '未知来源' }} · {{ relativeDate(item.published) }}</span>
          <span class="view-link">查看原文 →</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const items = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const sortBy = ref('newest')
const activePosition = ref('all')
const activeDimension = ref('all')

const positions = computed(() => [...new Set(items.value.flatMap(i => i.positions || [i.position]))].sort())
const dimensions = computed(() => {
  const set = new Map()
  for (const i of items.value) for (const d of (i.dimensions || [])) set.set(d, true)
  const known = DIM_META.map(d => d.label).filter(l => set.has(l))
  return DIM_META.filter(d => known.includes(d.label))
})

// 维度配色（与徽章内联样式对应）
const DIM_COLOR = {
  '薪资待遇': '#3b82f6',
  '技能要求': '#8b5cf6',
  '就业前景': '#22c55e',
  '招聘趋势': '#f59e0b',
}
function dimStyle(dim) {
  const c = DIM_COLOR[dim] || '#64748b'
  return { color: c, background: c + '1f', borderColor: c + '40' }
}

const filteredItems = computed(() => {
  const kw = searchQuery.value.trim().toLowerCase()
  let list = items.value.filter(it => {
    if (activePosition.value !== 'all' && !(it.positions || []).includes(activePosition.value)) return false
    if (activeDimension.value !== 'all' && !(it.dimensions || []).includes(activeDimension.value)) return false
    if (kw) {
      const hay = [
        it.title, it.summary, it.source, it.brand,
        ...(it.positions || []), ...(it.dimensions || []), ...(it.tags || []),
      ].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
  if (sortBy.value === 'relevant' && kw) {
    list = [...list].sort((a, b) => score(b, kw) - score(a, kw))
  } else {
    list.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
  }
  return list
})

function score(it, kw) {
  const t = (it.title || '').toLowerCase()
  const s = (it.summary || '').toLowerCase()
  let sc = 0
  if (t.includes(kw)) sc += 10
  if (s.includes(kw)) sc += 3
  return sc
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

// 维度元信息（中文标签 → 配色键）
const DIM_META = [
  { key: 'salary', label: '薪资待遇' },
  { key: 'skill', label: '技能要求' },
  { key: 'prospect', label: '就业前景' },
  { key: 'trend', label: '招聘趋势' },
]

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('./public/data/china-jobs.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    items.value = Array.isArray(data.items) ? data.items : []
  } catch (e) {
    error.value = '岗位分析数据加载失败：' + e.message
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
.sort-select {
  background: var(--bg-card); border: 1px solid var(--border);
  color: var(--text-primary); border-radius: 10px; height: 42px;
  padding: 0 10px; font-size: 14px; outline: none; cursor: pointer;
}
.filter-label { font-size: 13px; color: var(--text-muted); }
.filter-chip {
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-secondary); border-radius: 999px;
  padding: 5px 14px; font-size: 13px; cursor: pointer;
  transition: all 0.2s ease;
}
.filter-chip:hover { color: var(--text-primary); border-color: var(--border-strong); }
.filter-chip.active {
  color: #fff; background: var(--accent-red, #ef4444); border-color: var(--accent-red, #ef4444);
}
.filter-chip.dim.active { background: var(--accent-orange, #f59e0b); border-color: var(--accent-orange, #f59e0b); }
.analysis-card { display: block; text-decoration: none; }
.analysis-card:hover { text-decoration: none; }
.analysis-title {
  font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--text-primary);
}
.analysis-summary { font-size: 13px; line-height: 1.6; }
.dim-badge, .pos-badge {
  font-size: 11px; padding: 2px 9px; border-radius: 999px;
  border: 1px solid transparent;
}
.pos-badge {
  color: var(--text-secondary); background: var(--bg-hover);
  border-color: var(--border);
}
.view-link { color: var(--accent-blue); }
</style>
