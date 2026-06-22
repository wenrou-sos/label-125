import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notifyApi } from '@/api'
import type { Notify } from '@/types'
import { useAuthStore } from './auth'

export const useNotifyStore = defineStore('notify', () => {
  const list = ref<Notify[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => list.value.filter((n) => n.read === 0).length)

  async function load() {
    loading.value = true
    try {
      const auth = useAuthStore()
      const params: any = {}
      if (!auth.isHeadquarters && auth.branchId) params.branchId = auth.branchId
      list.value = await notifyApi.list(params)
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: number) {
    try {
      await notifyApi.markRead(id)
      const item = list.value.find((n) => n.id === id)
      if (item) {
        item.read = 1
        list.value = [...list.value]
      }
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await notifyApi.markAllRead()
      list.value.forEach((n) => { n.read = 1 })
      list.value = [...list.value]
    } catch {
      // ignore
    }
  }

  return { list, loading, unreadCount, load, markRead, markAllRead }
})
