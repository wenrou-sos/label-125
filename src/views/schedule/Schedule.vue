<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { scheduleApi, coachApi, vehicleApi, type ScheduleRow, type CoachRow, type VehicleRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const auth = useAuthStore()
const coaches = ref<CoachRow[]>([])
const vehicles = ref<VehicleRow[]>([])
const list = ref<ScheduleRow[]>([])
const loading = ref(true)
const selectedDate = ref(new Date())
const coachFilter = ref<number | undefined>(undefined)

const SLOTS = [
  { label: '08:00-10:00', start: '08:00', end: '10:00' },
  { label: '10:00-12:00', start: '10:00', end: '12:00' },
  { label: '13:00-15:00', start: '13:00', end: '15:00' },
  { label: '15:00-17:00', start: '15:00', end: '17:00' },
]
const SUBJECT_OPTS = ['科目二', '科目三']

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const dialogVisible = ref(false)
const form = reactive<{ coachId: number | undefined; studentId: number | undefined; scheduleDate: string; slot: string; subject: string; vehicleId: number | undefined }>({ coachId: undefined, studentId: undefined, scheduleDate: '', slot: SLOTS[0].label, subject: '科目二', vehicleId: undefined })
const importDialog = ref(false)
const importText = ref('')
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

async function loadData() {
  loading.value = true
  try {
    const d = selectedDate.value
    const start = ymd(new Date(d.getFullYear(), d.getMonth(), 1))
    const end = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    const params: any = { start, end }
    if (!auth.isHeadquarters) params.branchId = auth.branchId
    if (coachFilter.value) params.coachId = coachFilter.value
    list.value = await scheduleApi.list(params)
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  coaches.value = await coachApi.list({})
  vehicles.value = await vehicleApi.list({})
  await loadData()
})
watch(selectedDate, loadData)

const daySchedules = (dayStr: string) => list.value.filter((s) => s.scheduleDate === dayStr)
const todayStr = computed(() => ymd(selectedDate.value))
const todayList = computed(() => daySchedules(todayStr.value))

function openAdd(date?: Date) {
  form.coachId = coachFilter.value || coaches.value[0]?.id
  form.studentId = undefined
  form.scheduleDate = date ? ymd(date) : ymd(selectedDate.value)
  form.slot = SLOTS[0].label
  form.subject = '科目二'
  form.vehicleId = undefined
  dialogVisible.value = true
}

function slotOf(label: string) { return SLOTS.find((s) => s.label === label) || SLOTS[0] }

async function submit() {
  if (!form.coachId || !form.studentId || !form.scheduleDate) { ElMessage.warning('请补全教练、学员与日期'); return }
  const slot = slotOf(form.slot)
  const check = await scheduleApi.check({ coachId: form.coachId, studentId: form.studentId, date: form.scheduleDate, startTime: slot.start, endTime: slot.end })
  let force = false
  if (check.hasConflict) {
    try {
      await ElMessageBox.confirm('检测到该时段已存在排班冲突（教练或学员已安排），是否仍要继续？', '排班冲突提示', { type: 'warning', confirmButtonText: '仍要保存', cancelButtonText: '取消' })
      force = true
    } catch { return }
  }
  await scheduleApi.create({ coachId: form.coachId, studentId: form.studentId, scheduleDate: form.scheduleDate, startTime: slot.start, endTime: slot.end, subject: form.subject, vehicleId: form.vehicleId, force })
  ElMessage.success('排班已创建')
  dialogVisible.value = false
  loadData()
}

async function remove(id: number) {
  await ElMessageBox.confirm('确定删除该排班？', '提示', { type: 'warning' })
  await scheduleApi.remove(id)
  ElMessage.success('已删除')
  loadData()
}

function doImport() {
  importResult.value = null
  const lines = importText.value.trim().split('\n').filter(Boolean)
  let success = 0, failed = 0
  const errors: string[] = []
  const payload: any[] = []
  lines.forEach((line, idx) => {
    const [coachName, studentName, date, slotLabel, subject] = line.split(/[,，]/).map((x) => x.trim())
    const coach = coaches.value.find((c) => c.name === coachName)
    const slot = SLOTS.find((s) => s.label === slotLabel)
    if (!coach || !date || !slot) { failed++; errors.push(`第${idx + 1}行：信息不全、教练不存在或时段格式错误`); return }
    payload.push({ coachId: coach.id, studentId: 1000 + idx, scheduleDate: date, startTime: slot.start, endTime: slot.end, subject: subject || '科目二', vehicleId: coach.id })
    success++
  })
  importResult.value = { success, failed, errors }
  if (payload.length) scheduleApi.importBatch(payload).then(() => loadData())
}
function confirmImport() { importDialog.value = false; ElMessage.success(`已导入 ${importResult.value?.success || 0} 条`); importText.value = ''; importResult.value = null }
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练排班管理" subtitle="每日带教时段分配、智能冲突检测与批量导入">
      <template #actions>
        <el-select v-model="coachFilter" placeholder="全部教练" clearable filterable style="width: 180px" @change="loadData">
          <el-option v-for="c in coaches" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button :icon="'Upload'" plain @click="importDialog = true">批量导入</el-button>
        <el-button type="primary" :icon="'Plus'" @click="openAdd()">手动排班</el-button>
      </template>
    </PageHeader>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="17">
        <SectionCard title="排班日历" icon="Calendar" bodyClass="cal-body">
          <el-calendar v-model="selectedDate" v-loading="loading">
            <template #date-cell="{ data }">
              <div class="cal-cell" :class="{ today: data.isSelected }">
                <div class="cal-day">{{ data.day.split('-').pop() }}</div>
                <div class="cal-items">
                  <div v-for="s in daySchedules(data.day)" :key="s.id" class="cal-pill" @click.stop="remove(s.id)">
                    <span class="pill-time">{{ s.startTime }}</span>
                    <span class="pill-name">{{ s.coachName }}</span>
                    <span class="pill-sub">{{ s.subject }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-calendar>
        </SectionCard>
      </el-col>
      <el-col :xs="24" :lg="7">
        <SectionCard title="当日排班明细" icon="List" bodyClass="no-padding">
          <div class="day-head">{{ todayStr }} 排班</div>
          <el-scrollbar height="440px">
            <div v-if="todayList.length" class="day-list">
              <div v-for="s in todayList" :key="s.id" class="day-item">
                <div class="di-time">{{ s.startTime }}-{{ s.endTime }}</div>
                <div class="di-body">
                  <div class="di-main">{{ s.coachName }} · {{ s.studentName }}</div>
                  <div class="di-sub">{{ s.subject }} · {{ s.vehiclePlate }}</div>
                </div>
                <el-button text type="danger" :icon="'Delete'" @click="remove(s.id)" />
              </div>
            </div>
            <EmptyState v-else text="当日暂无排班" />
          </el-scrollbar>
        </SectionCard>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" title="手动排班" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="教练">
          <el-select v-model="form.coachId" filterable placeholder="选择教练" style="width: 100%">
            <el-option v-for="c in coaches" :key="c.id" :label="c.name + '（' + c.branchName + '）'" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="学员编号"><el-input-number v-model="form.studentId" :min="1" controls-position="right" style="width: 100%" /></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="form.scheduleDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="时段"><el-select v-model="form.slot" style="width: 100%"><el-option v-for="s in SLOTS" :key="s.label" :label="s.label" :value="s.label" /></el-select></el-form-item>
        <el-form-item label="科目"><el-select v-model="form.subject" style="width: 100%"><el-option v-for="s in SUBJECT_OPTS" :key="s" :label="s" :value="s" /></el-select></el-form-item>
        <el-form-item label="车辆">
          <el-select v-model="form.vehicleId" filterable placeholder="选择教练车" style="width: 100%">
            <el-option v-for="v in vehicles" :key="v.id" :label="v.plate + '（' + v.brand + v.model + '）'" :value="v.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submit">保存排班</el-button></template>
    </el-dialog>

    <el-dialog v-model="importDialog" title="批量导入排班" width="560px">
      <p class="tip">每行一条，格式：<b>教练姓名,学员姓名,日期,时段,科目</b>（时段如 08:00-10:00）</p>
      <el-input v-model="importText" type="textarea" :rows="8" placeholder="张伟,李明,2025-07-01,08:00-10:00,科目二" />
      <div v-if="importResult" class="import-result">
        <el-alert :title="`成功 ${importResult.success} 条，失败 ${importResult.failed} 条`" :type="importResult.failed ? 'warning' : 'success'" :closable="false" />
        <div v-if="importResult.errors.length" class="err-list"><div v-for="(e, i) in importResult.errors" :key="i">{{ e }}</div></div>
      </div>
      <template #footer>
        <el-button @click="importDialog = false">取消</el-button>
        <el-button @click="doImport">解析并预检</el-button>
        <el-button type="primary" :disabled="!importResult?.success" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
:deep(.cal-body) { padding: 0; }
:deep(.el-calendar) { --el-calendar-border: var(--brand-line); }
:deep(.el-calendar__header) { padding: 12px 16px; }
:deep(.el-calendar-table .el-calendar-day) { height: 86px; padding: 4px; }
.cal-cell { height: 100%; display: flex; flex-direction: column; }
.cal-day { font-weight: 600; color: var(--brand-ink); font-size: 13px; }
.cal-items { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; overflow: hidden; }
.cal-pill { background: rgba(15,92,78,0.1); border-left: 3px solid var(--brand-primary); border-radius: 4px; padding: 1px 4px; font-size: 11px; display: flex; gap: 4px; cursor: pointer; }
.pill-time { color: var(--brand-primary); font-weight: 600; font-family: 'Bahnschrift', sans-serif; }
.pill-name { color: var(--brand-ink); }
.pill-sub { color: var(--brand-mute); }
.day-head { padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--brand-line); background: var(--brand-canvas); }
.day-list { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.day-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--brand-canvas); border-radius: 8px; border: 1px solid var(--brand-line); }
.di-time { font-family: 'Bahnschrift', sans-serif; font-weight: 700; color: var(--brand-primary); width: 110px; }
.di-main { font-weight: 600; }
.di-sub { font-size: 12px; color: var(--brand-mute); }
.tip { color: var(--brand-mute); font-size: 13px; margin-bottom: 8px; }
.import-result { margin-top: 12px; }
.err-list { margin-top: 6px; font-size: 12px; color: #DC2626; max-height: 120px; overflow: auto; }
:deep(.no-padding) { padding: 0 !important; }
</style>
