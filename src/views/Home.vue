<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">今日精选 Top 10</h1>
      <span class="text-sm text-gray-500">{{ dateStr }}</span>
    </div>
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    <div v-else-if="topArticles.length === 0" class="text-center py-20 text-gray-400">
      暂无数据，请先运行采集脚本
    </div>
    <div v-else class="space-y-4">
      <ArticleCard v-for="(article, i) in topArticles" :key="article.id" :article="article" :rank="i + 1" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ArticleCard from '../components/ArticleCard.vue'
import { useArticles } from '../composables/useArticles'

const { topArticles, loading, loadData } = useArticles()
const dateStr = computed(() => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }))

onMounted(() => loadData())
</script>