import { ref } from 'vue'

const articles = ref([])
const topArticles = ref([])
const categoryTop = ref({})
const loading = ref(false)
let loaded = false

// 运行时从 public/data/ 拉取，而非构建时写死
// base: './' 下相对路径在本地和 GitHub Pages 都能正确解析
// 缓存策略由 _headers 控制（列表数据 no-cache 自动校验，详情正文 max-age 长缓存）
async function loadJson(name) {
  const res = await fetch(`./public/data/${name}`)
  if (!res.ok) throw new Error(`加载 ${name} 失败: HTTP ${res.status}`)
  return res.json()
}

export function useArticles() {
  const loadData = async () => {
    if (loaded) return
    loading.value = true
    try {
      const [arts, top, ctop] = await Promise.all([
        loadJson('articles-lite.json'),
        loadJson('top-today.json'),
        loadJson('category-top.json'),
      ])
      articles.value = Array.isArray(arts) ? arts : []
      topArticles.value = Array.isArray(top) ? top : []
      categoryTop.value = ctop && typeof ctop === 'object' ? ctop : {}
      loaded = true
    } catch (e) {
      console.error('新闻数据加载失败:', e)
    } finally {
      loading.value = false
    }
  }

  const getByCategory = (cat) => articles.value.filter(a => a.category === cat)

  return { articles, topArticles, categoryTop, loading, loadData, getByCategory }
}
