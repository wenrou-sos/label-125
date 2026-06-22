<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { examApi } from '@/api'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatPercent, rateColor, rankColor } from '@/utils/format'

const list = ref<any[]>([])
const loading = ref(true)
const subject = ref<'科目二' | '科目三'>('科目二')
const batch = ref('')
const dateRange = ref<[string, string] | null>(null)

async function load() {
  loading.value = true
  try {
    const params: any = { subject: subject.value }
    if (batch.value) params.batch = batch.value
    if (dateRange.value) { params.start = dateRange.value[0]; params.end = dateRange.value[1] }
    list.value = await examApi.branchRanking(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const chart = computed(() => {
  const arr = list.value.slice().reverse()
  return {
    grid: { left: 100, right: 48, top: 8, bottom: 8 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => `${p[0].name}<br/>一次性通过率 ${p[0].value}%` },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    yAxis: { type: 'category', data: arr.map((x) => x.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3A4A44' } },
    series: [{ type: 'bar', data: arr.map((x) => x.rate), barWidth: 14, itemStyle: { color: (p: any) => ['#D97706', '#9CA3AF', '#B45309', '#0F5C4E', '#0F5C4E'][p.dataIndex] || '#0F5C4E', borderRadius: [0, 7, 7, 0] }, label: { show: true, position: 'right', formatter: (p: any) => p.value + '%', fontWeight: 600, color: '#0F5C4E' } }],
  }
})
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="各校区考试通过率排名" subtitle="科二 / 科三一次性通过率排名，支持按科目、批次、时间段筛选">
      <template #actions>
        <el-radio-group v-model="subject" @change="load">
          <el-radio-button value="科目二">科目二</el-radio-button>
          <el-radio-button value="科目三">科目三</el-radio-button>
        </el-radio-group>
        <el-input v-model="batch" placeholder="考试批次" clearable style="width: 130px" @change="load" />
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始" end-placeholder="结束" style="width: 240px" @change="load" />
        <el-button type="primary" :icon="'Search'" @click="load">查询</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14"><SectionCard title="通过率排名" icon="TrendCharts"><BaseChart :option="chart" height="440px" :loading="loading" /></SectionCard></el-col>
      <el-col :xs="24" :lg="10">
        <SectionCard title="排名明细" icon="List" bodyClass="no-padding">
          <el-table :data="list" v-loading="loading" style="width: 100%" :max-height="440">
            <el-table-column label="排名" width="64" align="center">
              <template #default="{ row }"><span class="rank-badge" :style="{ background: rankColor(row.rank) + '20', color: rankColor(row.rank) }">{{ row.rank }}</span></template>
            </el-table-column>
            <el-table-column label="分校" prop="name" min-width="120" />
            <el-table-column label="一次性通过率" width="120" align="center">
              <template #default="{ row }"><span class="num" :style="{ color: rateColor(row.rate) }">{{ formatPercent(row.rate) }}</span></template>
            </el-table-column>
            <el-table-column label="通过/总数" width="110" align="center">
              <template #default="{ row }"><span class="num">{{ row.passed }}</span><span class="mute">/{{ row.total }}</span></template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!loading && !list.length" text="暂无数据" />
        </SectionCard>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.num { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
.mute { color: var(--brand-mute); }
.rank-badge { display: inline-flex; width: 26px; height: 26px; border-radius: 50%; align-items: center; justify-content: center; font-weight: 700; font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
