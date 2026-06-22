<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { buildMenu } from '@/router'
import { ElMessageBox } from 'element-plus'
import { ROLE_MAP } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const collapsed = ref(false)
const drawerVisible = ref(false)
const isMobile = ref(window.innerWidth < 992)
window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 992 })

const menuGroups = computed(() => buildMenu(auth.roleKey))
const activePath = computed(() => route.path)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((m) => m.meta && (m.meta as any).title)
  return [{ title: '首页', path: '/dashboard' }, ...matched.map((m) => ({ title: (m.meta as any).title, path: m.path }))]
    .filter((v, i, a) => a.findIndex((x) => x.title === v.title) === i)
})

function go(path: string) {
  router.push(path)
  drawerVisible.value = false
}

async function logout() {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
  auth.logout()
  router.push('/login')
}

const sidebarWidth = computed(() => (collapsed.value ? '64px' : '232px'))
</script>

<template>
  <div class="app-shell">
    <!-- 桌面侧边栏 -->
    <aside v-if="!isMobile" class="sidebar" :class="{ collapsed }" :style="{ width: sidebarWidth }">
      <div class="brand" @click="go('/dashboard')">
        <div class="brand-logo">
          <svg viewBox="0 0 64 64" width="30" height="30"><circle cx="32" cy="32" r="17" fill="none" stroke="#F6F4EE" stroke-width="4"/><circle cx="32" cy="32" r="5.5" fill="#D97706"/><path d="M32 15v9M32 40v9M15 32h9M40 32h9" stroke="#F6F4EE" stroke-width="4" stroke-linecap="round"/></svg>
        </div>
        <transition name="fade"><span v-if="!collapsed" class="brand-name">驾校云管平台</span></transition>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu :default-active="activePath" :collapse="collapsed" :collapse-transition="false" background-color="transparent" text-color="#cdd9d4" active-text-color="#F6F4EE" @select="go">
          <template v-for="g in menuGroups" :key="g.group">
            <el-sub-menu v-if="g.items.length > 1" :index="g.group">
              <template #title>
                <el-icon v-if="g.items[0].icon"><component :is="g.items[0].icon" /></el-icon>
                <span>{{ g.group }}</span>
              </template>
              <el-menu-item v-for="it in g.items" :key="it.path" :index="it.path">
                <span>{{ it.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="g.items[0].path">
              <el-icon v-if="g.items[0].icon"><component :is="g.items[0].icon" /></el-icon>
              <template #title><span>{{ g.items[0].title }}</span></template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
      <div class="sidebar-foot" v-if="!collapsed">
        <div class="role-badge">{{ ROLE_MAP[auth.roleKey] || '用户' }}</div>
        <div class="foot-tip">一体化管理平台 v1.0</div>
      </div>
    </aside>

    <!-- 移动端抽屉 -->
    <el-drawer v-model="drawerVisible" direction="ltr" size="240px" :with-header="false" v-if="isMobile">
      <div class="sidebar drawer">
        <div class="brand" @click="go('/dashboard')">
          <div class="brand-logo"><svg viewBox="0 0 64 64" width="28" height="28"><circle cx="32" cy="32" r="17" fill="none" stroke="#F6F4EE" stroke-width="4"/><circle cx="32" cy="32" r="5.5" fill="#D97706"/><path d="M32 15v9M32 40v9M15 32h9M40 32h9" stroke="#F6F4EE" stroke-width="4" stroke-linecap="round"/></svg></div>
          <span class="brand-name">驾校云管平台</span>
        </div>
        <el-scrollbar class="menu-scroll">
          <el-menu :default-active="activePath" background-color="transparent" text-color="#cdd9d4" active-text-color="#F6F4EE" @select="go">
            <template v-for="g in menuGroups" :key="g.group">
              <el-sub-menu v-if="g.items.length > 1" :index="g.group">
                <template #title><el-icon v-if="g.items[0].icon"><component :is="g.items[0].icon" /></el-icon><span>{{ g.group }}</span></template>
                <el-menu-item v-for="it in g.items" :key="it.path" :index="it.path"><span>{{ it.title }}</span></el-menu-item>
              </el-sub-menu>
              <el-menu-item v-else :index="g.items[0].path"><el-icon v-if="g.items[0].icon"><component :is="g.items[0].icon" /></el-icon><template #title><span>{{ g.items[0].title }}</span></template></el-menu-item>
            </template>
          </el-menu>
        </el-scrollbar>
      </div>
    </el-drawer>

    <div class="main-area" :style="{ marginLeft: isMobile ? '0' : sidebarWidth }">
      <header class="topbar">
        <div class="topbar-left">
          <el-button v-if="isMobile" link @click="drawerVisible = true"><el-icon size="22"><Expand /></el-icon></el-button>
          <el-button v-else link @click="collapsed = !collapsed"><el-icon size="20"><component :is="collapsed ? 'Expand' : 'Fold'" /></el-icon></el-button>
          <el-breadcrumb separator="/" class="crumb">
            <el-breadcrumb-item v-for="c in breadcrumbs" :key="c.path" :to="c.path">{{ c.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar-right">
          <el-badge :value="auth.isHeadquarters ? 0 : 0" :hidden="true" class="topbar-icon-btn">
            <el-button link><el-icon size="18"><Bell /></el-icon></el-button>
          </el-badge>
          <el-dropdown @command="(c) => c === 'logout' && logout()">
            <div class="user-chip">
              <div class="user-avatar" :style="{ background: auth.user?.roleKey === 'admin' ? '#0F5C4E' : auth.user?.roleKey === 'branch' ? '#D97706' : '#2563EB' }">
                {{ auth.user?.realName?.charAt(0) || 'U' }}
              </div>
              <div class="user-meta">
                <div class="user-name">{{ auth.user?.realName }}</div>
                <div class="user-role">{{ ROLE_MAP[auth.roleKey] }}</div>
              </div>
              <el-icon><CaretBottom /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.user?.username }}</el-dropdown-item>
                <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon> 退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-shell { min-height: 100vh; }
.sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(180deg, #0c493e 0%, #0a3a31 100%);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  transition: width 0.2s ease;
  box-shadow: 2px 0 12px rgba(0,0,0,0.08);
}
.sidebar.drawer { position: static; height: 100%; }
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
}
.brand-logo { flex-shrink: 0; }
.brand-name {
  color: #f6f4ee;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.menu-scroll { flex: 1; padding: 8px 10px; }
.sidebar-foot { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.08); }
.role-badge {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(217,119,6,0.18);
  color: #f7c873;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.foot-tip { color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 8px; }

:deep(.el-menu) { border: none; }
:deep(.el-menu-item), :deep(.el-sub-menu__title) { border-radius: 8px; margin: 2px 0; height: 44px; line-height: 44px; }
:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(217,119,6,0.92), rgba(217,119,6,0.7)) !important;
  color: #fff !important;
  font-weight: 600;
}
:deep(.el-sub-menu .el-menu-item) { padding-left: 52px !important; }

.main-area { min-height: 100vh; transition: margin-left 0.2s ease; display: flex; flex-direction: column; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--brand-line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.topbar-left { display: flex; align-items: center; gap: 10px; }
.crumb { font-size: 13px; }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.user-chip { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 6px; border-radius: 20px; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
}
.user-meta { line-height: 1.2; }
.user-name { font-size: 13px; font-weight: 600; color: var(--brand-ink); }
.user-role { font-size: 11px; color: var(--brand-mute); }
.content { flex: 1; }
@media (max-width: 992px) {
  .topbar { padding: 0 12px; }
  .user-meta { display: none; }
}
</style>
