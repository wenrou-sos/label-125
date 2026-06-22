<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { CoachRow } from '@/api'
import { formatPercent, rateColor } from '@/utils/format'

const props = defineProps<{ coach: CoachRow }>()
const router = useRouter()
const emit = defineEmits<{ (e: 'edit', coach: CoachRow): void }>()
</script>

<template>
  <div class="coach-card section-card hover-rise">
    <div class="card-top">
      <div class="avatar" :style="{ background: coach.avatarColor }">{{ coach.name.charAt(0) }}</div>
      <div class="info">
        <div class="name-row">
          <span class="name">{{ coach.name }}</span>
          <el-tag size="small" effect="plain" type="warning" round>{{ coach.certLevel }}</el-tag>
        </div>
        <div class="sub">{{ coach.branchName }} · 执教 {{ coach.teachYears }} 年</div>
        <div class="tags">
          <el-tag v-for="s in coach.subjects" :key="s" size="small" effect="light">{{ s }}</el-tag>
        </div>
      </div>
    </div>
    <div class="card-stats">
      <div class="stat">
        <div class="s-label">通过率</div>
        <div class="s-value font-num" :style="{ color: rateColor(coach.passRate) }">{{ formatPercent(coach.passRate) }}</div>
      </div>
      <div class="stat">
        <div class="s-label">带教学员</div>
        <div class="s-value font-num">{{ coach.studentCount }}</div>
      </div>
      <div class="stat">
        <div class="s-label">评分</div>
        <div class="s-value font-num">{{ coach.avgScore || '-' }}</div>
      </div>
    </div>
    <div class="rating-row" v-if="coach.avgScore">
      <el-rate :model-value="coach.avgScore" disabled size="small" />
      <span class="review-count">{{ coach.reviewCount }} 条评价</span>
    </div>
    <div class="card-foot">
      <el-button text type="primary" size="small" @click="router.push(`/coach/review?coachId=${coach.id}`)">评价</el-button>
      <el-button text type="warning" size="small" @click="router.push(`/coach/complaint?coachId=${coach.id}`)">投诉 ({{ coach.complaintCount }})</el-button>
      <el-button text size="small" @click="emit('edit', coach)">编辑</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.coach-card { padding: 18px; display: flex; flex-direction: column; gap: 14px; height: 100%; }
.card-top { display: flex; gap: 12px; }
.avatar { width: 48px; height: 48px; border-radius: 12px; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; flex-shrink: 0; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.name { font-weight: 700; font-size: 16px; color: var(--brand-ink); }
.sub { font-size: 12px; color: var(--brand-mute); margin: 4px 0; }
.tags { display: flex; gap: 4px; flex-wrap: wrap; }
.card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 0; border-top: 1px dashed var(--brand-line); border-bottom: 1px dashed var(--brand-line); }
.stat { text-align: center; }
.s-label { font-size: 11px; color: var(--brand-mute); }
.s-value { font-size: 18px; font-weight: 700; margin-top: 2px; }
.rating-row { display: flex; align-items: center; gap: 8px; }
.review-count { font-size: 12px; color: var(--brand-mute); }
.card-foot { display: flex; gap: 4px; border-top: 1px solid var(--brand-line); padding-top: 10px; margin-top: auto; }
</style>
