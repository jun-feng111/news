# 站内全文中文阅读改造文档

| 字段 | 内容 |
|------|------|
| 版本 | v2.0 |
| 日期 | 2026-08-11 |
| 目标 | 面向国内中文读者，站内全文展示，无需跳转外站 |

---

## 1. 背景与问题

### 1.1 当前痛点

| 问题 | 影响 |
|------|------|
| 原文多为海外站点(TechCrunch/Ars/AI News等) | 国内读者点击跳转后打不开或极慢 |
| RSS只有摘要，无全文 | 读者想看全文必须跳转，但跳转不了 |
| 英文标题+英文摘要 | 中文母语读者阅读门槛高 |
| 详情页内容单薄 | 只有AI摘要，没有全文 |
| 分类页无"精选"概念 | 读者不知道该看哪篇 |

### 1.2 改造方向

**核心思路：把内容搬进来，翻译成中文，站内直接看全文。**

- 抓取原文全文（不只RSS摘要）
- AI翻译成中文（英文源）
- 站内详情页展示全文（不跳转外站）
- 首页按分类展示每类Top 3-5热门
- 原文链接保留为"查看原文(需科学上网)"备选

---

## 2. 数据流程改造

### 2.1 新采集流程

```
RSS采集 → 抓取全文 → AI处理(摘要/分类/评分/标签) → AI翻译(英文→中文) → 生成JSON
```

### 2.2 各脚本改动

#### collect-rss.js（RSS采集）
- 维持现有RSS采集逻辑
- 新增：对每篇文章抓取原文页面全文
- 使用 readability 提取正文（去广告/导航/侧栏）
- 超时10秒跳过，回退用RSS摘要
- 输出 `raw-articles.json`（含 `contentHtml` 字段）

#### ai-process.js（AI处理）
- 维持现有：摘要/分类/评分/标签/标题翻译
- 新增：全文翻译（英文→中文）
- 翻译策略：
  - 中文源：跳过翻译，直接用原文
  - 英文源：调用AI翻译全文，保留段落结构
  - 超长文章(>8000字)：分段翻译
- 输出增加字段：`contentZh`（中文全文）、`needTranslate`（是否需要翻译）

#### generate-json.js（生成前端数据）
- 输出 `articles.json`：含 `contentZh` 全文字段
- 输出 `top-today.json`：热门Top10
- 新增 `category-top.json`：每分类Top5
- 控制单文件大小，全文可能较大，按需拆分

### 2.3 AI翻译Prompt

```
你是一位专业的科技新闻翻译。将以下英文文章翻译成简体中文。
要求：
1. 保持段落结构不变
2. 技术术语保留英文原文在括号内，如：大语言模型(LLM)
3. 代码块不翻译
4. 自然流畅，符合中文阅读习惯
5. 专有名词首次出现给出中文译名

文章内容：
{content}
```

---

## 3. 前端展示改造

### 3.1 首页改造

```
┌──────────────────────────────────────────────┐
│  顶栏                                        │
├──────────────────────────────────────────────┤
│  Hero区：今日最热1篇（大卡片）                │
├──────────────────────────────────────────────┤
│  AI 精选（3篇）       │  科技 精选（3篇）     │
│  ┌──┐ ┌──┐ ┌──┐     │  ┌──┐ ┌──┐ ┌──┐     │
│  └──┘ └──┘ └──┘     │  └──┘ └──┘ └──┘     │
├──────────────────────────────────────────────┤
│  财经 精选（3篇）     │  开发 精选（3篇）     │
│  ┌──┐ ┌──┐ ┌──┐     │  ┌──┐ ┌──┐ ┌──┐     │
│  └──┘ └──┘ └──┘     │  └──┘ └──┘ └──┘     │
├──────────────────────────────────────────────┤
│  热门TOP10 侧边栏 / 最新资讯                  │
└──────────────────────────────────────────────┘
```

