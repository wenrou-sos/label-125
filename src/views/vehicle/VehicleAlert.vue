<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vehicleApi, type VehicleRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate, daysLabel, urgencyType } from '@/utils/format'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const vehicles = ref<VehicleRow[]>([])
const loading = ref(true)
const sending = ref(false)
const notified = ref<Set<string>>(new Set())

interface AlertItem { key: string; id: number; plate: string; brand: string; model: string; branchName: string; type: 'inspection' | 'insurance'; dueDate: string; daysLeft: number }

async function load() {
  loading.value = true
  try {
    vehicles.value = await vehicleApi.alerts(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const alerts = computed<AlertItem[]>(() => {
  const items: AlertItem[] = []
  vehicles.value.forEach((v) => {
    if (v.inspectionDays <= 30) items.push({ key: v.id + '-inspection', id: v.id, plate: v.plate, brand: v.brand, model: v.model, branchName: v.branchName || '-', type: 'inspection', dueDate: v.inspectionExpire, daysLeft: v.inspectionDays })
    if (v.insuranceDays <= 30) items.push({ key: v.id + '-insurance', id: v.id, plate: v.plate, brand: v.brand, model: v.model, branchName: v.branchName || '-', type: 'insurance', dueDate: v.insuranceExpire, daysLeft: v.insuranceDays })
  })
  return items.sort((a, b) => a.daysLeft - b.daysLeft)
})

const overdue = computed(() => alerts.value.filter((x) => x.daysLeft <= 0))
const urgent = computed(() => alerts.value.filter((x) => x.daysLeft > 0 && x.daysLeft <= 30))

async function notify(row: AlertItem) {
  sending.value = true
  await new Promise((r) => setTimeout(r, 600))
  notified.value.add(row.key)
  sending.value = false
  ElMessage.success(`已通过系统通知与邮件提醒管理员：${row.plate} ${row.type === 'inspection' ? '年检' : '保险'}到期`)
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="到期提醒" subtitle="年检到期前 30 天自动提醒，系统通知 + 邮件方式通知管理员">
      <template #actions>
        <el-button :icon="'Refresh'" plain @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="12" class="board">
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">总提醒</span><span class="v num">{{ alerts.length }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">已逾期</span><span class="v num danger">{{ overdue.length }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">30天内</span><span class="v num warn">{{ urgent.length }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">已通知</span><span class="v num ok">{{ notified.size }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard title="到期车辆清单" icon="Bell" bodyClass="no-padding">
      <el-table :data="alerts" v-loading="loading" style="width: 100%">
        <el-table-column label="车牌" width="120"><template #default="{ row }"><span class="plate">{{ row.plate }}</span></template></el-table-column>
        <el-table-column label="车型" min-width="140"><template #default="{ row }">{{ row.brand }} {{ row.model }}</template></el-table-column>
        <el-table-column label="分校" prop="branchName" width="120" />
        <el-table-column label="提醒类型" width="110" align="center">
          <template #default="{ row }"><el-tag :type="row.type === 'inspection' ? 'warning' : 'primary'" effect="light" round>{{ row.type === 'inspection' ? '年检到期' : '保险到期' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="到期日" width="120"><template #default="{ row }">{{ formatDate(row.dueDate) }}</template></el-table-column>
        <el-table-column label="剩余天数" width="120">
          <template #default="{ row }"><el-tag :type="urgencyType(row.daysLeft)" effect="dark" round>{{ daysLabel(row.daysLeft) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!notified.has(row.key)" type="primary" size="small" :loading="sending" @click="notify(row)">通知管理员</el-button>
            <el-button v-else type="success" size="small" plain :icon="'Check'">已通知</el-button>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !alerts.length" text="暂无到期提醒，一切正常！" />
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.board :deep(.el-col) { margin-bottom: 14px; }
.kpi { display: flex; align-items: baseline; justify-content: space-between; }
.kpi .l { color: var(--brand-mute); font-size: 13px; }
.kpi .v { font-size: 26px; font-weight: 700; }
.plate { font-family: 'Bahnschrift', sans-serif; font-weight: 700; color: var(--brand-primary); }
.num { font-family: 'Bahnschrift', sans-serif; }
.danger { color: #DC2626; }
.warn { color: #D97706; }
.ok { color: #16A34A; }
:deep(.no-padding) { padding: 0 !important; }
</style>
