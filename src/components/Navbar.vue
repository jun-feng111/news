<template>
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2">
        <span class="text-2xl">📰</span>
        <span class="text-xl font-bold text-gray-800">{{ t('app.title') }}</span>
      </router-link>
      <nav class="flex items-center gap-4">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'home' }">{{ t('nav.home') }}</router-link>
        <router-link to="/articles" class="nav-link" :class="{ active: $route.name === 'articles' }">{{ t('nav.all') }}</router-link>
        <el-dropdown>
          <span class="nav-link">{{ t('nav.category') }}</span>
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
        <el-dropdown @command="changeLang">
          <span class="nav-link cursor-pointer">{{ currentLangLabel }}</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh">中文</el-dropdown-item>
              <el-dropdown-item command="en">English</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const categories = ['AI', '科技', '财经', '综合', '开发']

const currentLangLabel = computed(() => locale.value === 'zh' ? '中文' : 'EN')

const changeLang = (lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<style scoped>
.nav-link {
  @apply text-gray-600 hover:text-primary transition-colors cursor-pointer;
}
.nav-link.active {
  @apply text-primary font-semibold;
}
</style>
