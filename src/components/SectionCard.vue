<script setup lang="ts">
defineProps<{ title?: string; icon?: string; bodyClass?: string }>()
</script>

<template>
  <div class="section-card sc">
    <div v-if="title || $slots.actions" class="sc-head">
      <div class="sc-title">
        <el-icon v-if="icon" class="sc-icon"><component :is="icon" /></el-icon>
        <span>{{ title }}</span>
      </div>
      <div class="sc-actions"><slot name="actions" /></div>
    </div>
    <div class="sc-body" :class="bodyClass">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.sc { overflow: hidden; }
.sc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--brand-line);
}
.sc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-ink);
}
.sc-icon { color: var(--brand-primary); }
.sc-actions { display: flex; gap: 8px; }
.sc-body { padding: 18px 20px; }
</style>
