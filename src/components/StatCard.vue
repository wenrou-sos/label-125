<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon?: string
  color?: string
  sub?: string
  trend?: number
  loading?: boolean
}>()
</script>

<template>
  <div class="stat-card section-card hover-rise" :class="{ loading }">
    <div class="stat-icon" :style="{ background: (color || '#0F5C4E') + '14', color: color || '#0F5C4E' }">
      <el-icon :size="22"><component :is="icon || 'DataLine'" /></el-icon>
    </div>
    <div class="stat-body">
      <div class="stat-label">{{ label }}</div>
      <div class="kpi-value stat-value" :style="{ color: color || 'var(--brand-ink)' }">
        <span v-if="loading" class="skeleton">--</span>
        <template v-else>{{ value }}</template>
      </div>
      <div v-if="sub || trend !== undefined" class="stat-sub">
        <span v-if="trend !== undefined" class="trend" :class="trend >= 0 ? 'up' : 'down'">
          <el-icon><component :is="trend >= 0 ? 'CaretTop' : 'CaretBottom'" /></el-icon>
          {{ Math.abs(trend) }}%
        </span>
        <span v-if="sub" class="sub-text">{{ sub }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stat-card {
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  align-items: center;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-label {
  font-size: 13px;
  color: var(--brand-mute);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 28px;
}
.stat-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--brand-mute);
}
.trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
}
.trend.up { color: #16a34a; }
.trend.down { color: #dc2626; }
.skeleton {
  display: inline-block;
  width: 60px;
  height: 28px;
  background: linear-gradient(90deg, #efebe1 25%, #e3ddcf 37%, #efebe1 63%);
  background-size: 400% 100%;
  animation: sk 1.4s ease infinite;
  border-radius: 4px;
}
@keyframes sk {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
.loading .stat-icon { opacity: 0.4; }
</style>
