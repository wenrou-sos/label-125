<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi } from '@/api'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatMoneyShort } from '@/utils/format'
import { ElMessage } from 'element-plus'

const raw = ref<any[]>([])
const loading = ref(true)
const months = ref(6)
const monthOpts = [
  { label: '近 3 个月', value: 3 },
  { label: '近 6 个月', value: 6 },
  { label: '近 12 个月', value: 12 },
]

async function load() {
  loading.value = true
  try {
    raw.value = await financeApi.revenue(months.value)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const palette = ['#0F5C4E', '#D97706', '#2563EB', '#16A34A', '#9333EA', '#DC2626', '#0891B2', '#CA8A04', '#DB2777', '#4B5563']
const branches = computed(() => (raw.value[0]?.branches || []).map((b: any) => ({ branchId: b.branchId, name: b.name })))
const monthList = computed(() => raw.value.map((x) => x.month))

function branchRevenue(branchId: number) {
  return raw.value.reduce((s, x) => s + (x.branches.find((b: any) => b.branchId === branchId)?.revenue || 0), 0)
}

const compareChart = computed(() => {
  const data = branches.value.map((b, i) => ({ value: branchRevenue(b.branchId), itemStyle: { color: palette[i % palette.length], borderRadius: [6, 6, 0, 0] } }))
  return {
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: any) => formatMoney(v) },
    xAxis: { type: 'category', data: branches.value.map((b) => b.name), axisLine: { lineStyle: { color: '#E3DDCF' } }, axisLabel: { color: '#6B7A74', interval: 0, rotate: branches.value.length > 6 ? 30 : 0 } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatMoneyShort(v), color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    series: [{ type: 'bar', data, barWidth: '55%', label: { show: true, position: 'top', formatter: (p: any) => formatMoneyShort(p.value), color: '#3A4A44', fontWeight: 600 } }],
  }
})
const trendChart = computed(() => {
  return {
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => formatMoney(v) },
    legend: { top: 0, icon: 'circle', textStyle: { color: '#6B7A74' } },
    xAxis: { type: 'category', data: monthList.value, axisLine: { lineStyle: { color: '#E3DDCF' } }, axisLabel: { color: '#6B7A74' } },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => formatMoneyShort(v), color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    series: branches.value.slice(0, 5).map((b, i) => ({
      name: b.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { width: 2 }, itemStyle: { color: palette[i] },
      data: raw.value.map((x) => x.branches.find((bb: any) => bb.branchId === b.branchId)?.revenue || 0),
    })),
  }
})

const tableData = computed(() => branches.value.map((b) => {
  const payment = branchRevenue(b.branchId)
  return { branch: b.name, payment, expense: 0, profit: payment }
}))
const grandTotal = computed(() => tableData.value.reduce((s, x) => s + x.payment, 0))

function exportData() {
  const headers = ['分校', '营收', '支出', '利润']
  const rows = tableData.value.map((r) => [r.branch, r.payment, r.expense, r.profit])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '分校营收对比.csv'; a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出 CSV')
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="分校营收对比" subtitle="分校月度营收对比分析，支持图表化展示与数据导出">
      <template #actions>
        <el-select v-model="months" style="width: 140px" @change="load">
          <el-option v-for="o in monthOpts" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-button :icon="'Download'" plain @click="exportData">导出 CSV</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12"><SectionCard title="分校营收对比" icon="DataAnalysis"><BaseChart :option="compareChart" height="320px" :loading="loading" /></SectionCard></el-col>
      <el-col :xs="24" :lg="12"><SectionCard title="营收趋势（前5分校）" icon="TrendCharts"><BaseChart :option="trendChart" height="320px" :loading="loading" /></SectionCard></el-col>
    </el-row>

    <SectionCard title="营收明细" icon="List" bodyClass="no-padding">
      <el-table :data="tableData" v-loading="loading" style="width: 100%" show-summary :summary-method="() => [{ value: '合计' }, { value: formatMoney(grandTotal) }, { value: formatMoney(0) }, { value: formatMoney(grandTotal) }]">
        <el-table-column label="分校" prop="branch" min-width="140" />
        <el-table-column label="营收" width="180" align="right"><template #default="{ row }"><span class="num">{{ formatMoney(row.payment) }}</span></template></el-table-column>
        <el-table-column label="支出" width="180" align="right"><template #default="{ row }"><span class="num">{{ formatMoney(row.expense) }}</span></template></el-table-column>
        <el-table-column label="利润" width="180" align="right"><template #default="{ row }"><span class="num strong" style="color:#16A34A">{{ formatMoney(row.profit) }}</span></template></el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !tableData.length" text="暂无营收数据" />
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.chart-row :deep(.el-col) { margin-bottom: 16px; }
.num { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
.strong { font-weight: 700; }
:deep(.no-padding) { padding: 0 !important; }
</style>
