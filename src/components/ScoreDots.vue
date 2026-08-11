<template>
  <div class="flex items-center gap-1" :title="`评分 ${score}`">
    <span
      v-for="i in 5"
      :key="i"
      class="dot"
      :style="{ background: i <= filled ? dotColor : 'var(--border-strong)' }"
    ></span>
    <span class="ml-1 font-mono text-xs font-semibold" :style="{ color: dotColor }">{{ score }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
})

const filled = computed(() => Math.ceil(props.score / 20))
const dotColor = computed(() => {
  if (props.score >= 80) return '#4ade80'
  if (props.score >= 60) return '#5b8def'
  return '#8b8b96'
})
</script>

<style scoped>
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: background 0.3s ease;
}
</style>