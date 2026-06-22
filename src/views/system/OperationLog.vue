<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { systemApi } from '@/api'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { ElMessage } from 'element-plus'
import type { OperationLog } from '@/types'

const raw = ref<OperationLog[]>([])
const loading = ref(true)
const moduleFilter = ref('')
const keyword = ref('')
const dateRange = ref<[string, string] | null>(null)

async function load() {
  loading.value = true
  try {
    raw.value = await systemApi.logs(moduleFilter.value || undefined)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const MODULES = ['教练管理', '排班管理', '车辆管理', '财务管理', '系统管理']

const moduleType = (m: string) => {
  if (m.includes('教练')) return 'success'
  if (m.includes('排班')) return 'warning'
  if (m.includes('车辆')) return 'primary'
  if (m.includes('财务')) return 'danger'
  return 'info'
}

const list = computed(() => {
  let arr = raw.value
  const kw = keyword.value.trim()
  if (kw) arr = arr.filter((x) => x.username.includes(kw))
  if (dateRange.value) {
    const [start, end] = dateRange.value
    arr = arr.filter((x) => {
      const d = x.createdAt.slice(0, 10)
      return d >= start && d <= end
    })
  }
  return arr
})

const stats = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const arr = list.value
  return {
    total: arr.length,
    today: arr.filter((x) => x.createdAt.startsWith(today)).length,
    modules: new Set(arr.map((x) => x.module)).size,
  }
})

function formatDateTime(str?: string): string {
  if (!str) return '-'
  return str.slice(0, 19)
}

function exportLogs() {
  const headers = ['时间', '操作人', '模块', '操作', '详情']
  const rows = list.value.map((x) => [formatDateTime(x.createdAt), x.username, x.module, x.action, x.detail])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '操作日志.csv'; a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出日志')
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="操作日志" subtitle="关键操作记录，确保数据安全与可追溯性">
      <template #actions>
        <el-select v-model="moduleFilter" placeholder="全部模块" clearable filterable style="width: 150px" @change="load">
          <el-option v-for="m in MODULES" :key="m" :label="m" :value="m" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索操作人" :prefix-icon="'Search'" clearable style="width: 160px" />
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始" end-placeholder="结束" style="width: 240px" />
        <el-button :icon="'Download'" plain @click="exportLogs">导出</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="12" class="board">
      <el-col :span="8"><SectionCard><div class="kpi"><span class="l">日志总数</span><span class="v num">{{ stats.total }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="kpi"><span class="l">今日操作</span><span class="v num">{{ stats.today }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="kpi"><span class="l">涉及模块</span><span class="v num">{{ stats.modules }}</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%" :max-height="520">
        <el-table-column label="时间" width="170"><template #default="{ row }"><span class="num">{{ formatDateTime(row.createdAt) }}</span></template></el-table-column>
        <el-table-column label="操作人" prop="username" width="110" />
        <el-table-column label="模块" width="120" align="center"><template #default="{ row }"><el-tag :type="moduleType(row.module)" effect="light" round size="small">{{ row.module }}</el-tag></template></el-table-column>
        <el-table-column label="操作" prop="action" width="120" />
        <el-table-column label="详情" prop="detail" min-width="260" show-overflow-tooltip />
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无日志记录" />
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.board :deep(.el-col) { margin-bottom: 14px; }
.kpi { display: flex; align-items: baseline; justify-content: space-between; }
.kpi .l { color: var(--brand-mute); font-size: 13px; }
.kpi .v { font-size: 26px; font-weight: 700; }
.num { font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
