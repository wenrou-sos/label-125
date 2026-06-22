<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { coachApi, branchApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatPercent, rateColor } from '@/utils/format'

const auth = useAuthStore()
const list = ref<any[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const month = ref(new Date().toISOString().slice(0, 7))
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
const sortBy = ref<'passRate' | 'studentCount' | 'avgScore'>('passRate')

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const params: any = { month: month.value, sortBy: sortBy.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    list.value = await coachApi.ranking(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const sortOptions = [
  { label: '按通过率', value: 'passRate' },
  { label: '按带教学员数', value: 'studentCount' },
  { label: '按评价分', value: 'avgScore' },
]

const chart = computed(() => {
  const arr = list.value.slice(0, 12).reverse()
  return {
    grid: { left: 90, right: 36, top: 8, bottom: 8 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#6B7A74' }, splitLine: { lineStyle: { color: '#ECE7D9' } } },
    yAxis: { type: 'category', data: arr.map((x) => x.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3A4A44' } },
    series: [{ type: 'bar', data: arr.map((x) => x.passRate), barWidth: 14, itemStyle: { color: '#0F5C4E', borderRadius: [0, 7, 7, 0] }, label: { show: true, position: 'right', formatter: (p: any) => p.value + '%', fontWeight: 600, color: '#0F5C4E' } }],
  }
})

function medal(rank: number) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练月度通过率排行" subtitle="按月度统计教练学员通过率，支持多维度排序">
      <template #actions>
        <el-date-picker v-model="month" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width: 150px" @change="load" />
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 150px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-select v-model="sortBy" style="width: 140px" @change="load">
          <el-option v-for="o in sortOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </template>
    </PageHeader>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="13">
        <SectionCard title="通过率排行图" icon="Medal">
          <BaseChart :option="chart" height="440px" :loading="loading" />
        </SectionCard>
      </el-col>
      <el-col :xs="24" :lg="11">
        <SectionCard title="排行明细" icon="List" bodyClass="no-padding">
          <el-table :data="list" v-loading="loading" style="width: 100%" :max-height="440">
            <el-table-column label="名次" width="64" align="center">
              <template #default="{ row }"><span class="rank-no">{{ medal(row.rank) || row.rank }}</span></template>
            </el-table-column>
            <el-table-column label="教练" min-width="110">
              <template #default="{ row }">
                <div class="coach-cell"><span class="name">{{ row.name }}</span><span class="cert">{{ row.certLevel }}</span></div>
              </template>
            </el-table-column>
            <el-table-column label="分校" prop="branchName" width="100" />
            <el-table-column label="通过率" width="92" align="center">
              <template #default="{ row }"><span class="num" :style="{ color: rateColor(row.passRate) }">{{ formatPercent(row.passRate) }}</span></template>
            </el-table-column>
            <el-table-column label="通过/总" width="84" align="center">
              <template #default="{ row }"><span class="num">{{ row.passed }}</span><span class="mute">/{{ row.total }}</span></template>
            </el-table-column>
            <el-table-column label="评分" width="64" align="center">
              <template #default="{ row }"><span class="num">{{ row.avgScore || '-' }}</span></template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!loading && !list.length" text="当月暂无数据" />
        </SectionCard>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.num { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
.mute { color: var(--brand-mute); }
.coach-cell { display: flex; flex-direction: column; }
.coach-cell .name { font-weight: 600; }
.coach-cell .cert { font-size: 11px; color: var(--brand-mute); }
.rank-no { font-weight: 700; font-family: 'Bahnschrift', sans-serif; color: var(--brand-primary); }
:deep(.no-padding) { padding: 0 !important; }
</style>
