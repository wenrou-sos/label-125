import { dispatch } from '@/mock/server'
import { ElMessage } from 'element-plus'

async function call<T = any>(method: string, url: string, opts: { query?: any; body?: any } = {}): Promise<T> {
  const res = await dispatch(method, url, opts)
  if (res.code !== 0) {
    ElMessage.error(res.message)
    throw new Error(res.message)
  }
  return res.data as T
}

export const http = {
  get: <T = any>(url: string, query?: Record<string, any>) => call<T>('GET', url, { query }),
  post: <T = any>(url: string, body?: any) => call<T>('POST', url, { body }),
  put: <T = any>(url: string, body?: any) => call<T>('PUT', url, { body }),
  delete: <T = any>(url: string, query?: Record<string, any>) => call<T>('DELETE', url, { query }),
}
