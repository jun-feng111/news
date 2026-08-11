<template>
  <div class="max-w-3xl mx-auto px-4 py-6">
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>
    <div v-else-if="!article" class="text-center py-20 text-gray-400">
      {{ t('common.no_data') }}
    </div>
    <div v-else>
      <button @click="$router.back()" class="text-gray-500 hover:text-primary mb-4 flex items-center gap-1">
        <el-icon><ArrowLeft /></el-icon> {{ t('detail.back') }}
      </button>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center gap-2 mb-3">
          <el-tag size="small" type="primary">{{ article.category }}</el-tag>
          <el-tag v-for="tag in article.tags" :key="tag" size="small">{{ tag }}</el-tag>
        </div>
        <h1 class="text-2xl font-bold mb-3">{{ article.title }}</h1>
        <div class="text-sm text-gray-500 mb-4 flex items-center gap-4">
          <span>{{ t('detail.source') }}: {{ article.source }}</span>
          <span>{{ formatDate(article.published) }}</span>
          <span class="text-primary font-semibold">{{ t('detail.score') }}: {{ article.score }}</span>
        </div>
        <div class="bg-gray-50 rounded p-4 mb-4">
          <div class="text-sm text-gray-500 mb-1">{{ t('detail.ai_summary') }}</div>
          <p class="text-gray-700">{{ article.summary }}</p>
        </div>
        <div class="flex gap-3">
          <a :href="article.url" target="_blank" class="el-button el-button--primary">
            {{ t('detail.read_original') }}
          </a>
          <el-button @click="toggleFavorite">
            {{ isFavorite ? '★ ' + t('detail.favorited') : '☆ ' + t('detail.favorite') }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useArticles } from '../composables/useArticles'
import { useFavorites } from '../composables/useFavorites'

const { t, locale } = useI18n()
const route = useRoute()
const { articles, loading, loadData } = useArticles()
const { favorites, toggle } = useFavorites()

const article = computed(() => articles.value.find(a => a.id === route.params.id))
const isFavorite = computed(() => favorites.value.includes(route.params.id))

const toggleFavorite = () => toggle(route.params.id)
const formatDate = (d) => d ? new Date(d).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US') : ''

onMounted(() => loadData())
</script>
