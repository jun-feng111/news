<template>
  <div class="max-w-8xl mx-auto px-6 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary)">🛠️ 技能常识</h1>
      <p class="text-sm" style="color: var(--text-secondary)">常用Linux命令速查 · 主流技术栈对比 · 开发者必备知识</p>
    </div>

    <div class="card-base overflow-hidden mb-8">
      <div class="hero-banner relative h-48 flex items-center justify-center">
        <div class="absolute inset-0 opacity-40" style="background: linear-gradient(135deg, #667eea, #764ba2)"></div>
        <div class="relative z-10 text-center">
          <div class="text-5xl mb-2">🐧 ⚡ 💻</div>
          <p class="text-white text-lg font-semibold">从Linux命令到技术栈，一站搞定</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div class="flex gap-2 flex-wrap">
        <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key && !isSearching }" @click="activeTab = tab.key; searchQuery = ''">
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model.trim="searchQuery" type="text" placeholder="搜索技术问题，如：mysql 插入命令" />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
      </div>
    </div>

    <div v-show="activeTab === 'linux' && !isSearching" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #1a1a2e, #16213e)">
          <div class="relative z-10">
            <span class="text-3xl">🐧</span>
            <span class="text-white text-xl font-bold ml-3">Linux 常用命令</span>
            <p class="text-gray-400 text-sm mt-1">{{ linuxCommands.length }} 个命令 · {{ cmdGroups.length }} 个分类</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-4 flex-wrap items-center">
        <button class="filter-btn" :class="{ active: activeCmdCat === 'all' }" @click="activeCmdCat = 'all'">全部 {{ linuxCommands.length }}</button>
        <button v-for="g in cmdGroups" :key="g.name" class="filter-btn" :class="{ active: activeCmdCat === g.name }" @click="activeCmdCat = g.name">
          {{ g.icon }} {{ g.name }} {{ g.count }}
        </button>
      </div>

      <div class="flex gap-2 mb-6 flex-wrap items-center">
        <span class="text-xs" style="color: var(--text-muted)">使用频率：</span>
        <button v-for="f in freqLevels" :key="f.key" class="freq-btn" :class="{ active: activeFreq === f.key }" @click="activeFreq = f.key">
          <span class="freq-dot" :class="f.key"></span> {{ f.label }} {{ f.count }}
        </button>
      </div>

      <div v-if="activeCmdCat === 'all'">
        <div v-for="g in cmdGroups" :key="g.name" class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">{{ g.icon }}</span>
            <h2 class="text-lg font-bold" style="color: var(--text-primary)">{{ g.name }}</h2>
            <span class="text-sm" style="color: var(--text-muted)">{{ g.commands.length }} 个命令</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(item, i) in g.commands" :key="item.cmd" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <code class="cmd-code">{{ item.cmd }}</code>
                  <span class="freq-badge" :class="item.freq">{{ item.freq }}</span>
                </div>
                <div class="flex gap-1">
                  <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
                </div>
              </div>
              <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ item.desc }}</p>
              <p class="text-xs mb-3 cmd-detail" style="color: var(--text-muted)">{{ item.detail }}</p>
              <div class="cmd-example">
                <span class="text-xs text-green-400">$</span>
                <code class="text-xs">{{ item.example }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="(item, i) in filteredLinuxCommands" :key="item.cmd" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <code class="cmd-code">{{ item.cmd }}</code>
                <span class="freq-badge" :class="item.freq">{{ item.freq }}</span>
              </div>
              <div class="flex gap-1">
                <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
              </div>
            </div>
            <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ item.desc }}</p>
            <p class="text-xs mb-3 cmd-detail" style="color: var(--text-muted)">{{ item.detail }}</p>
            <div class="cmd-example">
              <span class="text-xs text-green-400">$</span>
              <code class="text-xs">{{ item.example }}</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'tech' && !isSearching" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #0f3460, #16537e)">
          <div class="relative z-10">
            <span class="text-3xl">💻</span>
            <span class="text-white text-xl font-bold ml-3">主流技术栈</span>
            <p class="text-gray-400 text-sm mt-1">{{ techStacks.length }} 个技术栈详解 · 优缺点对比</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-4 flex-wrap">
        <button class="filter-btn" :class="{ active: activeCat === 'all' }" @click="activeCat = 'all'">全部</button>
        <button v-for="cat in techCategories" :key="cat" class="filter-btn" :class="{ active: activeCat === cat }" @click="activeCat = cat">{{ cat }}</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div v-for="(tech, i) in filteredTech" :key="tech.name" class="card-base overflow-hidden stagger-item" :style="{ animationDelay: `${i * 40}ms` }">
          <div class="h-1.5" :style="{ background: tech.color }"></div>
          <div class="p-6">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-3xl">{{ tech.icon }}</span>
              <div>
                <h3 class="text-lg font-bold" style="color: var(--text-primary)">{{ tech.name }}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full" :style="{ color: tech.color, background: tech.color + '22' }">{{ tech.category }}</span>
              </div>
            </div>

            <p class="text-sm mb-4" style="color: var(--text-secondary)">{{ tech.desc }}</p>

            <div class="mb-3">
              <div class="text-xs font-semibold mb-1" style="color: var(--text-muted)">📌 怎么用</div>
              <p class="text-sm" style="color: var(--text-secondary)">{{ tech.how }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div class="text-xs font-semibold mb-1.5" style="color: #4ade80">✅ 优点</div>
                <ul class="space-y-1">
                  <li v-for="p in tech.pros" :key="p" class="text-xs flex gap-1" style="color: var(--text-secondary)">
                    <span class="text-green-400">·</span>{{ p }}
                  </li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-semibold mb-1.5" style="color: #f87171">❌ 缺点</div>
                <ul class="space-y-1">
                  <li v-for="c in tech.cons" :key="c" class="text-xs flex gap-1" style="color: var(--text-secondary)">
                    <span class="text-red-400">·</span>{{ c }}
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <div class="text-xs font-semibold mb-1" style="color: var(--text-muted)">🎯 适用场景</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="uc in tech.useCases" :key="uc" class="use-case-tag">{{ uc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'oracle' && !isSearching" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #c2410c, #ea580c)">
          <div class="relative z-10">
            <span class="text-3xl">🐉</span>
            <span class="text-white text-xl font-bold ml-3">Oracle 常用命令</span>
            <p class="text-gray-400 text-sm mt-1">{{ oracleCommands.length }} 个命令 · sqlplus / PL/SQL / 运维</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-6 flex-wrap items-center">
        <span class="text-xs" style="color: var(--text-muted)">使用频率：</span>
        <button class="freq-btn" :class="{ active: activeOracleFreq === 'all' }" @click="activeOracleFreq = 'all'">
          <span class="freq-dot all"></span> 全部 {{ oracleCommands.length }}
        </button>
        <button v-for="f in ['高频','中频','低频']" :key="f" class="freq-btn" :class="{ active: activeOracleFreq === f }" @click="activeOracleFreq = f">
          <span class="freq-dot" :class="f"></span> {{ f }} {{ oracleFreqCounts[f] }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(item, i) in filteredOracleCommands" :key="item.cmd" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <code class="cmd-code">{{ item.cmd }}</code>
              <span class="freq-badge" :class="item.freq">{{ item.freq }}</span>
            </div>
            <div class="flex gap-1">
              <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
            </div>
          </div>
          <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ item.desc }}</p>
          <p class="text-xs mb-3 cmd-detail" style="color: var(--text-muted)">{{ item.detail }}</p>
          <div class="cmd-example">
            <span class="text-xs text-green-400">$</span>
            <code class="text-xs">{{ item.example }}</code>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'mysql' && !isSearching" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #0066cc, #0099ff)">
          <div class="relative z-10">
            <span class="text-3xl">🐬</span>
            <span class="text-white text-xl font-bold ml-3">MySQL 常用命令</span>
            <p class="text-gray-400 text-sm mt-1">{{ mysqlCommands.length }} 个命令 · 客户端 / SQL / 运维</p>
          </div>
        </div>
      </div>

      <div class="flex gap-2 mb-6 flex-wrap items-center">
        <span class="text-xs" style="color: var(--text-muted)">使用频率：</span>
        <button class="freq-btn" :class="{ active: activeMysqlFreq === 'all' }" @click="activeMysqlFreq = 'all'">
          <span class="freq-dot all"></span> 全部 {{ mysqlCommands.length }}
        </button>
        <button v-for="f in ['高频','中频','低频']" :key="f" class="freq-btn" :class="{ active: activeMysqlFreq === f }" @click="activeMysqlFreq = f">
          <span class="freq-dot" :class="f"></span> {{ f }} {{ mysqlFreqCounts[f] }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(item, i) in filteredMysqlCommands" :key="item.cmd" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <code class="cmd-code">{{ item.cmd }}</code>
              <span class="freq-badge" :class="item.freq">{{ item.freq }}</span>
            </div>
            <div class="flex gap-1">
              <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
            </div>
          </div>
          <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ item.desc }}</p>
          <p class="text-xs mb-3 cmd-detail" style="color: var(--text-muted)">{{ item.detail }}</p>
          <div class="cmd-example">
            <span class="text-xs text-green-400">$</span>
            <code class="text-xs">{{ item.example }}</code>
          </div>
        </div>
      </div>
    </div>

    <div v-show="isSearching" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #4b6cb7, #182848)">
          <div class="relative z-10">
            <span class="text-3xl">🔍</span>
            <span class="text-white text-xl font-bold ml-3">搜索结果</span>
            <p class="text-gray-400 text-sm mt-1">{{ searchResults.length }} 条匹配 · 来自 Linux / Oracle / MySQL / 技术栈</p>
          </div>
        </div>
      </div>

      <div v-if="searchResults.length === 0" class="text-center py-16 card-base">
        <div class="text-4xl mb-3">🤔</div>
        <p style="color: var(--text-secondary)">没找到“{{ searchQuery }}”相关内容</p>
        <p class="text-sm mt-2" style="color: var(--text-muted)">试试：mysql 插入、oracle 授权、linux 压缩</p>
      </div>

      <div v-else class="space-y-8">
        <section v-for="group in searchGroups" :key="group.key" v-show="group.items.length">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">{{ group.icon }}</span>
            <h2 class="text-lg font-bold" style="color: var(--text-primary)">{{ group.title }}</h2>
            <span class="text-sm" style="color: var(--text-muted)">{{ group.items.length }} 条</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <template v-if="group.key !== 'tech'">
              <div v-for="(item, i) in group.items" :key="item.cmd + i" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <code class="cmd-code">{{ item.cmd }}</code>
                    <span class="freq-badge" :class="item.freq">{{ item.freq }}</span>
                  </div>
                  <div class="flex gap-1">
                    <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
                  </div>
                </div>
                <p class="text-sm mb-2" style="color: var(--text-secondary)">{{ item.desc }}</p>
                <p class="text-xs mb-3 cmd-detail" style="color: var(--text-muted)">{{ item.detail }}</p>
                <div class="cmd-example">
                  <span class="text-xs text-green-400">$</span>
                  <code class="text-xs">{{ item.example }}</code>
                </div>
              </div>
            </template>

            <template v-else>
              <div v-for="(tech, i) in group.items" :key="tech.name" class="card-base overflow-hidden stagger-item" :style="{ animationDelay: `${i * 40}ms` }">
                <div class="h-1.5" :style="{ background: tech.color }"></div>
                <div class="p-6">
                  <div class="flex items-center gap-3 mb-3">
                    <span class="text-3xl">{{ tech.icon }}</span>
                    <div>
                      <h3 class="text-lg font-bold" style="color: var(--text-primary)">{{ tech.name }}</h3>
                      <span class="text-xs px-2 py-0.5 rounded-full" :style="{ color: tech.color, background: tech.color + '22' }">{{ tech.category }}</span>
                    </div>
                  </div>
                  <p class="text-sm mb-4" style="color: var(--text-secondary)">{{ tech.desc }}</p>
                  <div class="mb-3">
                    <div class="text-xs font-semibold mb-1" style="color: var(--text-muted)">📌 怎么用</div>
                    <p class="text-sm" style="color: var(--text-secondary)">{{ tech.how }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div class="text-xs font-semibold mb-1.5" style="color: #4ade80">✅ 优点</div>
                      <ul class="space-y-1">
                        <li v-for="p in tech.pros" :key="p" class="text-xs flex gap-1" style="color: var(--text-secondary)">
                          <span class="text-green-400">·</span>{{ p }}
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div class="text-xs font-semibold mb-1.5" style="color: #f87171">❌ 缺点</div>
                      <ul class="space-y-1">
                        <li v-for="c in tech.cons" :key="c" class="text-xs flex gap-1" style="color: var(--text-secondary)">
                          <span class="text-red-400">·</span>{{ c }}
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold mb-1" style="color: var(--text-muted)">🎯 适用场景</div>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="uc in tech.useCases" :key="uc" class="use-case-tag">{{ uc }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { linuxCommands, techStacks, oracleCommands, mysqlCommands } from '../data/skills-data'

const CMD_GROUP_MAP = [
  { name: '文件操作', icon: '📁', tags: ['文件', '压缩', '权限'] },
  { name: '文本处理', icon: '📝', tags: ['文本', '搜索'] },
  { name: '进程管理', icon: '⚙️', tags: ['进程'] },
  { name: '网络工具', icon: '🌐', tags: ['网络'] },
  { name: '系统监控', icon: '📊', tags: ['监控'] },
  { name: '磁盘管理', icon: '💾', tags: ['磁盘'] },
  { name: '安全防护', icon: '🔒', tags: ['安全'] },
  { name: '远程连接', icon: '🔌', tags: ['远程'] },
  { name: '容器云原生', icon: '🐳', tags: ['容器'] },
  { name: '自动化部署', icon: '🚀', tags: ['自动化', '版本控制'] },
  { name: '数据库', icon: '🗄️', tags: ['数据库'] },
  { name: '云运维', icon: '☁️', tags: ['云运维', '阿里云', '华为云', 'AWS', 'AI运维'] },
  { name: '服务管理', icon: '🔧', tags: ['日志', 'Web', '系统'] },
  { name: '开发调试', icon: '🛠️', tags: ['开发', '编辑器', '调试', '测试'] },
]

const tabs = [
  { key: 'linux', label: 'Linux命令', icon: '🐧' },
  { key: 'oracle', label: 'Oracle', icon: '🐉' },
  { key: 'mysql', label: 'MySQL', icon: '🐬' },
  { key: 'tech', label: '技术栈', icon: '💻' },
]
const activeTab = ref('linux')
const activeCat = ref('all')
const activeCmdCat = ref('all')
const activeFreq = ref('all')
const activeOracleFreq = ref('all')
const activeMysqlFreq = ref('all')

const FREQ_ORDER = { '高频': 0, '中频': 1, '低频': 2 }

const freqLevels = computed(() => {
  const counts = { '高频': 0, '中频': 0, '低频': 0 }
  linuxCommands.forEach(c => { if (c.freq) counts[c.freq]++ })
  return [
    { key: 'all', label: '全部', count: linuxCommands.length },
    { key: '高频', label: '高频', count: counts['高频'] },
    { key: '中频', label: '中频', count: counts['中频'] },
    { key: '低频', label: '低频', count: counts['低频'] },
  ]
})

const sortByFreq = (arr) => [...arr].sort((a, b) => (FREQ_ORDER[a.freq] ?? 9) - (FREQ_ORDER[b.freq] ?? 9))

const cmdGroups = computed(() =>
  CMD_GROUP_MAP.map(g => {
    let commands = linuxCommands.filter(c => c.tags.some(t => g.tags.includes(t)))
    if (activeFreq.value !== 'all') commands = commands.filter(c => c.freq === activeFreq.value)
    commands = sortByFreq(commands)
    return { ...g, commands, count: commands.length }
  }).filter(g => g.count > 0)
)

const filteredLinuxCommands = computed(() => {
  if (activeCmdCat.value === 'all') {
    let cmds = activeFreq.value === 'all' ? [...linuxCommands] : linuxCommands.filter(c => c.freq === activeFreq.value)
    return sortByFreq(cmds)
  }
  const group = cmdGroups.value.find(g => g.name === activeCmdCat.value)
  return group ? group.commands : []
})

const countByFreq = (arr) => {
  const counts = { '高频': 0, '中频': 0, '低频': 0 }
  arr.forEach(c => { if (c.freq) counts[c.freq]++ })
  return counts
}
const oracleFreqCounts = computed(() => countByFreq(oracleCommands))
const mysqlFreqCounts = computed(() => countByFreq(mysqlCommands))
const filteredOracleCommands = computed(() => {
  const cmds = activeOracleFreq.value === 'all' ? [...oracleCommands] : oracleCommands.filter(c => c.freq === activeOracleFreq.value)
  return sortByFreq(cmds)
})
const filteredMysqlCommands = computed(() => {
  const cmds = activeMysqlFreq.value === 'all' ? [...mysqlCommands] : mysqlCommands.filter(c => c.freq === activeMysqlFreq.value)
  return sortByFreq(cmds)
})

const techCategories = computed(() => [...new Set(techStacks.map(t => t.category))])
const filteredTech = computed(() => {
  if (activeCat.value === 'all') return techStacks
  return techStacks.filter(t => t.category === activeCat.value)
})

const searchQuery = ref('')
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const normalize = (s) => String(s ?? '').toLowerCase()
const collectCmdText = (c, source) => [
  source, c.cmd, c.desc, c.example, c.detail, c.freq, ...(c.tags || [])
].map(normalize).join(' ')
const collectTechText = (t) => [
  t.name, t.category, t.desc, t.how,
  ...(t.pros || []), ...(t.cons || []), ...(t.useCases || [])
].map(normalize).join(' ')

// 中文动词 → 常见英文命令/SQL 关键字映射，让“插入mysql”也能命中 INSERT 命令
const SYNONYMS = {
  '插入': ['insert', 'into'],
  '增加': ['insert', 'add'],
  '查询': ['select', 'show', 'from', 'where'],
  '查找': ['select', 'show', 'grep', 'find'],
  '搜索': ['select', 'show', 'grep', 'find'],
  '删除': ['delete', 'drop', 'remove', 'rm'],
  '更新': ['update', 'modify'],
  '修改': ['update', 'alter', 'modify'],
  '创建': ['create', 'make', 'mkdir'],
  '建立': ['create', 'make'],
  '授权': ['grant', 'privilege'],
  '备份': ['backup', 'dump', 'mysqldump', 'expdp', 'impdp'],
  '恢复': ['restore', 'import', 'recover'],
  '导入': ['import', 'source', 'impdp'],
  '导出': ['export', 'dump', 'mysqldump', 'expdp'],
  '用户': ['user', 'username'],
  '表': ['table', 'tables'],
  '数据库': ['database', 'schema', 'db'],
  '权限': ['privilege', 'grant', 'permission'],
  '进程': ['process', 'ps', 'kill'],
  '日志': ['log', 'journalctl'],
  '服务': ['service', 'systemctl'],
  '端口': ['port', 'ss', 'netstat'],
  '文件': ['file', 'ls', 'find'],
  '目录': ['dir', 'directory', 'cd'],
  '压缩': ['zip', 'tar', 'gzip', 'compress'],
  '解压': ['unzip', 'tar', 'extract'],
  '查看': ['show', 'select', 'ls', 'cat'],
  '停止': ['stop', 'kill', 'shutdown'],
  '启动': ['start', 'startup', 'run'],
  '重启': ['restart', 'reload'],
  '配置': ['config', 'configure', 'conf'],
  '连接': ['connect', 'connection', 'ssh', 'sqlplus'],
  '安装': ['install', 'setup'],
}

// 把输入拆成最小关键词：空格分隔 + 中英文边界拆分
const segmentKeywords = (raw) => {
  const parts = raw.toLowerCase().split(/\s+/).filter(Boolean)
  const keywords = []
  for (const p of parts) {
    // 按连续中文字符 / 连续非中文字符切分
    const segs = p.match(/[\u4e00-\u9fa5]+|[^\u4e00-\u9fa5]+/g) || []
    for (const s of segs) {
      const trimmed = s.replace(/^[^a-z0-9\u4e00-\u9fa5]+|[^a-z0-9\u4e00-\u9fa5]+$/g, '')
      if (trimmed) keywords.push(trimmed)
    }
  }
  return [...new Set(keywords)]
}

const scoreItem = (item, keywords, source) => {
  const text = source === 'tech' ? collectTechText(item) : collectCmdText(item, source)
  const title = normalize(source === 'tech' ? item.name : item.cmd)
  let score = 0
  let matched = 0
  for (const kw of keywords) {
    const expanded = [kw, ...(SYNONYMS[kw] || [])]
    let best = 0
    for (const w of expanded) {
      const idx = text.indexOf(w)
      if (idx === -1) continue
      let s = 0
      if (title.startsWith(w)) s = 120
      else if (title.includes(w)) s = 70
      else if (idx === 0 || text[idx - 1] === ' ' || text[idx - 1] === '(') s = 45
      else s = 25
      if (s > best) best = s
    }
    if (best > 0) {
      matched++
      score += best
    }
  }
  // 命中的关键词越多越靠前；全部命中额外奖励
  if (matched > 0) score += matched * 15
  if (matched === keywords.length) score += 60
  return matched > 0 ? score : -1
}

const searchResults = computed(() => {
  const raw = searchQuery.value.trim()
  if (!raw) return []
  const keywords = segmentKeywords(raw)
  if (!keywords.length) return []

  const all = [
    ...linuxCommands.map(c => ({ source: 'linux', item: c })),
    ...oracleCommands.map(c => ({ source: 'oracle', item: c })),
    ...mysqlCommands.map(c => ({ source: 'mysql', item: c })),
    ...techStacks.map(t => ({ source: 'tech', item: t })),
  ]

  return all
    .map(({ source, item }) => ({ source, item, score: scoreItem(item, keywords, source) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(x => ({ source: x.source, ...x.item }))
})

const searchGroups = computed(() => {
  const groups = [
    { key: 'linux', title: 'Linux 命令', icon: '🐧', items: [] },
    { key: 'oracle', title: 'Oracle 常用命令', icon: '🐉', items: [] },
    { key: 'mysql', title: 'MySQL 常用命令', icon: '🐬', items: [] },
    { key: 'tech', title: '技术栈', icon: '💻', items: [] },
  ]
  for (const r of searchResults.value) {
    const g = groups.find(x => x.key === r.source)
    if (g) g.items.push(r)
  }
  return groups
})
</script>

<style scoped>
.fade-in { animation: stagger-fade 0.3s ease-out; }
.tab-btn {
  padding: 8px 20px; border-radius: 10px; font-size: 14px; font-weight: 500;
  color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.2s ease;
}
.tab-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
.tab-btn.active { color: white; background: var(--gradient-1); border-color: transparent; }
.filter-btn {
  padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
  color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.2s ease;
}
.filter-btn:hover { color: var(--text-primary); }
.filter-btn.active { color: white; background: var(--gradient-1); border-color: transparent; }
.cmd-code {
  font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600;
  color: #5b8def; background: rgba(91, 141, 239, 0.1); padding: 3px 10px; border-radius: 6px;
}
.cmd-tag {
  font-size: 10px; padding: 2px 6px; border-radius: 4px;
  color: var(--text-muted); background: var(--bg-hover); border: 1px solid var(--border);
}
.freq-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500;
  color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border);
  cursor: pointer; transition: all 0.2s ease;
}
.freq-btn:hover { color: var(--text-primary); }
.freq-btn.active { color: white; background: var(--gradient-1); border-color: transparent; }
.freq-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
}
.freq-dot.all { background: #5b8def; }
.freq-dot.高频 { background: #4ade80; }
.freq-dot.中频 { background: #fbbf24; }
.freq-dot.低频 { background: #94a3b8; }
.freq-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 600; white-space: nowrap;
}
.freq-badge.高频 { color: #4ade80; background: rgba(74, 222, 128, 0.12); border: 1px solid rgba(74, 222, 128, 0.3); }
.freq-badge.中频 { color: #fbbf24; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); }
.freq-badge.低频 { color: #94a3b8; background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.3); }
.cmd-example {
  background: #0d1117; padding: 8px 12px; border-radius: 6px;
  display: flex; align-items: center; gap: 8px; overflow-x: auto;
}
.cmd-detail {
  line-height: 1.6; padding: 6px 10px; border-radius: 6px;
  background: var(--bg-hover); border-left: 2px solid var(--border-strong);
}
.cmd-example code {
  font-family: 'JetBrains Mono', monospace; color: #c9d1d9; white-space: nowrap;
}
.use-case-tag {
  font-size: 11px; padding: 3px 8px; border-radius: 6px;
  color: var(--text-secondary); background: var(--bg-hover); border: 1px solid var(--border);
}
.hero-banner { background: var(--bg-card); }
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 240px;
  max-width: 360px;
  flex: 1;
}
.search-box input {
  width: 100%;
  padding: 8px 32px 8px 36px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  outline: none;
  transition: all 0.2s ease;
}
.search-box input:focus {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 2px rgba(91, 141, 239, 0.15);
}
.search-box input::placeholder {
  color: var(--text-muted);
}
.search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  pointer-events: none;
}
.search-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.search-clear:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
