import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'ThreePage',
    component: () => import('@/views/ThreePage.vue')
  },
  {
    path: '/three01',
    name: 'Three01',
    component: () => import('@/views/Three01.vue')
  },
  {
    path: '/house',
    name: 'ThreeHouse',
    component: () => import('@/views/ThreeHouse.vue')
  },
  {
    path: '/cesium01',
    name: 'Cesium01',
    component: () => import('@/views/Cesium01.vue')
  },
  {
    path: '/cesium02',
    name: 'cesium02',
    component: () => import('@/views/Cesium02-flyline.vue')
  },
  {
    path: '/cesium05',
    name: 'cesium05',
    component: () => import('@/views/cesium05-city.vue')
  },
  {
    path: '/ue',
    name: 'UEPixStream',
    component: () => import('@/views/UEPixStream.vue')
  },
  {
    path: '/city-point',
    name: 'CityPoint',
    component: () => import('@/views/cesium03-city-point.vue')
  },
  {
    path: '/park',
    name: 'Park',
    component: () => import('@/views/cesium04-park.vue')
  },
  {
    path: '/three-city',
    name: 'ThreeCity',
    component: () => import('@/views/three-city.vue')
  },
  {
    path: '/demo',
    name: 'Demo',
    component: () => import('@/views/main-demo.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
