import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')

// 智谱 GLM（OpenAI 兼容）。key 只从环境变量读取，切勿硬编码进代码。
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = process.env.AI_API_KEY
const MODEL = 'glm-4-flash'

// 控制参数
const AI_BUDGET_MS = 35 * 60 * 1000   // 全局时间预算：35 分钟，给后续步骤留余量
const FRESH_WINDOW_MS = 48 * 3600 * 1000  // 只给 48 小时内的文章调 AI，旧文走启发式
const CONCURRENCY = 5                 // 并发调用数（免费档也别开太大，避免 429）
const MAX_BAD_CHUNKS = 2              // 连续整块失败即判定不可达，提前结束
const REQ_TIMEOUT_MS = 25000          // 单请求超时：25 秒

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function callAI(prompt, maxTokens = 400, systemMsg = '你是新闻分析助手，必须返回合法JSON') {
  return callChat({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  })
}

function callAIText(prompt, maxTokens = 2000) {
  return callChat({
    model: MODEL,
    messages: [
      { role: 'system', content: '你是一位专业的科技新闻翻译，将英文翻译成流畅的简体中文。技术术语保留英文在括号内，如：大语言模型(LLM)。保持段落结构。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
  })
}

function callChat(bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj)
    const req = https.request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            const msg = json.error.message || JSON.stringify(json.error)
            reject(new Error(msg))
            return
          }
          resolve(json.choices?.[0]?.message?.content || '')
        } catch (e) {
          reject(new Error('parse error: ' + data.slice(0, 200)))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(REQ_TIMEOUT_MS, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

// 限流重试：遇到 429 退避后重试，最多 3 次
async function withRetry(fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      const isRate = /429|rate.?limit/i.test(e.message)
      if (isRate && i < tries - 1) {
        await sleep(1000 * (i + 1))
        continue
      }
      throw e
    }
  }
}

function isChinese(text) {
  if (!text) return true
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  return chineseChars / text.length > 0.3
}

