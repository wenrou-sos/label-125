export function formatMoney(n: number): string {
  return '¥' + (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatMoneyShort(n: number): string {
  if (n >= 10000) return '¥' + (n / 10000).toFixed(2) + '万'
  return '¥' + (n || 0).toLocaleString('zh-CN')
}

export function formatPercent(n: number): string {
  return (n || 0).toFixed(1) + '%'
}

export function formatDate(str?: string): string {
  if (!str) return '-'
  return str.slice(0, 10)
}

export function daysLabel(days: number): string {
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  return `剩余 ${days} 天`
}

export function urgencyType(days: number): string {
  if (days <= 0) return 'danger'
  if (days <= 7) return 'danger'
  if (days <= 15) return 'warning'
  return 'info'
}

export function rateColor(rate: number): string {
  if (rate >= 85) return '#16A34A'
  if (rate >= 70) return '#0F5C4E'
  if (rate >= 60) return '#D97706'
  return '#DC2626'
}

export function rankColor(rank: number): string {
  if (rank === 1) return '#D97706'
  if (rank === 2) return '#9CA3AF'
  if (rank === 3) return '#B45309'
  return '#6B7A74'
}
