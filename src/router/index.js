import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue') },
  { path: '/articles', name: 'articles', component: () => import('../views/Articles.vue') },
  { path: '/category/:cat', name: 'category', component: () => import('../views/Category.vue') },
  { path: '/detail/:id', name: 'detail', component: () => import('../views/Detail.vue') },
  { path: '/skills', name: 'skills', component: () => import('../views/Skills.vue') },
  { path: '/jobs', name: 'jobs', component: () => import('../views/Jobs.vue') },
  { path: '/domestic-jobs', name: 'domestic-jobs', component: () => import('../views/DomesticJobs.vue') },
  { path: '/china-jobs', name: 'china-jobs', component: () => import('../views/ChinaJobs.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/Settings.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})