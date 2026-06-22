<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { complaintApi, coachApi, type CoachRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'
import { COMPLAINT_STATUS_MAP, type ComplaintStatus } from '@/types'
import { ElMessage } from 'element-plus'

const route = useRoute()
const auth = useAuthStore()
const list = ref<any[]>([])
const coaches = ref<CoachRow[]>([])
const loading = ref(true)
const statusFilter = ref<string>('')

const resolveDialog = ref(false)
const createDialog = ref(false)
const current = ref<any>(null)
const resolveForm = reactive<{ status: ComplaintStatus; result: string }>({ status: 'resolved', result: '' })
const createForm = reactive<{ coachId: number | undefined; content: string }>({ coachId: undefined, content: '' })

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (!auth.isHeadquarters) params.branchId = auth.branchId
    list.value = await complaintApi.list(params)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  if (route.query.coachId) { createForm.coachId = Number(route.query.coachId); createDialog.value = true }
  await load()
  coaches.value = await coachApi.list({})
})

const stats = computed(() => ({
  total: list.value.length,
  pending: list.value.filter((x) => x.status === 'pending').length,
  resolved: list.value.filter((x) => x.status === 'resolved').length,
}))
function statusMeta(s: ComplaintStatus) { return COMPLAINT_STATUS_MAP[s] }

function openResolve(row: any) {
  current.value = row
  resolveForm.status = 'resolved'
  resolveForm.result = ''
  resolveDialog.value = true
}
async function submitResolve() {
  if (!resolveForm.result) { ElMessage.warning('请填写处理结果'); return }
  await complaintApi.resolve(current.value.id, { status: resolveForm.status, result: resolveForm.result })
  ElMessage.success('已更新处理结果')
  resolveDialog.value = false
  load()
}
async function submitCreate() {
  if (!createForm.coachId || !createForm.content) { ElMessage.warning('请选择教练并填写投诉内容'); return }
  await complaintApi.create({ coachId: createForm.coachId, content: createForm.content })
  ElMessage.success('投诉已记录')
  createDialog.value = false
  createForm.content = ''
  load()
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练投诉记录" subtitle="记录投诉内容、处理状态及结果跟踪">
      <template #actions>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 130px" @change="load">
          <el-option v-for="(v, k) in COMPLAINT_STATUS_MAP" :key="k" :label="v.label" :value="k" />
        </el-select>
        <el-button type="primary" :icon="'Plus'" @click="createDialog = true">登记投诉</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="12" class="stat-row">
      <el-col :span="8"><SectionCard><div class="mini-stat"><span class="label">投诉总数</span><span class="val num">{{ stats.total }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="mini-stat"><span class="label">待处理</span><span class="val num" style="color:#D97706">{{ stats.pending }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="mini-stat"><span class="label">已解决</span><span class="val num" style="color:#16A34A">{{ stats.resolved }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%">
        <el-table-column label="投诉编号" width="90"><template #default="{ row }">#{{ row.id }}</template></el-table-column>
        <el-table-column label="教练" prop="coachName" width="100" />
        <el-table-column label="所属分校" prop="branchName" width="120" />
        <el-table-column label="投诉学员" prop="studentName" width="110" />
        <el-table-column label="投诉内容" prop="content" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag :type="statusMeta(row.status as ComplaintStatus).type as any" effect="light" round>{{ statusMeta(row.status as ComplaintStatus).label }}</el-tag></template>
        </el-table-column>
        <el-table-column label="处理结果" prop="result" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.result || '—' }}</template>
        </el-table-column>
        <el-table-column label="登记时间" width="110"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'resolved'" type="primary" link @click="openResolve(row)">处理</el-button>
            <el-button v-else type="info" link @click="openResolve(row)">更新</el-button>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无投诉记录" />
    </SectionCard>

    <el-dialog v-model="resolveDialog" title="处理投诉" width="480px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="教练">{{ current?.coachName }}</el-descriptions-item>
        <el-descriptions-item label="投诉内容">{{ current?.content }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="处理状态">
          <el-select v-model="resolveForm.status" style="width: 100%">
            <el-option label="已解决" value="resolved" />
            <el-option label="处理中" value="processing" />
            <el-option label="待处理" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理结果"><el-input v-model="resolveForm.result" type="textarea" :rows="3" placeholder="请填写处理结果及跟踪说明" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="resolveDialog = false">取消</el-button><el-button type="primary" @click="submitResolve">提交</el-button></template>
    </el-dialog>

    <el-dialog v-model="createDialog" title="登记投诉" width="460px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="教练">
          <el-select v-model="createForm.coachId" filterable placeholder="选择教练" style="width: 100%">
            <el-option v-for="c in coaches" :key="c.id" :label="c.name + '（' + c.branchName + '）'" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="投诉内容"><el-input v-model="createForm.content" type="textarea" :rows="4" placeholder="请描述投诉详情" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="createDialog = false">取消</el-button><el-button type="primary" @click="submitCreate">登记</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.stat-row :deep(.el-col) { margin-bottom: 14px; }
.mini-stat { display: flex; align-items: baseline; justify-content: space-between; }
.mini-stat .label { color: var(--brand-mute); font-size: 13px; }
.mini-stat .val { font-size: 26px; font-weight: 700; }
.num { font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
