<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { coachApi, type CoachRow } from '@/api'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate } from '@/utils/format'

const route = useRoute()
const coaches = ref<CoachRow[]>([])
const data = ref<{ coachName: string; avgScore: number; total: number; list: any[] } | null>(null)
const selectedId = ref<number | undefined>(undefined)
const loading = ref(true)

async function loadCoaches() {
  coaches.value = await coachApi.list({})
  if (route.query.coachId) selectedId.value = Number(route.query.coachId)
  else if (coaches.value.length) selectedId.value = coaches.value[0].id
  await loadReviews()
}
async function loadReviews() {
  if (!selectedId.value) return
  loading.value = true
  try {
    data.value = await coachApi.reviews(selectedId.value)
  } finally {
    loading.value = false
  }
}
onMounted(loadCoaches)

const tagColors: Record<string, string> = { 好评: 'success', 中评: 'info', 差评: 'danger' }
</script>

<template>
  <div class="page-wrapper">
    <PageHeader title="教练评价" subtitle="查看学员对教练的评价平均分及详细评价内容">
      <template #actions>
        <el-select v-model="selectedId" filterable placeholder="选择教练" style="width: 220px" @change="loadReviews">
          <el-option v-for="c in coaches" :key="c.id" :label="c.name + '（' + c.branchName + '）'" :value="c.id" />
        </el-select>
      </template>
    </PageHeader>

    <SectionCard class="summary-card" bodyClass="summary-body" v-loading="loading">
      <div class="score-big">
        <div class="score-value font-num">{{ data?.avgScore?.toFixed(1) || '-' }}</div>
        <el-rate :model-value="data?.avgScore || 0" disabled size="large" />
        <div class="score-total">共 {{ data?.total ?? 0 }} 条评价</div>
      </div>
      <div class="coach-name">{{ data?.coachName }}</div>
    </SectionCard>

    <SectionCard title="评价列表" icon="ChatLineSquare">
      <div v-loading="loading">
        <div v-if="data?.list?.length" class="review-list">
          <div v-for="r in data.list" :key="r.id" class="review-item">
            <div class="review-head">
              <div class="stu">{{ r.studentName }}</div>
              <el-rate :model-value="r.score" disabled size="small" />
              <el-tag v-for="t in r.tags" :key="t" :type="tagColors[t] || 'primary'" size="small" effect="light">{{ t }}</el-tag>
              <span class="date">{{ formatDate(r.createdAt) }}</span>
            </div>
            <div class="review-content">{{ r.content }}</div>
          </div>
        </div>
        <EmptyState v-else text="该教练暂无评价" />
      </div>
    </SectionCard>
  </div>
</template>

<style scoped lang="scss">
.summary-card { background: linear-gradient(135deg, #0F5C4E, #0a3a31); border: none; }
:deep(.summary-body) { display: flex; align-items: center; justify-content: space-between; color: #f6f4ee; }
.score-big { display: flex; align-items: center; gap: 16px; }
.score-value { font-size: 48px; font-weight: 700; line-height: 1; }
.score-total { font-size: 13px; opacity: 0.8; }
.coach-name { font-size: 20px; font-weight: 700; }
.review-list { display: flex; flex-direction: column; gap: 12px; }
.review-item { padding: 14px; background: var(--brand-canvas); border-radius: 10px; border: 1px solid var(--brand-line); }
.review-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.stu { font-weight: 600; color: var(--brand-ink); }
.date { margin-left: auto; font-size: 12px; color: var(--brand-mute); }
.review-content { margin-top: 8px; color: var(--brand-ink); line-height: 1.6; font-size: 14px; }
</style>
