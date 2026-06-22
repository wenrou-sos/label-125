<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { branchApi, type BranchStat } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import { formatMoney, formatPercent, rateColor } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const list = ref<BranchStat[]>([])
const loading = ref(true)
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    const all = await branchApi.list()
    list.value = auth.isHeadquarters ? all : all.filter((b) => b.id === auth.branchId)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = ref<BranchStat[]>([])
import { computed } from 'vue'
const tableData = computed(() =>
  list.value.filter((b) => !keyword.value || b.name.includes(keyword.value) || b.manager.includes(keyword.value)),
)
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="分校指标统计" subtitle="实时统计各分校学员招收、教练、车辆数量及通过率、营收">
      <template #actions>
        <el-input v-model="keyword" placeholder="搜索分校/负责人" :prefix-icon="'Search'" clearable style="width: 200px" />
        <el-button :icon="'Refresh'" plain @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <SectionCard bodyClass="no-padding">
      <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="分校名称" min-width="160">
          <template #default="{ row }">
            <div class="branch-cell">
              <div class="branch-icon">{{ row.name.charAt(0) }}</div>
              <div>
                <div class="branch-name">{{ row.name }}</div>
                <div class="branch-addr">{{ row.address }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="负责人" prop="manager" width="100" />
        <el-table-column label="联系电话" prop="phone" width="140" />
        <el-table-column label="学员数" prop="studentCount" width="90" align="center" sortable>
          <template #default="{ row }"><span class="num">{{ row.studentCount }}</span></template>
        </el-table-column>
        <el-table-column label="教练数" prop="coachCount" width="90" align="center" sortable>
          <template #default="{ row }"><span class="num">{{ row.coachCount }}</span></template>
        </el-table-column>
        <el-table-column label="车辆数" prop="vehicleCount" width="90" align="center" sortable>
          <template #default="{ row }"><span class="num">{{ row.vehicleCount }}</span></template>
        </el-table-column>
        <el-table-column label="考试通过率" width="130" align="center" sortable :sort-by="'rate'">
          <template #default="{ row }">
            <span class="rate-pill" :style="{ color: rateColor(row.rate), background: rateColor(row.rate) + '14' }">{{ formatPercent(row.rate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="累计营收" width="130" align="right" sortable :sort-by="'revenue'">
          <template #default="{ row }"><span class="num">{{ formatMoney(row.revenue) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="router.push(`/branch/dashboard/${row.id}`)">运营仪表盘</el-button>
          </template>
        </el-table-column>
      </el-table>
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.branch-cell { display: flex; align-items: center; gap: 10px; }
.branch-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--brand-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.branch-name { font-weight: 600; color: var(--brand-ink); }
.branch-addr { font-size: 12px; color: var(--brand-mute); margin-top: 2px; }
.num { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
.rate-pill { padding: 3px 10px; border-radius: 20px; font-weight: 600; font-size: 13px; font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
