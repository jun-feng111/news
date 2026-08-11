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

const result = await callAI('你好，请回复"API正常"四个字')
console.log(result)