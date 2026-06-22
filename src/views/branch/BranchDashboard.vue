<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { branchApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import SectionCard from '@/components/SectionCard.vue'
import StatCard from '@/components/StatCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatPercent, rateColor } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const data = ref<any>(null)
const loading = ref(true)

const branchId = computed(() => Number(route.params.id) || auth.branchId || 1)
async function load() {
  loading.value = true
  try {
    data.value = await branchApi.dashboard(branchId.value)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const studentChart = computed(() => {
  const arr = data.value?.studentStatus || []
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', textStyle: { color: '#6B7A74' } },
    series: [{
      type: 'pie', radius: ['52%', '72%'], center: ['50%', '42%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3 },
      label: { show: true, formatter: '{b}\n{c}人', color: '#3A4A44' },
      data: arr.map((x: any, i: number) => ({ value: x.value, name: x.label, itemStyle: { color: ['#0F5C4E', '#D97706', '#2563EB', '#16A34A'][i] } })),
    }],
  }
})
const vehicleChart = computed(() => {
  const arr = data.value?.vehicleStatus || []
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle', textStyle: { color: '#6B7A74' } },
    series: [{
      type: 'pie', radius: '68%', center: ['50%', '42%'],
      label: { formatter: '{b}\n{c}辆', color: '#3A4A44' },
      data: arr.map((x: any, i: number) => ({ value: x.value, name: x.label, itemStyle: { color: ['#16A34A', '#DC2626', '#F59E0B'][i] } })),
    }],
  }
})
const trendChart = computed(() => {
  const arr = data.value?.trend || []
  return {
    grid: { left: 40, right: 20, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => v + '%' },
    xAxis: { type: 'category', data: arr.map((x: any) => x.month), axisLine: { lineStyle: { color: '#E3DDCF' } }, axisLabel: { color: '#6B7A74' } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    series: [{ type: 'line', data: arr.map((x: any) => x.rate), smooth: true, symbol: 'circle', symbolSize: 7, lineStyle: { color: '#0F5C4E', width: 3 }, itemStyle: { color: '#D97706', borderColor: '#fff', borderWidth: 2 }, areaStyle: { color: 'rgba(15,92,78,0.12)' } }],
  }
})
</script>

<template>
  <div class="page-wrapper">
    <div class="bd-head">
      <div>
        <el-button text :icon="'ArrowLeft'" @click="router.back()" style="padding:0 4px">返回</el-button>
        <h1 class="page-title" style="display:inline-block;margin-left:8px">{{ data?.branch?.name || '分校运营仪表盘' }}</h1>
      </div>
      <el-button :icon="'Refresh'" plain @click="load">刷新</el-button>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="12" :sm="6"><StatCard label="在册学员" :value="data?.studentCount ?? 0" icon="User" color="#0F5C4E" :loading="loading" /></el-col>
      <el-col :xs="12" :sm="6"><StatCard label="在职教练" :value="data?.coachCount ?? 0" icon="Avatar" color="#D97706" :loading="loading" /></el-col>
      <el-col :xs="12" :sm="6"><StatCard label="教练车辆" :value="data?.vehicleCount ?? 0" icon="Van" color="#2563EB" :loading="loading" /></el-col>
      <el-col :xs="12" :sm="6"><StatCard label="累计营收" :value="formatMoney(data?.revenue ?? 0)" icon="Money" color="#16A34A" :loading="loading" /></el-col>
    </el-row>

    <SectionCard class="rate-banner" bodyClass="banner-body">
      <div class="rate-main">
        <div class="rate-label">综合考试通过率</div>
        <div class="rate-value font-num" :style="{ color: rateColor(data?.rate ?? 0) }">{{ formatPercent(data?.rate ?? 0) }}</div>
      </div>
      <div class="rate-meta">
        <span>通过 <b class="num">{{ data?.passed ?? 0 }}</b> 人</span>
        <span>参考 <b class="num">{{ data?.total ?? 0 }}</b> 人次</span>
      </div>
    </SectionCard>

    <el-row :gutter="16" class="mt">
      <el-col :xs="24" :md="12"><SectionCard title="学员构成" icon="User"><BaseChart :option="studentChart" height="260px" :loading="loading" /></SectionCard></el-col>
      <el-col :xs="24" :md="12"><SectionCard title="车辆状态分布" icon="Van"><BaseChart :option="vehicleChart" height="260px" :loading="loading" /></SectionCard></el-col>
    </el-row>
    <el-row :gutter="16" class="mt">
      <el-col :span="24"><SectionCard title="通过率趋势（近 6 个月）" icon="TrendCharts"><BaseChart :option="trendChart" height="280px" :loading="loading" /></SectionCard></el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.bd-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.kpi-row :deep(.el-col) { margin-bottom: 16px; }
.rate-banner { background: linear-gradient(135deg, #0F5C4E, #0a3a31); border: none; }
:deep(.banner-body) { padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; color: #f6f4ee; }
.rate-label { font-size: 14px; opacity: 0.85; }
.rate-value { font-size: 40px; font-weight: 700; line-height: 1; margin-top: 6px; }
.rate-meta { display: flex; gap: 28px; font-size: 14px; opacity: 0.9; }
.rate-meta .num { font-family: 'Bahnschrift', sans-serif; font-size: 18px; color: #f7c873; }
.mt :deep(.el-col) { margin-bottom: 16px; }
</style>
