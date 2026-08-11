<template>
  <div class="max-w-4xl mx-auto px-6 py-8">
    <h1 class="text-3xl font-bold mb-8" style="color: var(--text-primary)">{{ t('settings.title') }}</h1>

    <div class="card-base p-6 mb-5">
      <h2 class="text-lg font-bold mb-3" style="color: var(--text-primary)">{{ t('settings.rss_management') }}</h2>
      <p class="text-sm mb-4" style="color: var(--text-secondary)">{{ t('settings.rss_desc') }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="border-bottom: 1px solid var(--border)">
              <th class="text-left py-2 px-3 font-semibold" style="color: var(--text-secondary)">{{ t('settings.col_name') }}</th>
              <th class="text-left py-2 px-3 font-semibold" style="color: var(--text-secondary)">{{ t('settings.col_category') }}</th>
              <th class="text-left py-2 px-3 font-semibold" style="color: var(--text-secondary)">{{ t('settings.col_url') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feed in feeds" :key="feed.url" style="border-bottom: 1px solid var(--border)">
              <td class="py-2 px-3" style="color: var(--text-primary)">{{ feed.name }}</td>
              <td class="py-2 px-3">
                <span class="inline-block w-2 h-2 rounded-full mr-1.5" :style="{ background: getCategoryStyle(feed.category).color }"></span>
                <span style="color: var(--text-secondary)">{{ feed.category }}</span>
              </td>
              <td class="py-2 px-3 truncate max-w-xs" style="color: var(--text-muted)">{{ feed.url }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card-base p-6 mb-5">
      <h2 class="text-lg font-bold mb-3" style="color: var(--text-primary)">{{ t('settings.data_update') }}</h2>
      <p class="text-sm whitespace-pre-line" style="color: var(--text-secondary)">{{ t('settings.update_desc') }}</p>
    </div>

    <div class="card-base p-6">
      <h2 class="text-lg font-bold mb-3" style="color: var(--text-primary)">{{ t('settings.favorites_stat') }}</h2>
      <p style="color: var(--text-primary)">{{ t('settings.favorited_count', { count: favorites.length }) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFavorites } from '../composables/useFavorites'
import { getCategoryStyle } from '../composables/useCategory'
import feedsData from '../data/feeds.json'

const { t } = useI18n()
const { favorites } = useFavorites()
const feeds = ref(feedsData || [])
</script>
