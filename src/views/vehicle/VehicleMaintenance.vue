<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { vehicleApi, type VehicleRow } from '@/api'
import type { Maintenance } from '@/types'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney, formatDate } from '@/utils/format'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const vehicle = ref<VehicleRow | null>(null)
const list = ref<Maintenance[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const form = reactive<{ maintainDate: string; type: string; cost: number; remark: string }>({ maintainDate: new Date().toISOString().slice(0, 10), type: '常规保养', cost: 0, remark: '' })

const TYPES = ['常规保养', '机油更换', '轮胎更换', '刹车系统', '大修', '其他']

async function loadVehicle() {
  const id = Number(route.params.id)
  const all = await vehicleApi.list({})
  vehicle.value = all.find((v) => v.id === id) || null
}
async function loadHistory() {
  loading.value = true
  try {
    list.value = await vehicleApi.maintenance(Number(route.params.id))
  } finally {
    loading.value = false
  }
}
onMounted(async () => { await loadVehicle(); await loadHistory() })

const totalCost = computed(() => list.value.reduce((s, x) => s + (x.cost || 0), 0))

async function submit() {
  if (!form.remark) { ElMessage.warning('请填写保养内容'); return }
  await vehicleApi.addMaintenance({ vehicleId: Number(route.params.id), ...form })
  ElMessage.success('保养记录已添加')
  dialogVisible.value = false
  Object.assign(form, { maintainDate: new Date().toISOString().slice(0, 10), type: '常规保养', cost: 0, remark: '' })
  loadHistory()
}
</script>

<template>
  <div class="page-wrapper">
    <div class="mh">
      <div>
        <el-button text :icon="'ArrowLeft'" @click="router.back()">返回</el-button>
        <h1 class="page-title" style="display:inline-block;margin-left:8px">{{ vehicle?.plate }} 保养记录</h1>
        <span class="sub-info" v-if="vehicle">{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.branchName }}</span>
      </div>
      <el-button type="primary" :icon="'Plus'" @click="dialogVisible = true">添加保养</el-button>
    </div>

    <el-row :gutter="16" class="sum-row">
      <el-col :span="8"><SectionCard><div class="sum"><span class="l">保养次数</span><span class="v num">{{ list.length }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="sum"><span class="l">累计费用</span><span class="v num">{{ formatMoney(totalCost) }}</span></div></SectionCard></el-col>
      <el-col :span="8"><SectionCard><div class="sum"><span class="l">当前里程</span><span class="v num">{{ vehicle?.mileage.toLocaleString() }} km</span></div></SectionCard></el-col>
    </el-row>

    <SectionCard title="保养历史" icon="Tools" bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%">
        <el-table-column label="日期" width="120"><template #default="{ row }">{{ formatDate(row.maintainDate) }}</template></el-table-column>
        <el-table-column label="保养类型" width="120"><template #default="{ row }"><el-tag effect="light" round>{{ row.type }}</el-tag></template></el-table-column>
        <el-table-column label="保养内容" prop="remark" min-width="240" show-overflow-tooltip />
        <el-table-column label="费用" width="120" align="right"><template #default="{ row }"><span class="num">{{ formatMoney(row.cost) }}</span></template></el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无保养记录" />
    </SectionCard>

    <el-dialog v-model="dialogVisible" title="添加保养记录" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="日期"><el-date-picker v-model="form.maintainDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.type" style="width: 100%"><el-option v-for="t in TYPES" :key="t" :label="t" :value="t" /></el-select></el-form-item>
        <el-form-item label="保养内容"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="费用(元)"><el-input-number v-model="form.cost" :min="0" :step="100" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sub-info { margin-left: 12px; color: var(--brand-mute); font-size: 13px; }
.sum-row :deep(.el-col) { margin-bottom: 14px; }
.sum { display: flex; align-items: baseline; justify-content: space-between; }
.sum .l { color: var(--brand-mute); font-size: 13px; }
.sum .v { font-size: 24px; font-weight: 700; }
.num { font-family: 'Bahnschrift', sans-serif; }
:deep(.no-padding) { padding: 0 !important; }
</style>