- 每分类一个区块，标题带分类色
- 每区块横排3篇卡片（评分最高的）
- 点击进入详情页看全文

### 3.2 详情页改造（核心）

```
┌──────────────────────────────────────────────┐
│  ← 返回                                      │
├──────────────────────────────────────────────┤
│  [AI] [GPT-5] [OpenAI]                       │
│                                              │
│  OpenAI发布GPT-5，性能提升40%                │
│  （大标题）                                   │
│                                              │
│  TechCrunch · 2小时前 · 评分●●●●○ 85         │
├──────────────────────────────────────────────┤
│                                              │
│  【AI摘要】                                   │
│  OpenAI最新模型在多项基准测试中...            │
│                                              │
│  【全文】                                     │
│  北京时间8月11日凌晨，OpenAI正式发布...       │
│  ......（完整中文全文）                       │
│  ......                                      │
│  ......                                      │
│                                              │
│  第一段                                      │
│  第二段                                      │
│  ......                                      │
│                                              │
├──────────────────────────────────────────────┤
│  [收藏] [查看原文(需科学上网)↗]              │
└──────────────────────────────────────────────┘
```

- 站内展示中文全文（`contentZh`）
- 全文用 prose 排版，舒适阅读体验
- 原文链接降级为底部小按钮
- 不再需要跳转外站

### 3.3 分类页改造

- 顶部展示该分类Top 5大卡片
- 下方列表展示全部
- 标题改为"AI精选"/"科技精选"等

### 3.4 全部文章页

- 维持现有网格布局
- 卡片显示中文标题+中文摘要
- 点击进详情看全文

---

## 4. 技术实现细节

### 4.1 全文抓取

```javascript
// scripts/fetch-content.js
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

async function fetchFullContent(url) {
  try {
    const html = await fetch(url, { timeout: 10000 }).then(r => r.text())
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()
    return article?.contentHtml || article?.textContent || ''
  } catch {
    return ''  // 抓取失败回退摘要
  }
}
```

### 4.2 AI全文翻译

```javascript
async function translateContent(content, apiKey) {
  if (!content || isChinese(content)) return content
  // 超长分段
  const chunks = splitLongText(content, 4000)
  const translated = await Promise.all(
    chunks.map(chunk => callAI(TRANSLATE_PROMPT + chunk, apiKey))
  )
  return translated.join('\n')
}
```

### 4.3 数据字段扩展

```json
{
  "id": "xxx",
  "title": "OpenAI发布GPT-5",
  "titleEn": "OpenAI releases GPT-5",
  "summary": "AI摘要...",
  "contentZh": "<p>全文段落1</p><p>全文段落2</p>...",
  "category": "AI",
  "score": 85,
  "tags": ["GPT-5", "OpenAI"],
  "source": "TechCrunch",
  "published": "2026-08-11T...",
  "url": "https://techcrunch.com/...",
  "needTranslate": false
}
```

### 4.4 GitHub Actions调整

- 增加全文抓取步骤（耗时更长）
- AI翻译步骤（每篇约10-30秒）
- 增量保存频率提高到每3篇
- 超时从5分钟延长到15分钟

---

## 5. 实现清单

### 5.1 数据层
- [ ] 安装 `@mozilla/readability` + `jsdom` 依赖
- [ ] 新增 `scripts/fetch-content.js` 全文抓取脚本
- [ ] 改造 `ai-process.js` 增加全文翻译
- [ ] 改造 `generate-json.js` 输出 `category-top.json`
- [ ] 更新 GitHub Actions workflow

### 5.2 前端层
- [ ] 改造首页：分类精选区块布局
- [ ] 改造详情页：站内全文展示（prose排版）
- [ ] 原文链接降级为底部备选
- [ ] 改造分类页：Top5大卡片+列表
- [ ] 加载 category-top.json 数据

### 5.3 体验优化
- [ ] 全文长图加载骨架屏
- [ ] 全文目录锚点（长文章）
- [ ] 字号调节选项
- [ ] 阅读进度条