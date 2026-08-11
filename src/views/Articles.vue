<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ t('articles.title') }}</h1>
      <div class="flex gap-2">
        <el-input v-model="searchQuery" :placeholder="t('articles.search')" :prefix-icon="Search" clearable class="w-48" />
        <el-select v-model="sortBy" class="w-32">
          <el-option :label="t('articles.sort_score')" value="score" />
          <el-option :label="t('articles.sort_date')" value="date" />
        </el-select>
      </div>
    </div>
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    <div v-else-if="filteredArticles.length === 0" class="text-center py-20 text-gray-400">
      {{ t('articles.empty') }}
    </div>
    <div v-else class="space-y-4">
      <ArticleCard v-for="article in pagedArticles" :key="article.id" :article="article" />
      <div class="flex justify-center mt-6">
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

const { t } = useI18n()
const { articles, loading, loadData } = useArticles()
const searchQuery = ref('')
const sortBy = ref('score')
const currentPage = ref(1)
const pageSize = 20

const filteredArticles = computed(() => {
  let result = [...articles.value]
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
