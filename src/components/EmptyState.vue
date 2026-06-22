<script setup lang="ts">
defineProps<{ text?: string; icon?: string }>()
</script>

<template>
  <div class="empty-wrap">
    <el-icon :size="40" class="empty-icon"><component :is="icon || 'Box'" /></el-icon>
    <p class="empty-text">{{ text || '暂无数据' }}</p>
  </div>
</template>

<style scoped lang="scss">
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
}
.empty-icon { color: var(--brand-mute); opacity: 0.4; }
.empty-text { color: var(--brand-mute); font-size: 14px; }
</style>
