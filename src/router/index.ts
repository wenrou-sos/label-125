import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/Layout.vue'
import { useAuthStore } from '@/stores/auth'
import type { RoleKey } from '@/types'

export interface MenuMeta {
  title: string
  icon?: string
  group?: string
  roles?: RoleKey[]
  hidden?: boolean
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/Login.vue'),
    meta: { hidden: true },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/Dashboard.vue'), meta: { title: '工作台总览', icon: 'Odometer', group: '工作台', roles: ['admin', 'branch', 'coach'] } },

      { path: 'branch', name: 'branch', component: () => import('@/views/branch/BranchList.vue'), meta: { title: '分校指标统计', icon: 'School', group: '分校管理', roles: ['admin', 'branch'] } },
      { path: 'branch/ranking', name: 'branch-ranking', component: () => import('@/views/branch/BranchRanking.vue'), meta: { title: '通过率动态排名', icon: 'TrendCharts', group: '分校管理', roles: ['admin', 'branch'] } },
      { path: 'branch/dashboard/:id', name: 'branch-dashboard', component: () => import('@/views/branch/BranchDashboard.vue'), meta: { title: '分校运营仪表盘', group: '分校管理', roles: ['admin', 'branch'], hidden: true } },

      { path: 'coach', name: 'coach', component: () => import('@/views/coach/CoachList.vue'), meta: { title: '教练档案', icon: 'Avatar', group: '教练管理', roles: ['admin', 'branch'] } },
      { path: 'coach/ranking', name: 'coach-ranking', component: () => import('@/views/coach/CoachRanking.vue'), meta: { title: '月度通过率排行', icon: 'Medal', group: '教练管理', roles: ['admin', 'branch'] } },
      { path: 'coach/review', name: 'coach-review', component: () => import('@/views/coach/CoachReview.vue'), meta: { title: '学员评价', icon: 'ChatLineSquare', group: '教练管理', roles: ['admin', 'branch'] } },
      { path: 'coach/complaint', name: 'coach-complaint', component: () => import('@/views/coach/CoachComplaint.vue'), meta: { title: '投诉记录', icon: 'Warning', group: '教练管理', roles: ['admin', 'branch'] } },

      { path: 'student', name: 'student', component: () => import('@/views/student/StudentList.vue'), meta: { title: '学员档案', icon: 'User', group: '学员管理', roles: ['admin', 'branch'] } },

      { path: 'schedule', name: 'schedule', component: () => import('@/views/schedule/Schedule.vue'), meta: { title: '教练排班', icon: 'Calendar', group: '教练排班', roles: ['admin', 'branch', 'coach'] } },

      { path: 'vehicle', name: 'vehicle', component: () => import('@/views/vehicle/VehicleList.vue'), meta: { title: '车辆档案', icon: 'Van', group: '车辆管理', roles: ['admin', 'branch'] } },
      { path: 'vehicle/maintenance', name: 'vehicle-maintenance', component: () => import('@/views/vehicle/VehicleMaintenance.vue'), meta: { title: '保养记录', icon: 'Tools', group: '车辆管理', roles: ['admin', 'branch'] } },
      { path: 'vehicle/alert', name: 'vehicle-alert', component: () => import('@/views/vehicle/VehicleAlert.vue'), meta: { title: '到期提醒', icon: 'Bell', group: '车辆管理', roles: ['admin', 'branch'] } },

      { path: 'finance/payment', name: 'finance-payment', component: () => import('@/views/finance/Payment.vue'), meta: { title: '报名费收款', icon: 'Wallet', group: '财务管理', roles: ['admin', 'branch'] } },
      { path: 'finance/salary', name: 'finance-salary', component: () => import('@/views/finance/Salary.vue'), meta: { title: '教练工资核算', icon: 'Money', group: '财务管理', roles: ['admin', 'branch'] } },
      { path: 'finance/revenue', name: 'finance-revenue', component: () => import('@/views/finance/Revenue.vue'), meta: { title: '营收对比分析', icon: 'DataAnalysis', group: '财务管理', roles: ['admin'] } },

      { path: 'exam/branch', name: 'exam-branch', component: () => import('@/views/exam/ExamBranch.vue'), meta: { title: '校区合格率排名', icon: 'Trophy', group: '考试合格率', roles: ['admin', 'branch'] } },
      { path: 'exam/coach', name: 'exam-coach', component: () => import('@/views/exam/ExamCoach.vue'), meta: { title: '教练合格率排名', icon: 'Histogram', group: '考试合格率', roles: ['admin', 'branch'] } },

      { path: 'system/user', name: 'system-user', component: () => import('@/views/system/UserManage.vue'), meta: { title: '用户与角色', icon: 'UserFilled', group: '系统管理', roles: ['admin'] } },
      { path: 'system/log', name: 'system-log', component: () => import('@/views/system/OperationLog.vue'), meta: { title: '操作日志', icon: 'Document', group: '系统管理', roles: ['admin'] } },
    ],
  },
  { path: '/403', name: 'forbidden', component: () => import('@/views/error/Forbidden.vue'), meta: { hidden: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/error/NotFound.vue'), meta: { hidden: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

const ALL_ROLES: RoleKey[] = ['admin', 'branch', 'coach']

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  const isLogin = auth.isLoggedIn
  if (to.path === '/login') {
    return next(isLogin ? '/dashboard' : undefined)
  }
  if (!isLogin) {
    return next('/login')
  }
  const meta = to.meta as unknown as MenuMeta
  const allowed = meta.roles && meta.roles.length ? meta.roles : ALL_ROLES
  if (!allowed.includes(auth.roleKey as RoleKey)) {
    return next('/403')
  }
  next()
})

export function buildMenu(roleKey: RoleKey | '') {
  const groups: { group: string; items: { path: string; title: string; icon?: string }[] }[] = []
  const layoutRoute = routes[1]
  const children = layoutRoute.children || []
  children.forEach((child) => {
    const meta = (child.meta || {}) as unknown as MenuMeta
    if (meta.hidden) return
    const allowed = meta.roles && meta.roles.length ? meta.roles : ALL_ROLES
    if (roleKey && !allowed.includes(roleKey as RoleKey)) return
    if (!meta.group) return
    let g = groups.find((x) => x.group === meta.group)
    if (!g) { g = { group: meta.group, items: [] }; groups.push(g) }
    g.items.push({ path: '/' + child.path, title: meta.title, icon: meta.icon })
  })
  return groups
}

export default router
