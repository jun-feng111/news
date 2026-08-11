<template>
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2">
        <span class="text-2xl">📰</span>
        <span class="text-xl font-bold text-gray-800">知识情报站</span>
      </router-link>
      <nav class="flex items-center gap-4">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'home' }">首页</router-link>
        <router-link to="/articles" class="nav-link" :class="{ active: $route.name === 'articles' }">全部</router-link>
        <el-dropdown>
          <span class="nav-link">分类</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="cat in categories" :key="cat" @click="$router.push(`/category/${cat}`)">
                {{ cat }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <router-link to="/settings" class="nav-link" :class="{ active: $route.name === 'settings' }">
          <el-icon><Setting /></el-icon>
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
const categories = ['AI', '科技', '财经', '综合', '开发']
</script>

<style scoped>
.nav-link {
  @apply text-gray-600 hover:text-primary transition-colors cursor-pointer;
}
.nav-link.active {
  @apply text-primary font-semibold;
}
</style>