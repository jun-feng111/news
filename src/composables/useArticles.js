import { ref } from 'vue'
import topTodayData from '../../public/data/top-today.json'
import articlesData from '../../public/data/articles.json'
import categoryTopData from '../../public/data/category-top.json'

const articles = ref(articlesData || [])
const topArticles = ref(topTodayData || [])
const categoryTop = ref(categoryTopData || {})
const loading = ref(false)

export function useArticles() {
  const loadData = async () => {}

  const getByCategory = (cat) => articles.value.filter(a => a.category === cat)

  return { articles, topArticles, categoryTop, loading, loadData, getByCategory }
}
