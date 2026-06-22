<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { systemApi, branchApi, type UserRow } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'
import { ROLE_MAP, type RoleKey } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const auth = useAuthStore()
const all = ref<UserRow[]>([])
const branches = ref<any[]>([])
const loading = ref(true)
const roleFilter = ref<RoleKey | ''>('')

const ROLE_ID: Record<RoleKey, number> = { admin: 1, branch: 2, coach: 3 }

async function load() {
  loading.value = true
  try {
    if (!branches.value.length && auth.isHeadquarters) branches.value = await branchApi.list()
    const users = await systemApi.users()
    all.value = auth.isHeadquarters ? users : users.filter((u) => u.branchId === auth.branchId)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const list = computed(() => (roleFilter.value ? all.value.filter((u) => u.roleKey === roleFilter.value) : all.value))

const dialogVisible = ref(false)
const editing = ref(false)
const form = reactive<{ id?: number; username: string; realName: string; roleKey: RoleKey; branchId?: number | null; status: 1 | 0 }>({ username: '', realName: '', roleKey: 'coach', branchId: auth.branchId, status: 1 })

const roleOpts = computed(() => {
  if (auth.isHeadquarters) return [{ value: 'admin', label: '总校管理员' }, { value: 'branch', label: '分校管理员' }, { value: 'coach', label: '教练' }]
  return [{ value: 'coach', label: '教练' }]
})

function openAdd() {
  editing.value = false
  Object.assign(form, { id: undefined, username: '', realName: '', roleKey: 'coach', branchId: auth.branchId || branches.value[0]?.id, status: 1 })
  dialogVisible.value = true
}
function openEdit(row: UserRow) {
  editing.value = true
  Object.assign(form, { id: row.id, username: row.username, realName: row.realName, roleKey: row.roleKey, branchId: row.branchId, status: row.status })
  dialogVisible.value = true
}
async function submit() {
  if (!form.username || !form.realName) { ElMessage.warning('请填写账号与姓名'); return }
  const body = {
    username: form.username,
    realName: form.realName,
    roleKey: form.roleKey,
    roleId: ROLE_ID[form.roleKey],
    branchId: form.roleKey === 'admin' ? null : form.branchId,
    status: form.status,
  }
  if (editing.value && form.id) {
    await systemApi.updateUser(form.id, body)
    ElMessage.success('修改成功')
  } else {
    await systemApi.createUser(body)
    ElMessage.success('新增成功，初始密码 123456')
  }
  dialogVisible.value = false
  load()
}
async function toggleStatus(row: UserRow) {
  await ElMessageBox.confirm(`确定${row.status === 1 ? '停用' : '启用'}该账号？`, '提示', { type: 'warning' })
  await systemApi.updateUser(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success('已更新')
  load()
}
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="用户与角色" subtitle="区分总校管理员、分校管理员、教练等不同角色权限">
      <template #actions>
        <el-select v-model="roleFilter" placeholder="全部角色" clearable style="width: 140px">
          <el-option v-for="(v, k) in ROLE_MAP" :key="k" :label="v" :value="k" />
        </el-select>
        <el-button type="primary" :icon="'Plus'" @click="openAdd">新增用户</el-button>
      </template>
    </PageHeader>

    <SectionCard bodyClass="no-padding">
      <el-table :data="list" v-loading="loading" style="width: 100%">
        <el-table-column label="账号" prop="username" width="130"><template #default="{ row }"><span class="acc">{{ row.username }}</span></template></el-table-column>
        <el-table-column label="姓名" prop="realName" width="110" />
        <el-table-column label="角色" width="120" align="center"><template #default="{ row }"><el-tag :type="row.roleKey === 'admin' ? 'danger' : row.roleKey === 'branch' ? 'warning' : 'success'" effect="light" round>{{ ROLE_MAP[row.roleKey as RoleKey] }}</el-tag></template></el-table-column>
        <el-table-column label="所属分校" prop="branchName" width="140"><template #default="{ row }">{{ row.branchName || '总校' }}</template></el-table-column>
        <el-table-column label="状态" width="90" align="center"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'" effect="dark" round size="small">{{ row.status === 1 ? '正常' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column label="创建时间" width="120"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button :type="row.status === 1 ? 'warning' : 'success'" link @click="toggleStatus(row)">{{ row.status === 1 ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <EmptyState v-if="!loading && !list.length" text="暂无用户" />
    </SectionCard>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑用户' : '新增用户'" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="登录账号"><el-input v-model="form.username" :disabled="editing" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleKey" style="width: 100%"><el-option v-for="r in roleOpts" :key="r.value" :label="r.label" :value="r.value" /></el-select>
        </el-form-item>
        <el-form-item label="所属分校" v-if="form.roleKey !== 'admin'">
          <el-select v-model="form.branchId" :disabled="!auth.isHeadquarters" placeholder="选择分校" style="width: 100%">
            <el-option v-for="b in branches" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status" style="width: 100%"><el-option label="正常" :value="1" /><el-option label="停用" :value="0" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.acc { font-family: 'Bahnschrift', sans-serif; font-weight: 600; }
:deep(.no-padding) { padding: 0 !important; }
</style>
