import { ref, watch } from 'vue'

const STORAGE_KEY = 'news-theme'
const theme = ref(localStorage.getItem(STORAGE_KEY) || 'dark')

const applyTheme = (val) => {
  document.documentElement.setAttribute('data-theme', val)
}

if (typeof document !== 'undefined') {
  applyTheme(theme.value)
}

watch(theme, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  applyTheme(val)
})

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  const isDark = () => theme.value === 'dark'
  return { theme, toggle, isDark }
}