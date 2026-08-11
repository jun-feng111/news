<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="flex items-end justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold mb-1" style="color: var(--text-primary)">{{ t('home.title') }}</h1>
        <p class="text-sm" style="color: var(--text-secondary)">{{ dateStr }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading" :size="40" style="color: var(--text-muted)"><Loading /></el-icon>
    </div>
    <div v-else-if="topArticles.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      {{ t('common.no_data') }}
    </div>
    <div v-else>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div class="lg:col-span-2">
          <HeroCard v-if="heroArticle" :article="heroArticle" />
        </div>
        <div class="space-y-4">
          <ArticleCard v-for="article in sideArticles" :key="article.id" :article="article" />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold" style="color: var(--text-primary)">最新资讯</h2>
            <router-link to="/articles" class="text-sm" style="color: var(--accent-blue)">查看全部 →</router-link>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ArticleCard
              v-for="(article, i) in latestArticles"
              :key="article.id"
              :article="article"
              class="stagger-item"
              :style="{ animationDelay: `${i * 50}ms` }"
            />
          </div>
        </div>
        <div>
          <TopList :items="topArticles" />
          <router-link to="/skills" class="skills-btn card-base mt-4 p-4 flex items-center gap-3">
            <span class="text-2xl">🛠️</span>
            <div>
              <div class="text-sm font-bold" style="color: var(--text-primary)">技能常识</div>
              <div class="text-xs" style="color: var(--text-secondary)">Linux命令 · 技术栈对比</div>
            </div>
            <span class="ml-auto" style="color: var(--text-muted)">→</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HeroCard from '../components/HeroCard.vue'
import ArticleCard from '../components/ArticleCard.vue'
import TopList from '../components/TopList.vue'
import { useArticles } from '../composables/useArticles'

const { t, locale } = useI18n()
const { articles, topArticles, loading, loadData } = useArticles()

const dateStr = computed(() => new Date().toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }))

const heroArticle = computed(() => topArticles.value[0] || null)
const sideArticles = computed(() => topArticles.value.slice(1, 4))
const latestArticles = computed(() => {
  const topIds = new Set(topArticles.value.map(a => a.id))
  return articles.value
    .filter(a => !topIds.has(a.id))
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
    .slice(0, 8)
})

onMounted(() => loadData())
</script>
