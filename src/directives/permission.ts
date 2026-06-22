import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const code = binding.value as string
    if (!code) return
    const auth = useAuthStore()
    if (!auth.hasPermission(code)) {
      el.parentNode?.removeChild(el)
    }
  },
}
