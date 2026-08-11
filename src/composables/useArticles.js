import { ref } from 'vue'
import topTodayData from '../../public/data/top-today.json'
import articlesData from '../../public/data/articles.json'

const articles = ref(articlesData || [])
const topArticles = ref(topTodayData || [])
const loading = ref(false)

export function useArticles() {
  const loadData = async () => {}

  return { articles, topArticles, loading, loadData }
}
