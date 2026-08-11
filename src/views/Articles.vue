<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <h1 class="text-3xl font-bold" style="color: var(--text-primary)">{{ t('articles.title') }}</h1>
      <div class="flex gap-3">
        <el-input v-model="searchQuery" :placeholder="t('articles.search')" :prefix-icon="Search" clearable class="w-48" />
        <el-select v-model="sortBy" class="w-32">
          <el-option :label="t('articles.sort_score')" value="score" />
          <el-option :label="t('articles.sort_date')" value="date" />
        </el-select>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-6">
      <button
        v-for="cat in allCats"
        :key="cat"
        class="filter-pill"
        :class="{ active: activeCat === cat }"
        @click="activeCat = cat"
      >
        <span class="inline-block w-2 h-2 rounded-full mr-1.5" :style="{ background: getCategoryStyle(cat).color }"></span>
        {{ cat }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="filteredArticles.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      {{ t('articles.empty') }}
    </div>
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ArticleCard
          v-for="(article, i) in pagedArticles"
          :key="article.id"
          :article="article"
          class="stagger-item"
          :style="{ animationDelay: `${(i % pageSize) * 50}ms` }"
        />
      </div>
      <div class="flex justify-center mt-8">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredArticles.length"
          layout="prev, pager, next"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from '@element-plus/icons-vue'
import ArticleCard from '../components/ArticleCard.vue'
import { useArticles } from '../composables/useArticles'
import { getAllCategories, getCategoryStyle } from '../composables/useCategory'

const { t } = useI18n()
const { articles, loading, loadData } = useArticles()
const searchQuery = ref('')
const sortBy = ref('score')
const currentPage = ref(1)
const pageSize = 18
const activeCat = ref('全部')
const allCats = ['全部', ...getAllCategories()]

const filteredArticles = computed(() => {
  let result = [...articles.value]
  if (activeCat.value !== '全部') {
    result = result.filter(a => a.category === activeCat.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    )
  }
  if (sortBy.value === 'score') {
    result.sort((a, b) => (b.score || 0) - (a.score || 0))
  } else {
    result.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
  }
  return result
})

const pagedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredArticles.value.slice(start, start + pageSize)
})

onMounted(() => loadData())
</script>

<style scoped>
.filter-pill {
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
}
.filter-pill:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}
.filter-pill.active {
  color: var(--text-primary);
  border-color: var(--accent-blue);
  background: rgba(91, 141, 239, 0.1);
}
</style>
