const CATEGORY_MAP = {
  AI: { color: '#5b8def', icon: '🤖', key: 'cat-ai' },
  科技: { color: '#4ade80', icon: '🔬', key: 'cat-tech' },
  财经: { color: '#fb923c', icon: '📈', key: 'cat-finance' },
  政策: { color: '#f87171', icon: '�️', key: 'cat-policy' },
  就业: { color: '#fbbf24', icon: '💼', key: 'cat-job' },
  开发: { color: '#22d3ee', icon: '💻', key: 'cat-dev' },
  综合: { color: '#a78bfa', icon: '🌐', key: 'cat-general' },
}

const DEFAULT_CAT = { color: '#a78bfa', icon: '📰', key: 'cat-general' }

export function getCategoryStyle(category) {
  if (!category) return DEFAULT_CAT
  return CATEGORY_MAP[category] || DEFAULT_CAT
}

export function getAllCategories() {
  return Object.keys(CATEGORY_MAP)
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
