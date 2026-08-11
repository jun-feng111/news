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

    <div class="flex gap-2 mb-6 flex-wrap">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div v-show="activeTab === 'linux'" class="fade-in">
      <div class="card-base overflow-hidden mb-6">
        <div class="banner-sm relative h-32 flex items-center px-8" style="background: linear-gradient(135deg, #1a1a2e, #16213e)">
          <div class="relative z-10">
            <span class="text-3xl">🐧</span>
            <span class="text-white text-xl font-bold ml-3">Linux 常用命令</span>
            <p class="text-gray-400 text-sm mt-1">{{ linuxCommands.length }} 个高频命令速查</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="(item, i) in linuxCommands" :key="item.cmd" class="card-base p-5 stagger-item" :style="{ animationDelay: `${i * 30}ms` }">
          <div class="flex items-start justify-between mb-2">
            <code class="cmd-code">{{ item.cmd }}</code>
            <div class="flex gap-1">
              <span v-for="tag in item.tags" :key="tag" class="cmd-tag">{{ tag }}</span>
            </div>
          </div>
          <p class="text-sm mb-3" style="color: var(--text-secondary)">{{ item.desc }}</p>
          <div class="cmd-example">
            <span class="text-xs text-green-400">$</span>
            <code class="text-xs">{{ item.example }}</code>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'tech'" class="fade-in">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { linuxCommands, techStacks } from '../data/skills-data'

const tabs = [
  { key: 'linux', label: 'Linux命令', icon: '🐧' },
  { key: 'tech', label: '技术栈', icon: '💻' },
]
const activeTab = ref('linux')
const activeCat = ref('all')

const techCategories = computed(() => [...new Set(techStacks.map(t => t.category))])
const filteredTech = computed(() => {
  if (activeCat.value === 'all') return techStacks
  return techStacks.filter(t => t.category === activeCat.value)
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
.cmd-example {
  background: #0d1117; padding: 8px 12px; border-radius: 6px;
  display: flex; align-items: center; gap: 8px; overflow-x: auto;
}
.cmd-example code {
  font-family: 'JetBrains Mono', monospace; color: #c9d1d9; white-space: nowrap;
}
.use-case-tag {
  font-size: 11px; padding: 3px 8px; border-radius: 6px;
  color: var(--text-secondary); background: var(--bg-hover); border: 1px solid var(--border);
}
.hero-banner { background: var(--bg-card); }
</style>