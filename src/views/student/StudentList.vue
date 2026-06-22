<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { studentApi, branchApi, type StudentRow, type StudentDetail } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatDate } from '@/utils/format'
import { STUDENT_STATUS_MAP, PAY_METHOD_MAP, type PayMethod } from '@/types'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const list = ref<StudentRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const statusFilter = ref<string>('')
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
const keyword = ref('')
const page = ref(1)
const pageSize = 20

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<StudentDetail | null>(null)

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const params: any = { keyword: keyword.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    list.value = await studentApi.list(params)
    page.value = 1
  } finally {
    loading.value = false
  }
}
onMounted(load)

const paged = computed(() => list.value.slice((page.value - 1) * pageSize, page.value * pageSize))

const stats = computed(() => ({
  total: list.value.length,
  enrolled: list.value.filter((s) => s.status === 'enrolled').length,
  training: list.value.filter((s) => s.status === 'training').length,
  examining: list.value.filter((s) => s.status === 'examining').length,
  passed: list.value.filter((s) => s.status === 'passed').length,
}))

async function openDetail(row: StudentRow) {
  detail.value = null
  detailLoading.value = true
  detailVisible.value = true
  try {
    detail.value = await studentApi.detail(row.id)
  } catch {
    detailVisible.value = false
    ElMessage.error('加载学员详情失败')
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="学员档案" subtitle="统一管理所有学员信息，查看学习进度、考试记录及缴费情况">
      <template #actions>
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 140px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 130px" @change="load">
          <el-option v-for="(v, k) in STUDENT_STATUS_MAP" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索姓名/电话" :prefix-icon="'Search'" clearable style="width: 180px" @change="load" />
      </template>
    </PageHeader>

    <el-row :gutter="12" class="board">
      <el-col :xs="12" :sm="8" :md="4"><SectionCard><div class="kpi"><span class="l">学员总数</span><span class="v num">{{ stats.total }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8" :md="4"><SectionCard><div class="kpi"><span class="l">已报名</span><span class="v num info">{{ stats.enrolled }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8" :md="4"><SectionCard><div class="kpi"><span class="l">培训中</span><span class="v num warn">{{ stats.training }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8" :md="4"><SectionCard><div class="kpi"><span class="l">考试中</span><span class="v num blue">{{ stats.examining }}</span></div></SectionCard></el-col>
      <el-col :xs="12" :sm="8" :md="4"><SectionCard><div class="kpi"><span class="l">已通过</span><span class="v num ok">{{ stats.passed }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard bodyClass="no-padding">
      <el-table :data="paged" v-loading="loading" style="width: 100%">
        <el-table-column label="学员编号" width="100">
          <template #default="{ row }"><span class="num">#{{ row.id.toString().padStart(4, '0') }}</span></template>
        </el-table-column>
        <el-table-column label="姓名" prop="name" min-width="100" />
        <el-table-column label="性别" width="70" align="center">
          <template #default="{ row }">{{ row.gender === 1 ? '男' : '女' }}</template>
        </el-table-column>
        <el-table-column label="联系电话" prop="phone" width="130" />
        <el-table-column label="所属分校" prop="branchName" width="130" />
        <el-table-column label="所属教练" prop="coachName" width="100" />
        <el-table-column label="报名日期" width="120">
          <template #default="{ row }">{{ formatDate(row.enrollDate) }}</template>
        </el-table-column>
        <el-table-column label="学习状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="STUDENT_STATUS_MAP[row.status].type" effect="light" round>
              {{ STUDENT_STATUS_MAP[row.status].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无学员数据" />
      <div class="pager" v-if="list.length > pageSize">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="list.length" layout="prev, pager, next, total" background />
      </div>
    </SectionCard>

    <el-dialog v-model="detailVisible" title="学员详情" width="760px" top="5vh">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="2" border size="default" style="margin-bottom: 16px">
            <el-descriptions-item label="学员编号"><span class="num">#{{ detail.id.toString().padStart(4, '0') }}</span></el-descriptions-item>
            <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ detail.gender === 1 ? '男' : '女' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
            <el-descriptions-item label="所属分校">{{ detail.branchName }}</el-descriptions-item>
            <el-descriptions-item label="所属教练">{{ detail.coachName }}</el-descriptions-item>
            <el-descriptions-item label="报名日期">{{ formatDate(detail.enrollDate) }}</el-descriptions-item>
            <el-descriptions-item label="学习状态">
              <el-tag :type="STUDENT_STATUS_MAP[detail.status].type" effect="light" round>
                {{ STUDENT_STATUS_MAP[detail.status].label }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">考试记录</el-divider>
          <el-table :data="detail.exams" size="default" style="width: 100%" max-height="260">
            <el-table-column label="日期" prop="examDate" width="110">
              <template #default="{ row }">{{ formatDate(row.examDate) }}</template>
            </el-table-column>
            <el-table-column label="科目" prop="subject" width="90" />
            <el-table-column label="批次" prop="batch" width="90" />
            <el-table-column label="成绩" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.passed === 1 ? 'success' : 'danger'" effect="light" round>
                  {{ row.passed === 1 ? '合格' : '不合格' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!detail.exams.length" text="暂无考试记录" />

          <el-divider content-position="left">缴费记录</el-divider>
          <el-table :data="detail.payments" size="default" style="width: 100%">
            <el-table-column label="缴费编号" width="100">
              <template #default="{ row }"><span class="num">#{{ row.id }}</span></template>
            </el-table-column>
            <el-table-column label="金额" width="110" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.amount) }}</span></template>
            </el-table-column>
            <el-table-column label="支付方式" width="100" align="center">
              <template #default="{ row }">{{ row.payMethod ? PAY_METHOD_MAP[row.payMethod as PayMethod].label : '—' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'confirmed' ? 'success' : 'warning'" effect="light" round>
                  {{ row.status === 'confirmed' ? '已确认' : '待确认' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="缴费日期" width="130">
              <template #default="{ row }">{{ formatDate(row.confirmedAt || row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <EmptyState v-if="!detail.payments.length" text="暂无缴费记录" />
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
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
.info { color: #6B7280; }
.blue { color: #2563EB; }
.pager { display: flex; justify-content: flex-end; padding: 12px 16px; }
:deep(.no-padding) { padding: 0 !important; }
</style>
