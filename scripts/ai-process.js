import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')
const RAW_PATH = path.join(DATA_DIR, 'raw-articles.json')
const PROCESSED_PATH = path.join(DATA_DIR, 'processed-articles.json')

const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const API_KEY = process.env.AI_API_KEY || 'sk-bvtureccyhihnyqxwbscqyzkhyrazndilliznenfwscopyfw'
const MODEL = 'Qwen/Qwen2.5-7B-Instruct'

function callAI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是新闻分析助手，必须返回合法JSON' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })
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
            reject(new Error(json.error.message || JSON.stringify(json.error)))
            return
          }
          resolve(json.choices?.[0]?.message?.content || '')
        } catch (e) {
          reject(new Error('parse error: ' + data.slice(0, 200)))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

function simpleScore(article) {
  let score = 50
  const titleLen = article.title.length
  if (titleLen > 20 && titleLen < 80) score += 10
  const hotKeywords = ['AI', '人工智能', 'GPT', '大模型', 'Agent', '突破', '发布', '融资', '开源', '革命', 'launch', 'release', 'breakthrough']
  for (const kw of hotKeywords) {
    if (article.title.includes(kw) || article.content.includes(kw)) score += 5
  }
  const hoursAgo = (Date.now() - new Date(article.published).getTime()) / 3600000
  if (hoursAgo < 6) score += 15
  else if (hoursAgo < 24) score += 10
  else if (hoursAgo < 48) score += 5
  else score -= 10
  return Math.max(0, Math.min(100, score))
}

function simpleCategory(article) {
  const text = (article.title + ' ' + article.content).toLowerCase()
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
  const prompt = `分析新闻返回JSON：{"summary":"50-100字中文摘要","category":"AI/科技/财经/综合/开发","score":0到100评分,"tags":["标签1","标签2"]}

标题: ${article.title}
来源: ${article.source}
内容: ${content.slice(0, 400)}`

  const result = await callAI(prompt)
  const parsed = JSON.parse(result)
  return {
    summary: parsed.summary || simpleSummary(article),
    category: parsed.category || simpleCategory(article),
    score: typeof parsed.score === 'number' ? parsed.score : simpleScore(article),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
  }
}

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.log('无原始数据，请先运行 collect-rss.js')
    return
  }

  const articles = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
  console.log(`处理 ${articles.length} 篇文章...`)
  console.log(`API: SiliconFlow (${MODEL})`)

  let aiCount = 0
  let failCount = 0

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    if (article.summary && article.score && article.tags?.length > 0) {
      continue
    }

    try {
      const result = await processWithAI(article)
      article.summary = result.summary
      article.category = result.category
      article.score = result.score
      article.tags = result.tags
      aiCount++
      process.stdout.write(`✓`)
    } catch (e) {
      article.summary = simpleSummary(article)
      article.category = simpleCategory(article)
      article.score = simpleScore(article)
      article.tags = []
      failCount++
      process.stdout.write(`✗`)
      if (failCount <= 2) console.log(`\n  错误: ${e.message.slice(0, 150)}`)
    }

    if ((i + 1) % 5 === 0) {
      fs.writeFileSync(PROCESSED_PATH, JSON.stringify(articles, null, 2))
      process.stdout.write(` ${i + 1}/${articles.length}\n`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(articles, null, 2))
  console.log(`\nAI处理完成: ${aiCount}篇成功, ${failCount}篇回退`)
}

main().catch(console.error)
