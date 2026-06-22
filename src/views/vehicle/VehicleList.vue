<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { vehicleApi, branchApi, type VehicleRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate, daysLabel } from '@/utils/format'
import { VEHICLE_STATUS_MAP, type VehicleStatus } from '@/types'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const list = ref<VehicleRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const statusFilter = ref('')
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const params: any = { keyword: keyword.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    list.value = await vehicleApi.list(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const statusOpts: { value: VehicleStatus; label: string; color: string }[] = [
  { value: 'available', label: '教学可用', color: '#16A34A' },
  { value: 'repair', label: '故障维修', color: '#DC2626' },
  { value: 'inspecting', label: '年检中', color: '#F59E0B' },
]
const statusCounts = computed(() => statusOpts.map((s) => ({ ...s, count: list.value.filter((v) => v.status === s.value).length })))
function statusType(s: VehicleStatus) { return VEHICLE_STATUS_MAP[s].type as any }

async function changeStatus(row: VehicleRow, status: string) {
  await vehicleApi.updateStatus(row.id, status)
  ElMessage.success('状态已更新')
  load()
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练车档案" subtitle="车辆品牌、车牌、年检保险到期及实时状态管理">
      <template #actions>
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 140px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 130px" @change="load">
          <el-option v-for="s in statusOpts" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索车牌/品牌" :prefix-icon="'Search'" clearable style="width: 170px" @change="load" />
      </template>
    </PageHeader>

    <el-row :gutter="12" class="status-board">
      <el-col v-for="s in statusCounts" :key="s.value" :xs="24" :sm="8">
        <div class="status-card" :style="{ borderColor: s.color }">
          <span class="dot" :style="{ background: s.color }"></span>
          <div class="sc-label">{{ s.label }}</div>
          <div class="sc-value num">{{ s.count }}</div>
        </div>
      </el-col>
    </el-row>

    <SectionCard bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%">
        <el-table-column label="车牌号" width="120"><template #default="{ row }"><span class="plate">{{ row.plate }}</span></template></el-table-column>
        <el-table-column label="车型" min-width="150"><template #default="{ row }">{{ row.brand }} {{ row.model }}</template></el-table-column>
        <el-table-column label="所属分校" prop="branchName" width="120" />
        <el-table-column label="购买日期" width="120"><template #default="{ row }">{{ formatDate(row.purchaseDate) }}</template></el-table-column>
        <el-table-column label="年检到期" width="150">
          <template #default="{ row }">
            <div :class="{ warn: row.inspectionDays <= 30 }">{{ formatDate(row.inspectionExpire) }}<div class="sub">{{ daysLabel(row.inspectionDays) }}</div></div>
          </template>
        </el-table-column>
        <el-table-column label="保险到期" width="150">
          <template #default="{ row }">
            <div :class="{ warn: row.insuranceDays <= 30 }">{{ formatDate(row.insuranceExpire) }}<div class="sub">{{ daysLabel(row.insuranceDays) }}</div></div>
          </template>
        </el-table-column>
        <el-table-column label="里程(km)" width="110" align="right"><template #default="{ row }"><span class="num">{{ row.mileage.toLocaleString() }}</span></template></el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row.status)" effect="light" round>{{ VEHICLE_STATUS_MAP[row.status as VehicleStatus].label }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="router.push(`/vehicle/maintenance/${row.id}`)">保养</el-button>
            <el-dropdown @command="(c: string) => changeStatus(row, c)">
              <el-button link>变更状态<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu><el-dropdown-item v-for="s in statusOpts" :key="s.value" :command="s.value">{{ s.label }}</el-dropdown-item></el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无车辆数据" />
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.status-board :deep(.el-col) { margin-bottom: 14px; }
.status-card { display: flex; align-items: center; gap: 12px; padding: 16px 18px; background: #fff; border-radius: 12px; border-left: 4px solid; box-shadow: var(--shadow-soft); }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.sc-label { flex: 1; color: var(--brand-mute); }
.sc-value { font-size: 26px; font-weight: 700; }
.plate { font-family: 'Bahnschrift', sans-serif; font-weight: 700; color: var(--brand-primary); }
.num { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
.warn { color: #DC2626; font-weight: 600; }
.sub { font-size: 11px; color: var(--brand-mute); font-weight: 400; }
:deep(.no-padding) { padding: 0 !important; }
</style>
