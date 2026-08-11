<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold mb-6">{{ t('settings.title') }}</h1>
    <el-card class="mb-4">
      <template #header>{{ t('settings.rss_management') }}</template>
      <p class="text-gray-500 text-sm mb-3">{{ t('settings.rss_desc') }}</p>
      <el-table :data="feeds" stripe>
        <el-table-column prop="name" :label="t('settings.col_name')" />
        <el-table-column prop="category" :label="t('settings.col_category')" width="100" />
        <el-table-column prop="url" :label="t('settings.col_url')" show-overflow-tooltip />
      </el-table>
    </el-card>
    <el-card class="mb-4">
      <template #header>{{ t('settings.data_update') }}</template>
      <p class="text-gray-500 text-sm whitespace-pre-line">{{ t('settings.update_desc') }}</p>
    </el-card>
    <el-card>
      <template #header>{{ t('settings.favorites_stat') }}</template>
      <p>{{ t('settings.favorited_count', { count: favorites.length }) }}</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFavorites } from '../composables/useFavorites'
import feedsData from '../../src/data/feeds.json'

const { t } = useI18n()
const { favorites } = useFavorites()
const feeds = ref(feedsData || [])
</script>
