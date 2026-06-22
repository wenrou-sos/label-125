<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="err-wrap">
    <div class="err-code font-num">403</div>
    <p class="err-title">无访问权限</p>
    <p class="err-desc">您当前的账号角色无权访问该页面，请联系管理员或返回。</p>
    <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
  </div>
</template>

<style scoped lang="scss">
.err-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; gap: 14px; padding: 40px; text-align: center; }
.err-code { font-size: 96px; font-weight: 800; color: var(--brand-primary); line-height: 1; }
.err-title { font-size: 22px; font-weight: 700; color: var(--brand-ink); margin: 0; }
.err-desc { color: var(--brand-mute); font-size: 14px; margin: 0 0 8px; }
</style>
