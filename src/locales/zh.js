export default {
  app: {
    title: '知识情报站',
  },
  nav: {
    home: '首页',
    all: '全部',
    category: '分类',
    settings: '设置',
  },
  home: {
    title: '今日精选 Top 10',
  },
  articles: {
    title: '全部资讯',
    search: '搜索...',
    sort_score: '评分优先',
    sort_date: '最新优先',
    empty: '暂无匹配文章',
  },
  category: {
    suffix: '分类',
    empty: '该分类暂无文章',
  },
  detail: {
    back: '返回',
    ai_summary: 'AI摘要',
    read_original: '阅读原文',
    favorite: '收藏',
    favorited: '已收藏',
    source: '来源',
    score: '评分',
  },
  settings: {
    title: '设置',
    rss_management: 'RSS订阅源管理',
    rss_desc: 'RSS源配置在 src/data/feeds.json 中，修改后提交到仓库即可生效。',
    col_name: '名称',
    col_category: '分类',
    col_url: 'RSS地址',
    data_update: '数据更新',
    update_desc: 'GitHub Actions 每天自动采集4次（2:00, 8:00, 14:00, 20:00 UTC）。\n也可在仓库 Actions 页面手动触发。',
    favorites_stat: '收藏统计',
    favorited_count: '已收藏: {count} 篇',
  },
  common: {
    no_data: '暂无数据，请先运行采集脚本',
    loading: '加载中...',
  },
}