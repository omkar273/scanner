import { createRouter, createWebHistory } from 'vue-router'
import IndexView from '@/views/IndexView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexView
    },
    {
      path: '/scan',
      name: 'scan',
      component: () => import('@/views/ScanViewFeatureDetectView.vue')
    },
    {
      path: '/scan-canvas',
      name: 'scan-canvas',
      component: () => import('@/views/CanvasScanView.vue')
    },
    {
      path: '/scan-magica',
      name: 'scan-magica',
      component: () => import('@/views/MagicaScanView.vue')
    },
    {
      path: '/batch-scan',
      name: 'batch-scan',
      component: () => import('@/views/BatchScanView.vue')
    },
    // catch all redirect to /
    {
      path: '/:pathMatch(.*)*',
      name: 'catch-all',
      redirect: { name: 'index' }
    }
  ]
})

export default router
