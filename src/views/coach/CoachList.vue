<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { coachApi, branchApi, type CoachRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import CoachCard from '@/components/CoachCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Coach } from '@/types'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()
const list = ref<CoachRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const branchFilter = ref<number | undefined>(auth.isHeadquarters ? undefined : (auth.branchId ?? undefined))
const page = ref(1)
const pageSize = 12

const dialogVisible = ref(false)
const editing = ref(false)
const form = reactive<Partial<Coach>>({ name: '', phone: '', gender: 1, certLevel: '初级教练员', teachYears: 1, subjects: ['科目二'], baseSalary: 3800, branchId: auth.branchId ?? undefined })
const CERT_LEVELS = ['初级教练员', '中级教练员', '高级教练员', '教练技师']
const SUBJECT_OPTS = ['科目一', '科目二', '科目三', '科目四']

async function load() {
  loading.value = true
  try {
    if (!branches.value.length) branches.value = await branchApi.list()
    const params: any = { keyword: keyword.value }
    if (branchFilter.value) params.branchId = branchFilter.value
    list.value = await coachApi.list(params)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => list.value)
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

function openAdd() {
  editing.value = false
  Object.assign(form, { id: undefined, name: '', phone: '', gender: 1, certLevel: '初级教练员', teachYears: 1, subjects: ['科目二'], baseSalary: 3800, branchId: branchFilter.value || branches.value[0]?.id })
  dialogVisible.value = true
}
function openEdit(c: CoachRow) {
  editing.value = true
  Object.assign(form, c)
  dialogVisible.value = true
}

async function submit() {
  if (!form.name || !form.branchId) { ElMessage.warning('请填写姓名并选择分校'); return }
  if (editing.value && form.id) {
    await coachApi.update(form.id, form)
    ElMessage.success('修改成功')
  } else {
    await coachApi.create(form)
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
  load()
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练档案" subtitle="教练基本信息、资质证书、执教年限及擅长科目管理">
      <template #actions>
        <el-select v-if="auth.isHeadquarters" v-model="branchFilter" placeholder="全部分校" clearable style="width: 150px" @change="load">
          <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索姓名/证号" :prefix-icon="'Search'" clearable style="width: 180px" @change="load" />
        <el-button type="primary" :icon="'Plus'" @click="openAdd">新增教练</el-button>
      </template>
    </PageHeader>

    <SectionCard>
      <div v-loading="loading">
        <el-row v-if="paged.length" :gutter="16">
          <el-col v-for="c in paged" :key="c.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="4" class="card-col">
            <CoachCard :coach="c" @edit="openEdit" />
          </el-col>
        </el-row>
        <EmptyState v-else text="暂无教练数据" />
      </div>
      <div class="pager" v-if="filtered.length > pageSize">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="filtered.length" layout="prev, pager, next" background />
      </div>
    </SectionCard>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑教练' : '新增教练'" width="520px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="所属分校">
          <el-select v-model="form.branchId" :disabled="!auth.isHeadquarters" placeholder="选择分校" style="width: 100%">
            <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender"><el-radio :value="1">男</el-radio><el-radio :value="2">女</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="教练证等级">
          <el-select v-model="form.certLevel" style="width: 100%"><el-option v-for="c in CERT_LEVELS" :key="c" :label="c" :value="c" /></el-select>
        </el-form-item>
        <el-form-item label="执教年限"><el-input-number v-model="form.teachYears" :min="0" :max="40" /></el-form-item>
        <el-form-item label="擅长科目">
          <el-select v-model="form.subjects" multiple style="width: 100%"><el-option v-for="s in SUBJECT_OPTS" :key="s" :label="s" :value="s" /></el-select>
        </el-form-item>
        <el-form-item label="底薪"><el-input-number v-model="form.baseSalary" :min="0" :step="100" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.card-col { margin-bottom: 16px; }
.pager { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
