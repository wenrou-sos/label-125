import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginResult } from '@/api'
import type { RoleKey } from '@/types'

const STORAGE_KEY = 'dsmp_auth'

interface AuthState {
  token: string
  user: LoginResult['user'] | null
  role: LoginResult['role'] | null
}

function load(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const saved = load()
  const token = ref<string>(saved?.token || '')
  const user = ref<LoginResult['user'] | null>(saved?.user || null)
  const role = ref<LoginResult['role'] | null>(saved?.role || null)

  const isLoggedIn = computed(() => !!token.value)
  const roleKey = computed<RoleKey | ''>(() => role.value?.key || '')
  const branchId = computed<number | null>(() => user.value?.branchId ?? null)
  const permissions = computed<string[]>(() => role.value?.permissions || [])
  const isCoach = computed(() => roleKey.value === 'coach')
  const isHeadquarters = computed(() => roleKey.value === 'admin')

  function hasPermission(code: string): boolean {
    if (!permissions.value.length) return false
    if (permissions.value.includes('*')) return true
    return permissions.value.some((p) => code === p || code.startsWith(p + ':') || p.startsWith(code + ':'))
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    token.value = res.token
    user.value = res.user
    role.value = res.role
    persist()
    return res
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value, role: role.value }))
  }

  function logout() {
    token.value = ''
    user.value = null
    role.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, user, role, isLoggedIn, roleKey, branchId, permissions, isCoach, isHeadquarters, hasPermission, login, logout }
})
