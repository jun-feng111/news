<template>
  <div class="card-base p-5">
    <div class="flex items-center gap-2 mb-4">
      <span class="text-lg">🔥</span>
      <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary)">热门 TOP {{ items.length }}</h3>
    </div>
    <div class="space-y-1">
      <router-link
        v-for="(item, i) in items"
        :key="item.id"
        :to="`/detail/${item.id}`"
        class="top-row group"
        :style="{ animationDelay: `${i * 50}ms` }"
      >
        <span class="rank-num" :style="{ background: rankGradient(i) }">{{ i + 1 }}</span>
        <span class="flex-1 min-w-0 text-sm truncate" style="color: var(--text-primary)">{{ item.title }}</span>
        <span class="font-mono text-xs font-semibold flex-shrink-0" :style="{ color: scoreColor(item.score) }">{{ item.score || '-' }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
})

const rankGradient = (i) => {
  if (i < 3) return 'linear-gradient(135deg, #f093fb, #f5576c)'
  return 'linear-gradient(135deg, #667eea, #764ba2)'
}
const scoreColor = (s) => {
  if (!s) return 'var(--text-muted)'
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#5b8def'
  return 'var(--text-secondary)'
}
</script>

<style scoped>
.top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-radius: 8px;
  transition: background 0.2s ease;
  animation: stagger-fade 0.4s ease-out both;
}
.top-row:hover {
  background: var(--bg-hover);
}
.rank-num {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  -webkit-background-clip: text;
  background-clip: text;
}
.rank-num {
  -webkit-text-fill-color: white;
}
</style>