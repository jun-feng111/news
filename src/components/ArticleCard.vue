<template>
  <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5 flex gap-4">
    <div v-if="rank" class="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
      {{ rank }}
    </div>
    <div class="flex-1 min-w-0">
      <router-link :to="`/detail/${article.id}`" class="block">
        <h3 class="text-lg font-semibold text-gray-800 hover:text-primary truncate">
          {{ article.title }}
        </h3>
      </router-link>
      <p class="text-gray-600 mt-1 line-clamp-2">{{ article.summary || '暂无摘要' }}</p>
      <div class="flex items-center gap-3 mt-2 text-sm text-gray-400">
        <el-tag size="small" type="info">{{ article.category }}</el-tag>
        <span>{{ article.source }}</span>
        <span>{{ formatDate(article.published) }}</span>
        <span v-if="article.score" class="text-primary font-semibold">★ {{ article.score }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  article: { type: Object, required: true },
  rank: { type: Number, default: 0 },
})

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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>