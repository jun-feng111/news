<template>
  <div class="max-w-3xl mx-auto px-4 py-6">
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    <div v-else-if="!article" class="text-center py-20 text-gray-400">
      文章不存在
    </div>
    <div v-else>
      <button @click="$router.back()" class="text-gray-500 hover:text-primary mb-4 flex items-center gap-1">
        <el-icon><ArrowLeft /></el-icon> 返回
      </button>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center gap-2 mb-3">
          <el-tag size="small" type="primary">{{ article.category }}</el-tag>
          <el-tag v-for="tag in article.tags" :key="tag" size="small">{{ tag }}</el-tag>
        </div>
        <h1 class="text-2xl font-bold mb-3">{{ article.title }}</h1>
        <div class="text-sm text-gray-500 mb-4 flex items-center gap-4">
          <span>来源: {{ article.source }}</span>
          <span>{{ formatDate(article.published) }}</span>
          <span class="text-primary font-semibold">评分: {{ article.score }}</span>
        </div>
        <div class="bg-gray-50 rounded p-4 mb-4">
          <div class="text-sm text-gray-500 mb-1">AI摘要</div>
          <p class="text-gray-700">{{ article.summary }}</p>
        </div>
        <div class="flex gap-3">
          <a :href="article.url" target="_blank" class="el-button el-button--primary">
            阅读原文
          </a>
          <el-button @click="toggleFavorite">
            {{ isFavorite ? '★ 已收藏' : '☆ 收藏' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useArticles } from '../composables/useArticles'
import { useFavorites } from '../composables/useFavorites'

const route = useRoute()
const { articles, loading, loadData } = useArticles()
const { favorites, toggle } = useFavorites()

const article = computed(() => articles.value.find(a => a.id === route.params.id))
const isFavorite = computed(() => favorites.value.includes(route.params.id))

const toggleFavorite = () => toggle(route.params.id)
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN') : ''

onMounted(() => loadData())
</script>