export default {
  app: {
    title: 'News Hub',
  },
  nav: {
    home: 'Home',
    all: 'All',
    category: 'Category',
    settings: 'Settings',
  },
  home: {
    title: 'Today Top 10',
  },
  articles: {
    title: 'All Articles',
    search: 'Search...',
    sort_score: 'By Score',
    sort_date: 'By Date',
    empty: 'No matching articles',
  },
  category: {
    suffix: 'Category',
    empty: 'No articles in this category',
  },
  detail: {
    back: 'Back',
    ai_summary: 'AI Summary',
    read_original: 'Read Original',
    favorite: 'Favorite',
    favorited: 'Favorited',
    source: 'Source',
    score: 'Score',
  },
  settings: {
    title: 'Settings',
    rss_management: 'RSS Feed Management',
    rss_desc: 'RSS feeds are configured in src/data/feeds.json. Commit changes to take effect.',
    col_name: 'Name',
    col_category: 'Category',
    col_url: 'RSS URL',
    data_update: 'Data Update',
    update_desc: 'GitHub Actions auto-collects 4 times daily (2:00, 8:00, 14:00, 20:00 UTC).\nOr trigger manually in Actions tab.',
    favorites_stat: 'Favorites',
    favorited_count: 'Favorited: {count} articles',
  },
  common: {
    no_data: 'No data yet. Please run the collection script first.',
    loading: 'Loading...',
  },
}