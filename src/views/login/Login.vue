<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: 'admin', password: '123456' })
const loading = ref(false)
const formRef = ref<FormInstance>()
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const demoAccounts = [
  { label: '总校管理员', username: 'admin', role: 'admin', color: '#0F5C4E' },
  { label: '分校管理员', username: 'branch1', role: 'branch', color: '#D97706' },
  { label: '教练', username: 'coach1', role: 'coach', color: '#2563EB' },
]

function pickDemo(acc: { username: string }) {
  form.username = acc.username
  form.password = '123456'
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await auth.login(form.username, form.password)
      ElMessage.success('登录成功')
      router.push('/dashboard')
    } catch {
      // 错误信息已在拦截器提示
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <div class="login-wrap">
    <!-- 左侧品牌视觉 -->
    <div class="brand-panel">
      <div class="brand-bg">
        <svg class="road-deco" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#0F5C4E"/><stop offset="1" stop-color="#0a3a31"/>
            </linearGradient>
          </defs>
          <rect width="400" height="600" fill="url(#rg)"/>
          <path d="M-50 420 Q 200 320 460 460" stroke="rgba(255,255,255,0.08)" stroke-width="80" fill="none"/>
          <path d="M-50 480 Q 200 380 460 520" stroke="rgba(217,119,6,0.18)" stroke-width="40" fill="none"/>
          <path d="M180 0 L180 600" stroke="rgba(255,255,255,0.06)" stroke-width="2" stroke-dasharray="14 18"/>
          <circle cx="60" cy="120" r="80" fill="rgba(255,255,255,0.04)"/>
          <circle cx="340" cy="520" r="120" fill="rgba(217,119,6,0.08)"/>
        </svg>
      </div>
      <div class="brand-content">
        <div class="brand-logo-row">
          <svg viewBox="0 0 64 64" width="44" height="44"><circle cx="32" cy="32" r="17" fill="none" stroke="#F6F4EE" stroke-width="4"/><circle cx="32" cy="32" r="5.5" fill="#D97706"/><path d="M32 15v9M32 40v9M15 32h9M40 32h9" stroke="#F6F4EE" stroke-width="4" stroke-linecap="round"/></svg>
          <span class="brand-title">驾校云管平台</span>
        </div>
        <h1 class="brand-headline">总校与分校<br/>一体化运营管理</h1>
        <p class="brand-desc">覆盖分校运营、教练资源、车辆资产、财务收支与考试质量五大维度，数据驱动决策，助力驾校集团高效管控。</p>
        <div class="brand-stats">
          <div class="bs-item"><div class="bs-num font-num">10+</div><div class="bs-label">分校并发</div></div>
          <div class="bs-item"><div class="bs-num font-num">6</div><div class="bs-label">核心模块</div></div>
          <div class="bs-item"><div class="bs-num font-num">3s</div><div class="bs-label">极速加载</div></div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="form-panel">
      <div class="form-card">
        <div class="form-head">
          <h2>欢迎登录</h2>
          <p>请使用账号密码登录系统</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" label-position="top" @keyup.enter="submit">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="'Lock'" show-password />
          </el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="submit">登 录</el-button>
        </el-form>

        <div class="demo-area">
          <div class="demo-title">演示账号（点击快速填充）</div>
          <div class="demo-chips">
            <div v-for="acc in demoAccounts" :key="acc.username" class="demo-chip" @click="pickDemo(acc)" :style="{ borderColor: acc.color }">
              <span class="dot" :style="{ background: acc.color }"></span>
              <span class="chip-label">{{ acc.label }}</span>
              <span class="chip-user">{{ acc.username }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-wrap {
  display: flex;
  min-height: 100vh;
}
.brand-panel {
  position: relative;
  width: 46%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.brand-bg { position: absolute; inset: 0; }
.road-deco { width: 100%; height: 100%; }
.brand-content { position: relative; z-index: 2; padding: 60px; color: #f6f4ee; max-width: 560px; }
.brand-logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 56px; }
.brand-title { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
.brand-headline { font-size: 42px; line-height: 1.25; font-weight: 800; margin: 0 0 20px; letter-spacing: 1px; }
.brand-desc { font-size: 14px; line-height: 1.8; color: rgba(246,244,238,0.75); margin: 0 0 48px; }
.brand-stats { display: flex; gap: 40px; }
.bs-num { font-size: 30px; font-weight: 700; color: #f7c873; }
.bs-label { font-size: 12px; color: rgba(246,244,238,0.6); margin-top: 4px; }

.form-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; background: var(--brand-canvas); }
.form-card { width: 100%; max-width: 400px; }
.form-head { margin-bottom: 28px; }
.form-head h2 { font-size: 26px; font-weight: 700; color: var(--brand-ink); margin: 0 0 6px; }
.form-head p { color: var(--brand-mute); font-size: 13px; margin: 0; }
.login-btn { width: 100%; height: 46px; margin-top: 8px; font-size: 16px; font-weight: 600; letter-spacing: 4px; }
.demo-area { margin-top: 28px; padding-top: 20px; border-top: 1px dashed var(--brand-line); }
.demo-title { font-size: 12px; color: var(--brand-mute); margin-bottom: 12px; }
.demo-chips { display: flex; flex-direction: column; gap: 8px; }
.demo-chip {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border: 1px solid; border-radius: 8px; cursor: pointer; transition: background 0.15s;
  font-size: 13px;
}
.demo-chip:hover { background: #fff; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.chip-label { font-weight: 600; color: var(--brand-ink); }
.chip-user { margin-left: auto; color: var(--brand-mute); font-family: 'Bahnschrift', sans-serif; }

@media (max-width: 900px) {
  .brand-panel { display: none; }
  .form-panel { padding: 24px; }
  .brand-headline { font-size: 32px; }
}
</style>