function splitLongText(text, maxLen = 3000) {
  if (text.length <= maxLen) return [text]
  const chunks = []
  const paragraphs = text.split(/\n\n+|\r\n\r\n+/)
  let current = ''
  for (const p of paragraphs) {
    if ((current + p).length > maxLen) {
      if (current) chunks.push(current)
      if (p.length > maxLen) {
        for (let i = 0; i < p.length; i += maxLen) {
          chunks.push(p.slice(i, i + maxLen))
        }
        current = ''
      } else {
        current = p
      }
    } else {
      current += (current ? '\n\n' : '') + p
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function simpleScore(article) {
  let score = 50
  const titleLen = article.title.length
  if (titleLen > 20 && titleLen < 80) score += 10
  const hotKeywords = ['AI', '人工智能', 'GPT', '大模型', 'Agent', '突破', '发布', '融资', '开源', '革命', 'launch', 'release', 'breakthrough']
  for (const kw of hotKeywords) {
    if (article.title.includes(kw) || (article.content || '').includes(kw)) score += 5
  }
  const hoursAgo = (Date.now() - new Date(article.published).getTime()) / 3600000
  if (hoursAgo < 6) score += 15
  else if (hoursAgo < 24) score += 10
  else if (hoursAgo < 48) score += 5
  else score -= 10
  return Math.max(0, Math.min(100, score))
}

function simpleCategory(article) {
  const text = (article.title + ' ' + (article.content || '')).toLowerCase()
  if (/ai|人工智能|gpt|llm|大模型|machine learning|deep learning|openai|claude|gemini/.test(text)) return 'AI'
  if (/股市|基金|融资|经济|金融|投资|stock|finance|market/.test(text)) return '财经'
  if (/代码|编程|开发|github|框架|api|programming|developer|rust|python|javascript/.test(text)) return '开发'
  if (/科技|technology|手机|芯片|硬件|tech|apple|google|microsoft|meta/.test(text)) return '科技'
  return article.category || '综合'
}

function simpleSummary(article) {
  const text = article.content || article.title
  const sentences = text.split(/[。.！!？?]/).filter(s => s.trim().length > 5)
  return sentences.slice(0, 2).join('。').slice(0, 100) || article.title
}

async function processWithAI(article) {
  const content = (article.content || '').trim() || '(无正文，根据标题分析)'
  const prompt = `分析新闻返回JSON：{"title_zh":"中文标题(如果是英文则翻译成中文,如果是中文则保留)","summary":"50-100字中文摘要","category":"AI/科技/财经/综合/开发","score":0到100评分,"tags":["标签1","标签2"]}

标题: ${article.title}
来源: ${article.source}
内容: ${content.slice(0, 400)}`

  const result = await withRetry(() => callAI(prompt))
  const parsed = JSON.parse(result)
  return {
    title: parsed.title_zh || article.title,
    summary: parsed.summary || simpleSummary(article),
    category: parsed.category || simpleCategory(article),
    score: typeof parsed.score === 'number' ? parsed.score : simpleScore(article),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
  }
}

async function translateFullContent(article) {
  if (!article.contentFull) return ''
  if (isChinese(article.contentFull)) return article.contentFull
  const chunks = splitLongText(article.contentFull, 3000)
  const results = []
  for (const chunk of chunks.slice(0, 3)) {
    try {
      const translated = await withRetry(() => callAIText(`将以下英文翻译成中文，保持段落结构：\n\n${chunk}`, 2000))
      results.push(translated)
    } catch (e) {
      results.push(chunk)
    }
    await sleep(300)
  }
  return results.join('\n\n')
}

// 处理单篇：返回统计。meta 失败算该篇失败；翻译失败非致命（回退原文）。
async function processArticle(article) {
  const stat = { ok: true, ai: 0, trans: 0, fail: 0 }
  const needMeta = !article.summary || !article.score || !article.tags?.length
  const needTrans = !article.contentZh && article.contentFull && !isChinese(article.contentFull)

  if (!needMeta && !needTrans) return stat

  if (needMeta) {
    try {
      const result = await processWithAI(article)
      article.summary = result.summary
      article.category = result.category
      article.score = result.score
      article.tags = result.tags
      article.title = result.title
      stat.ai = 1
    } catch (e) {
      article.summary = simpleSummary(article)
      article.category = simpleCategory(article)
      article.score = simpleScore(article)
      article.tags = []
      stat.fail = 1
      stat.ok = false
    }
  }

  if (needTrans) {
    try {
      article.contentZh = await translateFullContent(article)
      stat.trans = 1
    } catch (e) {
      article.contentZh = article.contentFull || ''
    }
  } else if (!article.contentZh && article.contentFull) {
    article.contentZh = article.contentFull
  }

  return stat
}

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.log('无原始数据，请先运行 collect-rss.js')
    return
  }

  const articles = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
  console.log(`读取 ${articles.length} 篇文章...`)
  console.log(`API: 智谱 GLM (${MODEL})`)

  const now = Date.now()
  let fresh = []
  let skippedOld = 0

  if (!API_KEY) {
    console.warn('⚠️ 未设置 AI_API_KEY，全部文章改用启发式摘要（不调 AI）')
  } else {
    for (const a of articles) {
      const pub = a.published ? new Date(a.published).getTime() : NaN
      const isFresh = isNaN(pub) ? true : (now - pub <= FRESH_WINDOW_MS)
      if (!isFresh) {
        if (!a.summary) a.summary = simpleSummary(a)
        if (!a.score) a.score = simpleScore(a)
        if (!a.category) a.category = simpleCategory(a)
        if (!a.tags?.length) a.tags = []
        skippedOld++
        continue
      }
      fresh.push(a)
    }
    console.log(`新鲜(${FRESH_WINDOW_MS / 3600000}h内) ${fresh.length} 篇将调 AI；跳过旧文 ${skippedOld} 篇用启发式`)
  }

  let aiCount = 0, failCount = 0, transCount = 0
  const start = Date.now()
  let badChunks = 0

  for (let i = 0; i < fresh.length; i += CONCURRENCY) {
    if (Date.now() - start > AI_BUDGET_MS) {
      console.log(`\n[AI] 已达时间预算(${AI_BUDGET_MS / 60000}分钟)，剩余 ${fresh.length - i} 篇改用启发式，确保流水线完成并提交`)
      break
    }
    const chunk = fresh.slice(i, i + CONCURRENCY)
    const results = await Promise.all(chunk.map(a => processArticle(a)))

    let chunkFails = 0
    for (const r of results) {
      aiCount += r.ai
      transCount += r.trans
      failCount += r.fail
      if (!r.ok) chunkFails++
    }

    // 整块全失败：疑似不可达，连出两块就提前收工
    if (chunkFails === chunk.length) {
      badChunks++
      if (badChunks >= MAX_BAD_CHUNKS) {
        console.log(`\n[AI] 连续 ${MAX_BAD_CHUNKS} 块调用全部失败，疑似 API 不可达，提前结束 AI 步骤`)
        break
      }
    } else {
      badChunks = 0
    }

    if ((i / CONCURRENCY) % 3 === 0) {
      fs.writeFileSync(PROCESSED_PATH, JSON.stringify(articles, null, 2))
      process.stdout.write(`已处理 ${Math.min(i + CONCURRENCY, fresh.length)}/${fresh.length}\n`)
    }
  }

  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(articles, null, 2))
  console.log(`\nAI处理完成: ${aiCount}篇元数据, ${transCount}篇翻译, ${failCount}篇失败（旧文启发式 ${skippedOld} 篇）`)
}

main().catch(console.error)
