<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-bold mb-6">设置</h1>
    <el-card class="mb-4">
      <template #header>RSS订阅源管理</template>
      <p class="text-gray-500 text-sm mb-3">
        RSS源配置在 <code>src/data/feeds.json</code> 中，修改后提交到仓库即可生效。
      </p>
      <el-table :data="feeds" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="url" label="RSS地址" show-overflow-tooltip />
      </el-table>
    </el-card>
    <el-card class="mb-4">
      <template #header>数据更新</template>
      <p class="text-gray-500 text-sm">
        GitHub Actions 每天自动采集4次（2:00, 8:00, 14:00, 20:00 UTC）。<br>
        也可在仓库 Actions 页面手动触发。
      </p>
    </el-card>
    <el-card>
      <template #header>收藏统计</template>
      <p>已收藏: {{ favorites.length }} 篇</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFavorites } from '../composables/useFavorites'
import feedsData from '../../src/data/feeds.json'

const { favorites } = useFavorites()
const feeds = ref(feedsData || [])
</script>