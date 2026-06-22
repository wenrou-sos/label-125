<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi, branchApi, type PaymentRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatDate } from '@/utils/format'
import { PAY_METHOD_MAP, type PayMethod } from '@/types'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const list = ref<PaymentRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const statusFilter = ref('')
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
const keyword = ref('')

const dialogVisible = ref(false)
const current = ref<PaymentRow | null>(null)
const method = ref<PayMethod>('wechat')

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const params: any = { keyword: keyword.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    list.value = await financeApi.payments(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const stats = computed(() => {
  const total = list.value.reduce((s, x) => s + x.amount, 0)
  const confirmed = list.value.filter((x) => x.status === 'confirmed').reduce((s, x) => s + x.amount, 0)
  const pending = list.value.filter((x) => x.status === 'pending').length
  return { total, confirmed, pending, count: list.value.length }
})

function openConfirm(row: PaymentRow) { current.value = row; method.value = 'wechat'; dialogVisible.value = true }
async function submitConfirm() {
  await financeApi.confirm(current.value!.id, method.value)
  ElMessage.success('收款已确认')
  dialogVisible.value = false
  load()
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="报名费收款" subtitle="学员报名费收款确认流程，支持多种支付方式">
      <template #actions>
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 140px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 120px" @change="load">
          <el-option label="待确认" value="pending" /><el-option label="已确认" value="confirmed" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索学员" :prefix-icon="'Search'" clearable style="width: 160px" @change="load" />
      </template>
    </PageHeader>

    <el-row :gutter="12" class="board">
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">收款笔数</span><span class="v num">{{ stats.count }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">应收总额</span><span class="v num">{{ formatMoney(stats.total) }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">已确认</span><span class="v num ok">{{ formatMoney(stats.confirmed) }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="6"><SectionCard><div class="kpi"><span class="l">待确认</span><span class="v num warn">{{ stats.pending }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%">
        <el-table-column label="缴费编号" width="100"><template #default="{ row }">#{{ row.id }}</template></el-table-column>
        <el-table-column label="学员" prop="studentName" min-width="100" />
        <el-table-column label="所属分校" prop="branchName" width="120" />
        <el-table-column label="金额" width="120" align="right"><template #default="{ row }"><span class="num">{{ formatMoney(row.amount) }}</span></template></el-table-column>
        <el-table-column label="支付方式" width="120" align="center"><template #default="{ row }">{{ row.payMethod ? PAY_METHOD_MAP[row.payMethod as PayMethod].label : '—' }}</template></el-table-column>
        <el-table-column label="缴费日期" width="120"><template #default="{ row }">{{ formatDate(row.confirmedAt || row.createdAt) }}</template></el-table-column>
        <el-table-column label="状态" width="100" align="center"><template #default="{ row }"><el-tag :type="row.status === 'confirmed' ? 'success' : 'warning'" effect="light" round>{{ row.status === 'confirmed' ? '已确认' : '待确认' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="primary" link @click="openConfirm(row)">确认收款</el-button>
            <span v-else class="mute">—</span>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无缴费记录" />
    </SectionCard>

    <el-dialog v-model="dialogVisible" title="确认收款" width="400px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="学员">{{ current?.studentName }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ formatMoney(current?.amount || 0) }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="支付方式">
          <el-select v-model="method" style="width: 100%">
            <el-option v-for="(v, k) in PAY_METHOD_MAP" :key="k" :label="v.label" :value="k" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submitConfirm">确认收款</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.board :deep(.el-col) { margin-bottom: 14px; }
.kpi { display: flex; align-items: baseline; justify-content: space-between; }
.kpi .l { color: var(--brand-mute); font-size: 13px; }
.kpi .v { font-size: 22px; font-weight: 700; }
.num { font-family: 'Bahnschrift', sans-serif; }
.ok { color: #16A34A; }
.warn { color: #D97706; }
.mute { color: var(--brand-mute); }
:deep(.no-padding) { padding: 0 !important; }
</style>
