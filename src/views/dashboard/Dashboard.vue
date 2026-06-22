<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi, type DashboardData } from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/StatCard.vue'
import SectionCard from '@/components/SectionCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatMoneyShort, daysLabel, urgencyType, rateColor } from '@/utils/format'
import { VEHICLE_STATUS_MAP } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const data = ref<DashboardData | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    data.value = await dashboardApi.get(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const rankingChart = computed(() => {
  const list = (data.value?.branchRanking || []).slice().reverse()
  return {
    grid: { left: 96, right: 40, top: 8, bottom: 8 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    yAxis: { type: 'category', data: list.map((x) => x.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3A4A44' } },
    series: [{
      type: 'bar', data: list.map((x) => x.rate), barWidth: 14,
      itemStyle: { color: '#0F5C4E', borderRadius: [0, 7, 7, 0] },
      label: { show: true, position: 'right', formatter: (p: any) => p.value + '%', color: '#0F5C4E', fontWeight: 600 },
    }],
  }
})

const revenueChart = computed(() => {
  const trend = data.value?.revenueTrend || []
  return {
    grid: { left: 56, right: 20, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => formatMoney(v) },
    xAxis: { type: 'category', data: trend.map((x) => x.month), boundaryGap: false, axisLine: { lineStyle: { color: '#E3DDCF' } }, axisLabel: { color: '#6B7A74' } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => v >= 10000 ? (v / 10000) + '万' : v, color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    series: [{
      type: 'line', data: trend.map((x) => x.revenue), smooth: true, symbol: 'circle', symbolSize: 7,
      lineStyle: { color: '#0F5C4E', width: 3 }, itemStyle: { color: '#D97706', borderColor: '#fff', borderWidth: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(15,92,78,0.25)' }, { offset: 1, color: 'rgba(15,92,78,0.02)' }] } },
    }],
  }
})

const alerts = computed(() => data.value?.vehicleAlerts || [])
</script>

<template>
  <div class="page-wrapper">
    <div class="dash-head">
      <div>
        <h1 class="page-title">{{ auth.isCoach ? '我的工作台' : '工作台总览' }}</h1>
        <p class="page-subtitle">{{ auth.isHeadquarters ? '全集团运营数据实时概览' : '本分校运营数据实时概览' }}</p>
      </div>
      <el-button :icon="'Refresh'" plain @click="load">刷新</el-button>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard label="在册学员" :value="data?.kpis.studentCount ?? 0" icon="User" color="#0F5C4E" :loading="loading" sub="总人数" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard label="在职教练" :value="data?.kpis.coachCount ?? 0" icon="Avatar" color="#D97706" :loading="loading" sub="在岗人数" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard label="教练车辆" :value="data?.kpis.vehicleCount ?? 0" icon="Van" color="#2563EB" :loading="loading" sub="教学车辆" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard label="本月营收" :value="formatMoneyShort(data?.kpis.monthlyRevenue ?? 0)" icon="Money" color="#16A34A" :loading="loading" :sub="`待确认收款 ${data?.kpis.pendingPayments ?? 0} 笔`" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-4">
      <el-col :xs="24" :lg="15">
        <SectionCard title="分校考试通过率排行" icon="TrendCharts">
          <template #actions>
            <el-button text type="primary" @click="router.push('/branch/ranking')">查看全部</el-button>
          </template>
          <BaseChart :option="rankingChart" height="320px" :loading="loading" />
        </SectionCard>
      </el-col>
      <el-col :xs="24" :lg="9">
        <SectionCard title="车辆到期预警" icon="Bell">
          <template #actions>
            <el-button text type="primary" @click="router.push('/vehicle/alert')">查看全部</el-button>
          </template>
          <div v-if="alerts.length" class="alert-list">
            <div v-for="v in alerts.slice(0, 6)" :key="v.id" class="alert-item">
              <div class="alert-left">
                <span class="status-dot" :class="v.status"></span>
                <div>
                  <div class="alert-plate">{{ v.plate }}</div>
                  <div class="alert-branch">{{ v.branchName }} · {{ v.brand }} {{ v.model }}</div>
                </div>
              </div>
              <div class="alert-tags">
                <el-tag v-if="v.inspectionDays <= 30" :type="urgencyType(v.inspectionDays)" size="small" effect="light">年检 {{ daysLabel(v.inspectionDays) }}</el-tag>
                <el-tag v-if="v.insuranceDays <= 30" :type="urgencyType(v.insuranceDays)" size="small" effect="light">保险 {{ daysLabel(v.insuranceDays) }}</el-tag>
              </div>
            </div>
          </div>
          <EmptyState v-else text="暂无到期预警" icon="CircleCheck" />
        </SectionCard>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-4">
      <el-col :span="24">
        <SectionCard title="营收趋势（近 6 个月）" icon="DataAnalysis">
          <BaseChart :option="revenueChart" height="300px" :loading="loading" />
        </SectionCard>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.dash-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.kpi-row :deep(.el-col) { margin-bottom: 16px; }
.mt-4 { margin-top: 0; }
.mt-4 :deep(.el-col) { margin-bottom: 16px; }
.alert-list { display: flex; flex-direction: column; }
.alert-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 4px; border-bottom: 1px dashed var(--brand-line); gap: 8px;
}
.alert-item:last-child { border-bottom: none; }
.alert-left { display: flex; align-items: center; gap: 10px; }
.alert-plate { font-weight: 700; font-size: 14px; color: var(--brand-ink); font-family: 'Bahnschrift', sans-serif; }
.alert-branch { font-size: 12px; color: var(--brand-mute); margin-top: 2px; }
.alert-tags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
</style>
