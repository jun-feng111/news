<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="flex items-center gap-3 mb-8">
      <span class="inline-block w-3 h-3 rounded-full" :style="{ background: catStyle.color }"></span>
      <h1 class="text-3xl font-bold" style="color: var(--text-primary)">{{ category }}</h1>
      <span class="text-sm" style="color: var(--text-secondary)">· {{ filtered.length }} 篇</span>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="filtered.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      该分类暂无文章
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
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ArticleCard from '../components/ArticleCard.vue'
import { useArticles } from '../composables/useArticles'
import { getCategoryStyle } from '../composables/useCategory'

const route = useRoute()
const { articles, loading, loadData } = useArticles()
const category = computed(() => route.params.cat)
const catStyle = computed(() => getCategoryStyle(category.value))

const filtered = computed(() =>
  articles.value.filter(a => a.category === category.value)
)

onMounted(() => loadData())
</script>
