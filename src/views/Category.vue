<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold mb-6">{{ category }} 分类</h1>
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    <div v-else-if="filtered.length === 0" class="text-center py-20 text-gray-400">
      该分类暂无文章
    </div>
    <div v-else class="space-y-4">
      <ArticleCard v-for="article in filtered" :key="article.id" :article="article" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ArticleCard from '../components/ArticleCard.vue'
import { useArticles } from '../composables/useArticles'

const route = useRoute()
const { articles, loading, loadData } = useArticles()
const category = computed(() => route.params.cat)

const filtered = computed(() =>
  articles.value.filter(a => a.category === category.value)
)

onMounted(() => loadData())
</script>