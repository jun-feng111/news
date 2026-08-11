import { ref, watch } from 'vue'

const STORAGE_KEY = 'news-favorites'
const favorites = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

watch(favorites, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function useFavorites() {
  const toggle = (id) => {
    const idx = favorites.value.indexOf(id)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(id)
    }
  }

  return { favorites, toggle }
}