<template>
  <div class="card-base overflow-hidden flex flex-col" :style="{ '--cat-color': catStyle.color }">
    <div class="cat-bar" :style="{ background: catStyle.color }"></div>

    <div class="p-5 flex-1 flex flex-col">
      <div class="flex flex-wrap gap-1.5 mb-2.5">
        <span class="cat-pill" :style="{ color: catStyle.color, background: hexToRgba(catStyle.color, 0.15) }">
          {{ catStyle.icon }} {{ article.category || '综合' }}
        </span>
        <span v-for="tag in displayTags" :key="tag" class="tag-pill">{{ tag }}</span>
      </div>

      <router-link :to="`/detail/${article.id}`" class="block group">
        <h3 class="text-base font-semibold leading-snug mb-2 transition-colors" style="color: var(--text-primary)">
          {{ article.title }}
        </h3>
      </router-link>

      <p class="text-sm leading-relaxed line-clamp-2 mb-3 flex-1" style="color: var(--text-secondary)">
        {{ article.summary || '暂无摘要' }}
      </p>

      <div class="flex items-center justify-between text-xs" style="color: var(--text-muted)">
        <div class="flex items-center gap-2">
          <span>{{ article.source }}</span>
          <span>·</span>
          <span>{{ formatDate(article.published) }}</span>
        </div>
        <ScoreDots v-if="article.score" :score="article.score" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getCategoryStyle, hexToRgba } from '../composables/useCategory'
import ScoreDots from './ScoreDots.vue'

const props = defineProps({
  article: { type: Object, required: true },
})

const catStyle = computed(() => getCategoryStyle(props.article.category))
const displayTags = computed(() => (props.article.tags || []).slice(0, 3))

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
.cat-bar {
  height: 2px;
  width: 100%;
}
.cat-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
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
h3:hover {
  color: var(--cat-color) !important;
}
</style>
