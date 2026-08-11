import https from 'node:https'

const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const API_KEY = 'sk-bvtureccyhihnyqxwbscqyzkhyrazndilliznenfwscopyfw'
const MODEL = 'Qwen/Qwen2.5-7B-Instruct'

function callAI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
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
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(body)
    req.end()
  })
}

const prompt = `你是一个新闻分析助手。请分析以下新闻，返回纯JSON（不要markdown标记）：
{"summary":"50-100字中文摘要","category":"分类(AI/科技/财经/综合/开发)","score":0到100的重要性评分,"tags":["关键词1","关键词2","关键词3"]}

评分标准：重大突破90+，重要发布75-89，行业动态60-74，普通资讯50-59

标题: OpenAI reportedly completed a $7 billion employee tender offer
来源: TechCrunch
内容: `

const result = await callAI(prompt)
console.log('Raw result:')
console.log(result)
console.log('\n---Parsing---')
try {
  const json = JSON.parse(result)
  const content = json.choices?.[0]?.message?.content || ''
  console.log('Content:', content)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    console.log('Parsed:', parsed)
  } else {
    console.log('No JSON found in content')
  }
} catch (e) {
  console.log('Error:', e.message)
}