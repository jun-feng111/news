# PRD：个人知识情报站（Personal News Hub）

| 字段 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-08-11 |
| 负责人 | junfeng-y |
| 状态 | 草案 |

---

## 1. 背景与目标

### 1.1 背景

信息过载时代，每天有海量新闻、技术文章、行业动态产生。传统聚合工具（如RSS阅读器）只做"收集"不做"筛选"，用户仍需手动筛选有价值内容。同时，不同用户关注领域不同，通用新闻App无法满足个性化需求。

### 1.2 目标

构建一个**个人知识情报站**，自动采集多源信息，用AI做摘要、分类、评分、去重，打造"私人信息助手"。

| 目标 | 衡量指标 |
|------|----------|
| 自动采集 | 每天自动拉取100+条原始资讯 |
| AI筛选 | 重要性评分准确率>80% |
| 节省时间 | 用户每日阅读时间从1h降至20min |
| 个性化 | 支持自定义RSS源和兴趣标签 |

### 1.3 非目标

- 不做社交分享功能
- 不做内容创作/发布
- 不做付费墙/会员体系
- 不做移动端App（一期仅Web）

---

## 2. 用户画像与场景

### 2.1 目标用户

| 画像 | 描述 |
|------|------|
| 主用户 | 开发者/技术从业者，关注科技、AI、行业动态 |
| 阅读习惯 | 每天碎片化阅读，希望快速获取高价值信息 |
| 痛点 | 信息源太多，筛选耗时，容易错过重要内容 |

### 2.2 核心场景

| 场景 | 描述 |
|------|------|
| 晨间速览 | 早上花5分钟查看昨日AI筛选的Top 10重要资讯 |
| 深度阅读 | 周末按分类浏览本周收藏文章，阅读AI摘要 |
| 关键词监控 | 设置关键词（如"AI Agent"），自动推送相关新闻 |
| 热点追踪 | 同一事件多源报道聚合，查看发展脉络 |

---

## 3. 功能需求

### 3.1 P0（一期必须）

| ID | 功能 | 描述 | 验收标准 |
|----|------|------|----------|
| F01 | RSS源管理 | 添加/编辑/删除/分组RSS订阅源 | 支持导入OPML，分组管理 |
| F02 | 定时采集 | 按配置频率自动拉取RSS更新 | 默认每小时一次，可配置 |
| F03 | AI摘要 | 对每篇文章生成100字以内摘要 | 调用LLM API，支持中英文 |
| F04 | AI分类 | 自动将文章归入预设分类 | 分类准确率>85% |
| F05 | 重要性评分 | 0-100分评分，排序展示 | 基于热度+时效+用户偏好 |
| F06 | 去重聚合 | 相同事件多篇报道聚合为一 | 基于语义相似度去重 |
| F07 | 列表展示 | 按时间/评分/分类浏览 | 支持筛选、搜索、排序 |
| F08 | 收藏管理 | 收藏/归档/标签 | 支持全文搜索收藏 |

### 3.2 P1（二期）

| ID | 功能 | 描述 |
|----|------|------|
| F09 | 关键词监控 | 设置关键词，新匹配推送通知 |
| F10 | 阅读统计 | 每日/周/月阅读量、分类分布 |
| F11 | 热点脉络 | 同事件时间线展示 |
| F12 | 多端适配 | 响应式适配移动端 |

### 3.3 P2（三期）

| ID | 功能 | 描述 |
|----|------|------|
| F13 | 协作共享 | 分享阅读列表给好友 |
| F14 | 浏览器插件 | 一键收藏网页 |
| F15 | 语音播报 | TTS朗读摘要 |

---

## 4. 信息需求

### 4.1 预设RSS源

| 分类 | 源 | RSS地址 |
|------|-----|---------|
| 科技 | Hacker News | `https://hnrss.org/frontpage` |
| 科技 | 36氪 | `https://36kr.com/feed` |
| AI | 机器之心 | `https://www.jiqizhixin.com/rss` |
| AI | AI News | `https://www.artificialintelligence-news.com/feed/` |
| 综合 | BBC中文 | `https://feeds.bbci.co.uk/zhongwen/simp/rss.xml` |
| 综合 | Reuters | `https://feeds.reuters.com/reuters/topNews` |
| 财经 | 华尔街见闻 | `https://wallstreetcn.com/rss` |
| 开发 | 阮一峰 | `https://www.ruanyifeng.com/blog/atom.xml` |
| 开发 | V2EX | `https://www.v2ex.com/index.xml` |

### 4.2 AI处理字段

