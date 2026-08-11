<template>
  <header class="glass sticky top-0 z-50" style="border-bottom: 1px solid var(--border)">
    <div class="max-w-8xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2.5 flex-shrink-0">
        <span class="text-2xl">📰</span>
        <span class="text-xl font-bold gradient-text">{{ t('app.title') }}</span>
      </router-link>

      <nav class="hidden md:flex items-center gap-1">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'home' }">{{ t('nav.home') }}</router-link>
        <router-link to="/articles" class="nav-link" :class="{ active: $route.name === 'articles' }">{{ t('nav.all') }}</router-link>
        <el-dropdown @command="goCategory">
          <span class="nav-link" :class="{ active: $route.name === 'category' }">{{ t('nav.category') }} ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="cat in categories" :key="cat" :command="cat">
                <span class="inline-block w-2 h-2 rounded-full mr-2" :style="{ background: getCategoryStyle(cat).color }"></span>
                {{ cat }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </nav>

      <div class="flex items-center gap-3">
        <el-dropdown @command="changeLang">
          <span class="icon-btn">{{ currentLangLabel }}</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh">中文</el-dropdown-item>
              <el-dropdown-item command="en">English</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button class="icon-btn" @click="toggleTheme" :title="isDark() ? '切换亮色' : '切换暗色'">
          {{ isDark() ? '☀️' : '🌙' }}
        </button>
        <router-link to="/settings" class="icon-btn" :class="{ active: $route.name === 'settings' }">
          ⚙️
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { getAllCategories, getCategoryStyle } from '../composables/useCategory'

const { t, locale } = useI18n()
const router = useRouter()
const { toggle: toggleTheme, isDark } = useTheme()
const categories = getAllCategories()

const currentLangLabel = computed(() => locale.value === 'zh' ? '中' : 'EN')

const changeLang = (lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

const goCategory = (cat) => {
  router.push(`/category/${cat}`)
}
</script>

<style scoped>
.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
}
.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.nav-link.active {
  color: var(--text-primary);
  background: var(--bg-hover);
}
.icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  border: none;
  background: transparent;
}
.icon-btn:hover,
.icon-btn.active {
  color: var(--text-primary);
  background: var(--bg-hover);
}
</style>
