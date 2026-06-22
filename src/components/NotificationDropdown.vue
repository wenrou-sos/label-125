<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifyStore } from '@/stores/notify'
import { NOTIFY_TYPE_MAP, type Notify } from '@/types'
import { formatDate } from '@/utils/format'
import EmptyState from './EmptyState.vue'

const router = useRouter()
const notifyStore = useNotifyStore()

const visible = ref(false)

watch(visible, async (v) => {
  if (v) await notifyStore.load()
})

function getIcon(type: Notify['type']) {
  return NOTIFY_TYPE_MAP[type].icon
}
function getColor(type: Notify['type']) {
  return NOTIFY_TYPE_MAP[type].color
}
function getTypeLabel(type: Notify['type']) {
  return NOTIFY_TYPE_MAP[type].label
}

async function handleItemClick(n: Notify) {
  if (n.read === 0) await notifyStore.markRead(n.id)
  if (n.link) {
    visible.value = false
    router.push(n.link)
  }
}

async function handleMarkAll() {
  await notifyStore.markAllRead()
}
</script>

<template>
  <el-popover
    :model-value="visible"
    placement="bottom-end"
    :width="380"
    trigger="click"
    popper-class="notify-popover"
    :show-arrow="false"
    @update:model-value="(v: boolean) => (visible = v)"
  >
    <template #reference>
      <el-badge :value="notifyStore.unreadCount" :hidden="notifyStore.unreadCount === 0" :max="99" class="notify-badge">
        <el-button link class="notify-btn">
          <el-icon size="20"><Bell /></el-icon>
        </el-button>
      </el-badge>
    </template>

    <div class="notify-panel">
      <div class="notify-header">
        <span class="notify-title">通知中心</span>
        <el-button v-if="notifyStore.unreadCount > 0" type="primary" link size="small" @click="handleMarkAll">全部已读</el-button>
      </div>

      <el-scrollbar max-height="440px">
        <div v-if="notifyStore.list.length" class="notify-list">
          <div
            v-for="n in notifyStore.list"
            :key="n.id"
            class="notify-item"
            :class="{ unread: n.read === 0, read: n.read === 1 }"
            @click="handleItemClick(n)"
          >
            <div class="notify-icon" :style="{ background: getColor(n.type) + '15', color: getColor(n.type) }">
              <el-icon><component :is="getIcon(n.type)" /></el-icon>
            </div>
            <div class="notify-body">
              <div class="notify-top">
                <span class="notify-type" :style="{ color: getColor(n.type) }">{{ getTypeLabel(n.type) }}</span>
                <span class="notify-time">{{ formatDate(n.createdAt) }}</span>
              </div>
              <div class="notify-title-text">{{ n.title }}</div>
              <div class="notify-content">{{ n.content }}</div>
            </div>
            <div v-if="n.read === 0" class="notify-dot"></div>
          </div>
        </div>
        <EmptyState v-else text="暂无通知" />
      </el-scrollbar>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.notify-badge {
  display: inline-flex;
  :deep(.el-badge__content) {
    font-weight: 600;
  }
}
.notify-btn {
  color: var(--brand-ink);
  padding: 4px 8px;
}
.notify-panel {
  margin: -12px;
}
.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--brand-line);
}
.notify-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--brand-ink);
}
.notify-list {
  padding: 4px 0;
}
.notify-item {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  transition: background 0.15s ease;
  &:hover {
    background: rgba(15, 92, 78, 0.04);
  }
  &.read {
    opacity: 0.55;
    &:hover {
      opacity: 0.75;
    }
    .notify-title-text {
      font-weight: 500;
    }
  }
  &.unread {
    background: rgba(217, 119, 6, 0.04);
  }
}
.notify-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.notify-body {
  flex: 1;
  min-width: 0;
}
.notify-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.notify-type {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.notify-time {
  font-size: 11px;
  color: var(--brand-mute);
}
.notify-title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-ink);
  margin-bottom: 2px;
  line-height: 1.4;
}
.notify-content {
  font-size: 12px;
  color: var(--brand-mute);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notify-dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D97706;
  flex-shrink: 0;
}
</style>
