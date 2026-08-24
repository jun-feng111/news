<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div class="flex items-center gap-3">
        <span class="inline-block w-3 h-3 rounded-full" :style="{ background: catStyle.color }"></span>
        <h1 class="text-3xl font-bold" style="color: var(--text-primary)">{{ category }}</h1>
        <span class="text-sm" style="color: var(--text-secondary)">· {{ filtered.length }} 篇</span>
      </div>
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="cat-sort">
          <span class="sort-icon">↕️</span>
          <select v-model="sortBy" aria-label="排序方式">
            <option value="newest">最新优先</option>
            <option value="oldest">最旧优先</option>
          </select>
        </div>
        <div class="cat-search-box">
          <span class="search-icon">🔍</span>
          <input v-model.trim="searchQuery" type="text" placeholder="搜索本分类文章，如：银行 招聘 AI" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="filtered.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      <template v-if="searchQuery">
        <div class="text-4xl mb-3">🤔</div>
        <p>没找到“{{ searchQuery }}”相关文章</p>
        <p class="text-sm mt-2" style="color: var(--text-secondary)">试试换个关键词，或减少筛选词</p>
      </template>
      <template v-else>该分类暂无文章</template>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ArticleCard
        v-for="(article, i) in filtered"
        :key="article.id"
        :article="article"
        class="stagger-item"
        :style="{ animationDelay: `${i * 50}ms` }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ArticleCard from '../components/ArticleCard.vue'
import { useArticles } from '../composables/useArticles'
import { getCategoryStyle } from '../composables/useCategory'

const route = useRoute()
const { articles, loading, loadData } = useArticles()
const category = computed(() => route.params.cat)
const catStyle = computed(() => getCategoryStyle(category.value))

const searchQuery = ref('')
const sortBy = ref('newest') // newest = 最新优先(时间倒序), oldest = 最旧优先
const normalize = (s) => String(s ?? '').toLowerCase()

// 按空格 + 中英文边界拆分，支持“银行招聘”拆成“银行”“招聘”
const segmentKeywords = (raw) => {
  const parts = raw.toLowerCase().split(/\s+/).filter(Boolean)
  const keywords = []
  for (const p of parts) {
    const segs = p.match(/[\u4e00-\u9fa5]+|[^\u4e00-\u9fa5]+/g) || []
    for (const s of segs) {
      const trimmed = s.replace(/^[^a-z0-9\u4e00-\u9fa5]+|[^a-z0-9\u4e00-\u9fa5]+$/g, '')
      if (trimmed) keywords.push(trimmed)
    }
  }
  return [...new Set(keywords)]
}

const scoreArticle = (article, keywords) => {
  const title = normalize(article.title)
  const summary = normalize(article.summary || '')
  const source = normalize(article.source || '')
  const tags = (article.tags || []).map(normalize).join(' ')
  let score = 0
  let matched = 0
  for (const kw of keywords) {
    let best = 0
    if (title.includes(kw)) best = Math.max(best, title.startsWith(kw) ? 120 : 80)
    const sIdx = summary.indexOf(kw)
    if (sIdx !== -1) best = Math.max(best, sIdx < 30 ? 50 : 30)
    if (source.includes(kw)) best = Math.max(best, 25)
    if (tags.includes(kw)) best = Math.max(best, 40)
    if (best > 0) { matched++; score += best }
  }
  if (matched > 0) score += matched * 10
  if (matched === keywords.length) score += 40
  return matched > 0 ? score : -1
}

const filtered = computed(() => {
  const catArticles = articles.value.filter(a => a.category === category.value)
  const raw = searchQuery.value.trim()
  // 先按关键词过滤（搜索功能，其余不变）
  let list = catArticles
  if (raw) {
    const keywords = segmentKeywords(raw)
    if (keywords.length) {
      list = catArticles.filter(a => scoreArticle(a, keywords) >= 0)
    }
  }
  // 再按所选时间顺序排序（默认最新优先）
  const sorted = [...list]
  if (sortBy.value === 'newest') {
    sorted.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
  } else if (sortBy.value === 'oldest') {
    sorted.sort((a, b) => new Date(a.published || 0) - new Date(b.published || 0))
  }
  return sorted
})

onMounted(() => loadData())
</script>

<style scoped>
.cat-sort {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.cat-sort select {
  appearance: none;
  -webkit-appearance: none;
  padding: 8px 28px 8px 30px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cat-sort select:focus {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 2px rgba(91, 141, 239, 0.15);
}
.cat-sort .sort-icon {
  position: absolute;
  left: 10px;
  font-size: 13px;
  pointer-events: none;
}
.cat-search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 220px;
  max-width: 340px;
  flex: 1;
}
.cat-search-box input {
  width: 100%;
  padding: 8px 32px 8px 36px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  outline: none;
  transition: all 0.2s ease;
}
.cat-search-box input:focus {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 2px rgba(91, 141, 239, 0.15);
}
.cat-search-box input::placeholder {
  color: var(--text-muted);
}
.cat-search-box .search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  pointer-events: none;
}
.cat-search-box .search-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.cat-search-box .search-clear:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
