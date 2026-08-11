<template>
  <router-link :to="`/detail/${article.id}`" class="hero-card card-base relative overflow-hidden flex flex-col justify-between" :style="{ '--cat-color': catStyle.color }">
    <div class="hero-gradient absolute inset-0 opacity-30" :style="{ background: `radial-gradient(circle at top right, ${catStyle.color}, transparent 70%)` }"></div>

    <div class="relative z-10 p-7 flex flex-col h-full justify-between">
      <div class="flex items-center gap-2 mb-4">
        <span class="cat-pill" :style="{ color: catStyle.color, background: hexToRgba(catStyle.color, 0.2) }">
          {{ catStyle.icon }} {{ article.category || '综合' }}
        </span>
        <span class="text-xs px-2 py-0.5 rounded-full" style="background: var(--gradient-2); color: white;">今日精选</span>
      </div>

      <div class="flex-1">
        <h2 class="text-2xl md:text-3xl font-bold leading-tight mb-3" style="color: var(--text-primary)">
          {{ article.title }}
        </h2>
        <p class="text-sm leading-relaxed line-clamp-3 mb-4" style="color: var(--text-secondary)">
          {{ article.summary || '暂无摘要' }}
        </p>
      </div>

      <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
        <div class="flex items-center gap-2">
          <span class="font-medium">{{ article.source }}</span>
          <span>·</span>
          <span>{{ formatDate(article.published) }}</span>
        </div>
        <ScoreDots v-if="article.score" :score="article.score" />
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { getCategoryStyle, hexToRgba } from '../composables/useCategory'
import ScoreDots from './ScoreDots.vue'

const props = defineProps({
  article: { type: Object, required: true },
})

const catStyle = computed(() => getCategoryStyle(props.article.category))

const formatDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}
</script>

<style scoped>
.hero-card {
  min-height: 320px;
}
.cat-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
h2:hover {
  color: var(--cat-color) !important;
}
</style>