| 字段 | 类型 | 说明 |
|------|------|------|
| summary | string | AI生成摘要（≤100字） |
| category | enum | 科技/AI/财经/综合/开发/其他 |
| score | int | 0-100重要性评分 |
| tags | string[] | AI提取关键词标签 |
| embedding | float[] | 语义向量（用于去重） |
| sentiment | enum | 正面/负面/中性 |

---

## 5. 技术方案（纯前端 + GitHub Actions）

### 5.1 核心思路

**无需后端服务器**。GitHub Actions定时运行采集脚本，将结果生成为静态JSON文件提交到仓库；前端直接读取JSON展示。打开网页即用，零运维成本。

### 5.2 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Vue3 + Vite + TailwindCSS | 纯静态SPA |
| UI组件 | Element Plus | 快速搭建 |
| 数据存储 | JSON文件 | 提交到仓库，前端fetch读取 |
| 采集脚本 | Node.js脚本 | 在GitHub Actions中运行 |
| RSS解析 | rss-parser | 采集脚本中使用 |
| AI | 通义千问API | 在GitHub Actions中调用，免费额度 |
| 定时 | GitHub Actions cron | 每天定时采集4次 |
| 部署 | GitHub Pages / Vercel | 自动部署，免费 |

### 5.3 系统架构

```
┌─────────────────────────────────────────────┐
│           GitHub Actions (定时cron)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ RSS采集  │→│ AI处理   │→│ 生成JSON │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                    ↓                         │
│           git commit & push (JSON)           │
└───────────────────┬─────────────────────────┘
                    ↓ 自动触发部署
┌───────────────────┴─────────────────────────┐
│              前端 (Vue3 静态站)              │
│  fetch('/data/articles.json') → 直接渲染     │
│  列表页 / 详情页 / 设置页 / 统计页           │
└─────────────────────────────────────────────┘
```

### 5.4 数据文件结构

    public/data/
    ├─ articles.json          # 所有文章（含AI摘要/评分/分类）
    ├─ articles-by-date.json  # 按日期分组
    ├─ articles-by-category.json # 按分类分组
    ├─ top-today.json         # 今日Top 10
    ├─ clusters.json          # 事件聚合
    └─ feeds.json             # RSS源配置

    articles.json 单条结构:
    {
      "id": "hash",
      "title": "标题",
      "url": "原文链接",
      "summary": "AI摘要(≤100字)",
      "category": "AI/科技/财经/综合/开发",
      "score": 85,
      "tags": ["AI","Agent"],
      "source": "机器之心",
      "published": "2026-08-11T08:00:00Z",
      "fetched": "2026-08-11T10:00:00Z",
      "cluster_id": "event_xxx",
      "sentiment": "positive"
    }

### 5.5 GitHub Actions工作流

    .github/workflows/collect-news.yml
    ├─ 触发: cron "0 2,8,14,20 * * *" (每天4次)
    ├─ 步骤1: npm install
    ├─ 步骤2: node scripts/collect-rss.js
    ├─ 步骤3: node scripts/ai-process.js
    ├─ 步骤4: node scripts/cluster.js
    ├─ 步骤5: node scripts/generate-json.js
    └─ 步骤6: git commit & push

### 5.6 前端数据加载

| 场景 | 加载方式 |
|------|----------|
| 首页Top10 | `fetch('/data/top-today.json')` |
| 全部文章 | `fetch('/data/articles.json')` 前端分页 |
| 分类浏览 | `fetch('/data/articles-by-category.json')` |
| 事件聚合 | `fetch('/data/clusters.json')` |
| 收藏/已读 | localStorage（纯前端存储） |
| RSS源管理 | 编辑仓库`feeds.json`后提交 |

---

## 6. 里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| M1 骨架 | 第1天 | Vue3项目初始化，目录结构，基础页面 |
| M2 采集 | 第2天 | RSS采集脚本，GitHub Actions配置 |
| M3 AI | 第3天 | AI摘要/分类/评分脚本 |
| M4 前端 | 第4天 | 列表/详情/分类/设置页面 |
| M5 上线 | 第5天 | 部署GitHub Pages，验证自动更新 |

---

## 7. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| AI API费用 | 高 | 用通义千问免费额度，缓存结果 |
| RSS源失效 | 中 | 监控失败率，自动跳过 |
| GitHub Actions限额 | 中 | 免费2000分钟/月，每天4次足够 |
| JSON文件过大 | 中 | 每次只保留最近7天数据，旧数据归档 |
| 跨域问题 | 无 | 同源读取，不存在跨域 |

---

## 8. 开放问题

| 问题 | 状态 |
|------|------|
| AI用通义千问还是OpenAI？ | 建议通义千问（免费额度大） |
| 是否需要用户登录？ | 不需要，单用户本地使用 |
| 部署平台？ | GitHub Pages（完全免费） |