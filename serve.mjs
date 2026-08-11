import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const DIST = 'E:\\news\\dist'
const PORT = 3210

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0]
  if (url === '/') url = '/index.html'
  const filePath = path.join(DIST, url)
  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  const ext = path.extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server: http://localhost:${PORT}`)
})