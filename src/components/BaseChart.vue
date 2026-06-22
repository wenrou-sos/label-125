<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ option: any; height?: string; loading?: boolean }>()
const heightStyle = computed(() => ({ height: props.height || '300px' }))
</script>

<template>
  <div class="chart-box" :style="heightStyle" v-loading="loading" element-loading-background="rgba(255,255,255,0.6)">
    <v-chart :option="option" autoresize />
  </div>
</template>

<style scoped lang="scss">
.chart-box { width: 100%; }
.chart-box :deep(.el-loading-mask) { border-radius: 12px; }
</style>
