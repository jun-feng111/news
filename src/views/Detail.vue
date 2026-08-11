<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="!article" class="text-center py-20" style="color: var(--text-muted)">
      {{ t('common.no_data') }}
    </div>
    <div v-else>
      <button @click="$router.back()" class="mb-6 flex items-center gap-1.5 text-sm" style="color: var(--text-secondary)">
        <el-icon><ArrowLeft /></el-icon> {{ t('detail.back') }}
      </button>

      <div class="card-base p-8">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span class="cat-pill" :style="{ color: catStyle.color, background: hexToRgba(catStyle.color, 0.15) }">
            {{ catStyle.icon }} {{ article.category || '综合' }}
          </span>
          <span v-for="tag in (article.tags || [])" :key="tag" class="tag-pill">{{ tag }}</span>
        </div>

        <h1 class="text-3xl font-bold leading-tight mb-4" style="color: var(--text-primary)">{{ article.title }}</h1>

        <div class="text-sm mb-6 flex items-center gap-4" style="color: var(--text-secondary)">
          <span>{{ article.source }}</span>
          <span>·</span>
          <span>{{ formatDate(article.published) }}</span>
          <ScoreDots v-if="article.score" :score="article.score" />
        </div>

        <div class="rounded-lg p-5 mb-6" style="background: var(--bg-hover); border: 1px solid var(--border)">
          <div class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: var(--accent-blue)">✨ {{ t('detail.ai_summary') }}</div>
          <p class="leading-relaxed" style="color: var(--text-primary)">{{ article.summary }}</p>
        </div>

        <div class="flex gap-3">
          <a :href="article.url" target="_blank" class="btn-primary">
            {{ t('detail.read_original') }} ↗
          </a>
          <button @click="toggleFavorite" class="btn-secondary">
            {{ isFavorite ? '★ ' + t('detail.favorited') : '☆ ' + t('detail.favorite') }}
          </button>
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
import { getCategoryStyle, hexToRgba } from '../composables/useCategory'
import ScoreDots from '../components/ScoreDots.vue'

const { t, locale } = useI18n()
const route = useRoute()
const { articles, loading, loadData } = useArticles()
const { favorites, toggle } = useFavorites()

const article = computed(() => articles.value.find(a => a.id === route.params.id))
const isFavorite = computed(() => favorites.value.includes(route.params.id))
const catStyle = computed(() => getCategoryStyle(article.value?.category))

const toggleFavorite = () => toggle(route.params.id)
const formatDate = (d) => d ? new Date(d).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US') : ''

onMounted(() => loadData())
</script>

<style scoped>
.cat-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
}
.tag-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  border: 1px solid var(--border);
}
.btn-primary {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  background: var(--gradient-1);
  transition: opacity 0.2s ease;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-secondary {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-hover);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  border-color: var(--border-strong);
}
</style>
