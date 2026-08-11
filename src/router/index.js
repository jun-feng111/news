import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue') },
  { path: '/articles', name: 'articles', component: () => import('../views/Articles.vue') },
  { path: '/category/:cat', name: 'category', component: () => import('../views/Category.vue') },
  { path: '/detail/:id', name: 'detail', component: () => import('../views/Detail.vue') },
  { path: '/skills', name: 'skills', component: () => import('../views/Skills.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/Settings.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})