<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi, branchApi, type SalaryRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatPercent, rateColor } from '@/utils/format'
import { ElMessage, ElMessageBox } from 'element-plus'

const auth = useAuthStore()
const list = ref<SalaryRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const month = ref(new Date().toISOString().slice(0, 7))
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))

const detailVisible = ref(false)
const current = ref<SalaryRow | null>(null)

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const params: any = { month: month.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    list.value = await financeApi.salary(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const total = computed(() => list.value.reduce((s, x) => s + x.total, 0))
const paidCount = computed(() => list.value.filter((x) => x.status === 'confirmed').length)
function scheduleCountOf(row: SalaryRow) { return Math.round(row.commission / 35) }

async function calculate() {
  try {
    await ElMessageBox.confirm(`将重新核算 ${month.value} 全部教练工资（底薪 + 通过率奖金 + 课时提成），是否继续？`, '工资核算', { type: 'warning' })
    const r = await financeApi.calculate(month.value)
    ElMessage.success(`已核算 ${r.count} 名教练工资`)
    load()
  } catch { /* cancel */ }
}

function openDetail(row: SalaryRow) { current.value = row; detailVisible.value = true }

function summary() {
  const arr = Array(10).fill(null)
  arr[0] = { value: '合计' }
  arr[8] = { value: formatMoney(total.value) }
  return arr
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练工资核算" subtitle="自动计算底薪、学员通过率奖金及课时费提成">
      <template #actions>
        <el-date-picker v-model="month" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width: 150px" @change="load" />
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 140px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-button type="primary" :icon="'Histogram'" @click="calculate">核算工资</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="12" class="board">
      <el-col :xs="12" :sm="8"><SectionCard><div class="kpi"><span class="l">教练人数</span><span class="v num">{{ list.length }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8"><SectionCard><div class="kpi"><span class="l">工资总额</span><span class="v num">{{ formatMoney(total) }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8"><SectionCard><div class="kpi"><span class="l">已发放</span><span class="v num ok">{{ paidCount }} / {{ list.length }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard title="工资明细" icon="Money" bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%" :summary-method="summary" show-summary>
        <el-table-column label="教练" prop="coachName" min-width="100" />
        <el-table-column label="分校" prop="branchName" width="110" />
        <el-table-column label="通过率" width="90" align="center">
          <template #default="{ row }"><span class="num" :style="{ color: rateColor(row.passRate) }">{{ formatPercent(row.passRate) }}</span></template>
        </el-table-column>
        <el-table-column label="带教" width="70" align="center"><template #default="{ row }"><span class="num">{{ row.studentCount }}</span></template></el-table-column>
        <el-table-column label="课时" width="70" align="center"><template #default="{ row }"><span class="num">{{ scheduleCountOf(row) }}</span></template></el-table-column>
        <el-table-column label="底薪" width="100" align="right"><template #default="{ row }"><span class="num">{{ formatMoney(row.baseSalary) }}</span></template></el-table-column>
        <el-table-column label="通过率奖金" width="110" align="right"><template #default="{ row }"><span class="num accent">{{ formatMoney(row.passBonus) }}</span></template></el-table-column>
        <el-table-column label="课时提成" width="100" align="right"><template #default="{ row }"><span class="num accent">{{ formatMoney(row.commission) }}</span></template></el-table-column>
        <el-table-column label="应发合计" width="120" align="right" sortable :sort-by="'total'"><template #default="{ row }"><span class="num strong">{{ formatMoney(row.total) }}</span></template></el-table-column>
        <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-button type="primary" link @click="openDetail(row)">明细</el-button></template></el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无工资数据，请先核算" />
    </SectionCard>

    <el-dialog v-model="detailVisible" title="工资明细" width="440px" v-if="current">
      <div class="slip-head">
        <div class="sl-name">{{ current.coachName }}</div>
        <div class="sl-month">{{ current.month }} 工资单</div>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="底薪">{{ formatMoney(current.baseSalary) }}</el-descriptions-item>
        <el-descriptions-item label="通过率奖金"><span class="accent">+ {{ formatMoney(current.passBonus) }}</span><span class="hint">（通过率 {{ formatPercent(current.passRate) }} × 2000）</span></el-descriptions-item>
        <el-descriptions-item label="课时提成"><span class="accent">+ {{ formatMoney(current.commission) }}</span><span class="hint">（{{ scheduleCountOf(current) }} 课时 × 35）</span></el-descriptions-item>
        <el-descriptions-item label="应发合计"><span class="slip-total">{{ formatMoney(current.total) }}</span></el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.board :deep(.el-col) { margin-bottom: 14px; }
.kpi { display: flex; align-items: baseline; justify-content: space-between; }
.kpi .l { color: var(--brand-mute); font-size: 13px; }
.kpi .v { font-size: 24px; font-weight: 700; }
.num { font-family: 'Bahnschrift', sans-serif; }
.strong { font-weight: 700; color: var(--brand-primary); }
.accent { color: #D97706; }
.ok { color: #16A34A; }
.hint { color: var(--brand-mute); font-size: 12px; margin-left: 6px; }
.slip-head { text-align: center; margin-bottom: 16px; }
.sl-name { font-size: 18px; font-weight: 700; }
.sl-month { color: var(--brand-mute); font-size: 13px; margin-top: 4px; }
.slip-total { font-size: 18px; font-weight: 700; color: var(--brand-primary); font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
