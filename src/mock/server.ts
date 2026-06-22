import type {
  ApiResponse, Branch, Coach, Vehicle, Schedule, Complaint, Payment, Salary,
  Maintenance, OperationLog, ExamRecord, Notify,
} from '@/types'
import * as db from './db'

// ===== 路由匹配 =====
type HandlerCtx = { params: Record<string, string>; query: Record<string, any>; body: any }
type Handler = (ctx: HandlerCtx) => any
const routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler }[] = []

function route(method: string, path: string, handler: Handler) {
  const keys: string[] = []
  const regex = path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)' })
  routes.push({ method: method.toUpperCase(), pattern: new RegExp('^' + regex + '$'), keys, handler })
}

// ===== 工具 =====
function ok<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data }
}
function fail(message: string): ApiResponse<never> {
  return { code: 500, message, data: null as never }
}
function toISODate(d: Date) { return d.toISOString().slice(0, 10) }
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

// 一次性通过率：取每个 (学员,科目) 的首条记录
function firstAttempts(records: ExamRecord[]): ExamRecord[] {
  const map = new Map<string, ExamRecord>()
  records.forEach((e) => {
    const key = e.studentId + '-' + e.subject
    const exist = map.get(key)
    if (!exist || e.examDate < exist.examDate) map.set(key, e)
  })
  return Array.from(map.values())
}
function rateOf(records: ExamRecord[]) {
  const first = firstAttempts(records)
  if (!first.length) return { rate: 0, passed: 0, total: 0 }
  const passed = first.filter((e) => e.passed === 1).length
  return { rate: Math.round((passed / first.length) * 1000) / 10, passed, total: first.length }
}

// 操作日志记录
function log(module: string, action: string, detail: string, username = 'admin') {
  const u = db.sysUsers.find((x) => x.username === username)
  db.seq.log++
  db.operationLogs.unshift({
    id: db.seq.log,
    userId: u?.id ?? 1,
    username,
    module, action, detail,
    createdAt: toISODate(new Date()) + ' ' + new Date().toTimeString().slice(0, 8),
  })
}

const now = () => new Date().toTimeString().slice(0, 8)
const todayISO = toISODate(new Date())

// ===================== 鉴权 =====================
route('POST', '/api/auth/login', ({ body }) => {
  const u = db.sysUsers.find((x) => x.username === body.username)
  if (!u || u.password !== body.password) return fail('账号或密码错误')
  if (u.status === 0) return fail('账号已停用')
  const role = db.roles.find((r) => r.id === u.roleId)!
  return ok({
    token: 'mock-token-' + u.id + '-' + Date.now(),
    user: { id: u.id, username: u.username, realName: u.realName, roleKey: u.roleKey, roleId: u.roleId, branchId: u.branchId, phone: u.phone },
    role: { name: role.name, key: role.key, permissions: role.permissions },
  })
})

// ===================== 工作台总览 =====================
route('GET', '/api/dashboard', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const inBranch = <T extends { branchId: number }>(arr: T[]) => branchId ? arr.filter((x) => x.branchId === branchId) : arr

  const studentCount = inBranch(db.students).length
  const coachCount = inBranch(db.coaches.filter((c) => c.status === 1)).length
  const vehicleCount = inBranch(db.vehicles).length
  const month = todayISO.slice(0, 7)
  const monthlyRevenue = inBranch(db.payments).filter((p) => p.status === 'confirmed' && p.confirmedAt?.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0)
  const pendingPayments = inBranch(db.payments).filter((p) => p.status === 'pending').length

  // 分校通过率排行（科二+科三合并）
  const branchRanking = db.branches.map((b) => {
    const recs = db.examRecords.filter((e) => e.branchId === b.id && (e.subject === '科目二' || e.subject === '科目三'))
    return { branchId: b.id, name: b.name, ...rateOf(recs) }
  }).sort((a, b) => b.rate - a.rate).slice(0, 8)

  // 车辆到期预警（30天内）
  const vehicleAlerts = inBranch(db.vehicles).filter((v) => {
    return daysBetween(todayISO, v.inspectionExpire) <= 30 || daysBetween(todayISO, v.insuranceExpire) <= 30
  }).map((v) => ({
    ...v,
    inspectionDays: daysBetween(todayISO, v.inspectionExpire),
    insuranceDays: daysBetween(todayISO, v.insuranceExpire),
  })).sort((a, b) => Math.min(a.inspectionDays, a.insuranceDays) - Math.min(b.inspectionDays, b.insuranceDays))

  // 营收趋势（近6个月）
  const revenueTrend: { month: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const m = d.toISOString().slice(0, 7)
    const rev = inBranch(db.payments).filter((p) => p.status === 'confirmed' && p.confirmedAt?.slice(0, 7) === m).reduce((s, p) => s + p.amount, 0)
    revenueTrend.push({ month: m, revenue: rev })
  }

  return ok({ kpis: { studentCount, coachCount, vehicleCount, monthlyRevenue, pendingPayments, vehicleAlerts: vehicleAlerts.length }, branchRanking, vehicleAlerts, revenueTrend })
})

// ===================== 分校管理 =====================
route('GET', '/api/branches', () => {
  const list = db.branches.map((b) => {
    const recs = db.examRecords.filter((e) => e.branchId === b.id)
    return {
      ...b,
      studentCount: db.students.filter((s) => s.branchId === b.id).length,
      coachCount: db.coaches.filter((c) => c.branchId === b.id && c.status === 1).length,
      vehicleCount: db.vehicles.filter((v) => v.branchId === b.id).length,
      ...rateOf(recs),
      revenue: db.payments.filter((p) => p.branchId === b.id && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0),
    }
  })
  return ok(list)
})

route('GET', '/api/branches/:id/dashboard', ({ params }) => {
  const id = Number(params.id)
  const branch = db.branches.find((b) => b.id === id)
  if (!branch) return fail('分校不存在')
  const recs = db.examRecords.filter((e) => e.branchId === id)
  const studentStatus = (['enrolled', 'training', 'examining', 'passed'] as const).map((k) => ({
    key: k, label: { enrolled: '已报名', training: '培训中', examining: '考试中', passed: '已通过' }[k],
    value: db.students.filter((s) => s.branchId === id && s.status === k).length,
  }))
  const vehicleStatus = (['available', 'repair', 'inspecting'] as const).map((k) => ({
    key: k, label: { available: '教学可用', repair: '故障维修', inspecting: '年检中' }[k],
    value: db.vehicles.filter((v) => v.branchId === id && v.status === k).length,
  }))
  // 近6个月通过率趋势（科二）
  const trend: { month: string; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const m = d.toISOString().slice(0, 7)
    trend.push({ month: m, rate: rateOf(recs.filter((e) => e.examDate.slice(0, 7) === m)).rate })
  }
  const coachCount = db.coaches.filter((c) => c.branchId === id && c.status === 1).length
  const vehicleCount = db.vehicles.filter((v) => v.branchId === id).length
  const revenue = db.payments.filter((p) => p.branchId === id && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)
  return ok({ branch, studentStatus, vehicleStatus, trend, coachCount, vehicleCount, revenue, ...rateOf(recs), studentCount: db.students.filter((s) => s.branchId === id).length })
})

route('GET', '/api/branches/ranking', ({ query }) => {
  const subject = query.subject as string | undefined
  const start = query.start as string | undefined
  const end = query.end as string | undefined
  const list = db.branches.map((b) => {
    let recs = db.examRecords.filter((e) => e.branchId === b.id)
    if (subject && subject !== 'all') recs = recs.filter((e) => e.subject === subject)
    if (start) recs = recs.filter((e) => e.examDate >= start)
    if (end) recs = recs.filter((e) => e.examDate <= end)
    return { branchId: b.id, name: b.name, ...rateOf(recs) }
  }).filter((x) => x.total > 0).sort((a, b) => b.rate - a.rate)
  return ok(list.map((x, i) => ({ rank: i + 1, ...x })))
})

// ===================== 教练管理 =====================
route('GET', '/api/coaches', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const keyword = query.keyword as string | undefined
  let list = db.coaches.slice()
  if (branchId) list = list.filter((c) => c.branchId === branchId)
  if (keyword) list = list.filter((c) => c.name.includes(keyword) || c.certNo.includes(keyword))
  // 附加统计
  return ok(list.map((c) => {
    const recs = db.examRecords.filter((e) => e.coachId === c.id)
    const r = rateOf(recs)
    const reviewsOf = db.reviews.filter((rv) => rv.coachId === c.id)
    const avgScore = reviewsOf.length ? Math.round((reviewsOf.reduce((s, rv) => s + rv.score, 0) / reviewsOf.length) * 10) / 10 : 0
    const studentCount = db.students.filter((s) => s.coachId === c.id).length
    const branch = db.branches.find((b) => b.id === c.branchId)
    return { ...c, branchName: branch?.name, passRate: r.rate, passTotal: r.total, avgScore, studentCount, reviewCount: reviewsOf.length, complaintCount: db.complaints.filter((cp) => cp.coachId === c.id).length }
  }))
})

route('POST', '/api/coaches', ({ body }) => {
  db.seq.coach++
  const c: Coach = {
    id: db.seq.coach, branchId: body.branchId, name: body.name, phone: body.phone,
    gender: body.gender, avatarColor: '#0F5C4E', certNo: body.certNo || 'JL' + Date.now(),
    certLevel: body.certLevel, teachYears: body.teachYears || 0, subjects: body.subjects || ['科目二'],
    baseSalary: body.baseSalary || 3800, status: 1, createdAt: todayISO,
  }
  db.coaches.push(c)
  log('教练管理', '新增', `新增教练档案 ${c.name}`)
  return ok(c)
})

route('PUT', '/api/coaches/:id', ({ params, body }) => {
  const c = db.coaches.find((x) => x.id === Number(params.id))
  if (!c) return fail('教练不存在')
  Object.assign(c, body)
  log('教练管理', '编辑', `编辑教练档案 ${c.name}`)
  return ok(c)
})

route('GET', '/api/coaches/ranking', ({ query }) => {
  const month = (query.month as string) || todayISO.slice(0, 7)
  const branchId = query.branchId ? Number(query.branchId) : null
  const sortBy = (query.sortBy as string) || 'passRate'
  let list = db.coaches.filter((c) => c.status === 1)
  if (branchId) list = list.filter((c) => c.branchId === branchId)
  const data = list.map((c) => {
    const recs = db.examRecords.filter((e) => e.coachId === c.id && e.examDate.slice(0, 7) === month)
    const r = rateOf(recs)
    const reviewsOf = db.reviews.filter((rv) => rv.coachId === c.id)
    const avgScore = reviewsOf.length ? Math.round((reviewsOf.reduce((s, rv) => s + rv.score, 0) / reviewsOf.length) * 10) / 10 : 0
    const branch = db.branches.find((b) => b.id === c.branchId)
    return {
      coachId: c.id, name: c.name, branchName: branch?.name, certLevel: c.certLevel,
      passRate: r.rate, passed: r.passed, total: r.total,
      studentCount: new Set(recs.map((e) => e.studentId)).size, avgScore, teachYears: c.teachYears,
    }
  }).filter((x) => x.total > 0)
  data.sort((a, b) => {
    if (sortBy === 'studentCount') return b.studentCount - a.studentCount
    if (sortBy === 'avgScore') return b.avgScore - a.avgScore
    return b.passRate - a.passRate
  })
  return ok(data.map((x, i) => ({ rank: i + 1, ...x })))
})

route('GET', '/api/coaches/:id/reviews', ({ params }) => {
  const id = Number(params.id)
  const list = db.reviews.filter((r) => r.coachId === id).map((r) => ({
    ...r, studentName: db.getStudent(r.studentId)?.name || '学员',
  }))
  const avg = list.length ? Math.round((list.reduce((s, r) => s + r.score, 0) / list.length) * 10) / 10 : 0
  const coach = db.getCoach(id)
  return ok({ coachName: coach?.name, avgScore: avg, total: list.length, list })
})

route('GET', '/api/coaches/:id/complaints', ({ params }) => {
  const id = Number(params.id)
  return ok(db.complaints.filter((c) => c.coachId === id).map((c) => ({
    ...c, studentName: c.studentId ? db.getStudent(c.studentId)?.name : '匿名',
  })))
})

route('GET', '/api/complaints', ({ query }) => {
  const status = query.status as string | undefined
  const branchId = query.branchId ? Number(query.branchId) : null
  let list = db.complaints.slice()
  if (status && status !== 'all') list = list.filter((c) => c.status === status)
  if (branchId) list = list.filter((c) => c.branchId === branchId)
  return ok(list.map((c) => ({
    ...c, coachName: db.getCoach(c.coachId)?.name || '-', studentName: c.studentId ? db.getStudent(c.studentId)?.name : '匿名',
    branchName: db.getBranch(c.branchId)?.name,
  })))
})

route('POST', '/api/complaints/:id/resolve', ({ params, body }) => {
  const c = db.complaints.find((x) => x.id === Number(params.id))
  if (!c) return fail('投诉不存在')
  c.status = body.status || 'resolved'
  c.result = body.result || ''
  log('教练管理', '处理投诉', `处理投诉 #${c.id}`)
  db.addNotify({
    type: 'complaint',
    title: '投诉已处理完成',
    content: `针对教练 ${db.getCoach(c.coachId)?.name} 的投诉已处理：${c.result || '已妥善解决'}`,
    link: '/coach/complaint',
    branchId: c.branchId,
    sourceId: c.id,
  })
  return ok(c)
})

route('POST', '/api/complaints', ({ body }) => {
  db.seq.complaint++
  const c: Complaint = {
    id: db.seq.complaint, coachId: body.coachId, studentId: body.studentId || null,
    branchId: db.getCoach(body.coachId)?.branchId || 0, content: body.content,
    status: 'pending', result: '', createdAt: todayISO + ' ' + now(),
  }
  db.complaints.unshift(c)
  log('教练管理', '新增投诉', `新增投诉记录 #${c.id}`)
  return ok(c)
})

// ===================== 学员管理 =====================
route('GET', '/api/students', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const status = query.status as string | undefined
  const keyword = query.keyword as string | undefined
  let list = db.students.slice()
  if (branchId) list = list.filter((s) => s.branchId === branchId)
  if (status && status !== 'all') list = list.filter((s) => s.status === status)
  if (keyword) list = list.filter((s) => s.name.includes(keyword) || s.phone.includes(keyword))
  return ok(list.map((s) => ({
    ...s,
    branchName: db.getBranch(s.branchId)?.name,
    coachName: db.getCoach(s.coachId)?.name,
  })))
})

route('GET', '/api/students/:id', ({ params }) => {
  const id = Number(params.id)
  const s = db.getStudent(id)
  if (!s) return fail('学员不存在')
  const exams = db.examRecords
    .filter((e) => e.studentId === id)
    .sort((a, b) => b.examDate.localeCompare(a.examDate))
  const payments = db.payments
    .filter((p) => p.studentId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return ok({
    ...s,
    branchName: db.getBranch(s.branchId)?.name,
    coachName: db.getCoach(s.coachId)?.name,
    exams,
    payments,
  })
})

// ===================== 排班管理 =====================
route('GET', '/api/schedules', ({ query }) => {
  const coachId = query.coachId ? Number(query.coachId) : null
  const start = query.start as string | undefined
  const end = query.end as string | undefined
  const branchId = query.branchId ? Number(query.branchId) : null
  let list = db.schedules.slice()
  if (coachId) list = list.filter((s) => s.coachId === coachId)
  if (branchId) list = list.filter((s) => s.branchId === branchId)
  if (start) list = list.filter((s) => s.scheduleDate >= start)
  if (end) list = list.filter((s) => s.scheduleDate <= end)
  return ok(list.map((s) => ({
    ...s, coachName: db.getCoach(s.coachId)?.name, studentName: db.getStudent(s.studentId)?.name,
    vehiclePlate: db.getVehicle(s.vehicleId)?.plate,
  })))
})

route('GET', '/api/schedules/check', ({ query }) => {
  const { coachId, studentId, date, startTime, endTime, excludeId } = query
  const coachConflict = db.schedules.find((s) =>
    s.id !== Number(excludeId || 0) && s.coachId === Number(coachId) && s.scheduleDate === date &&
    !(endTime <= s.startTime || startTime >= s.endTime))
  const studentConflict = db.schedules.find((s) =>
    s.id !== Number(excludeId || 0) && s.studentId === Number(studentId) && s.scheduleDate === date &&
    !(endTime <= s.startTime || startTime >= s.endTime))
  return ok({
    hasConflict: !!(coachConflict || studentConflict),
    coachConflict: coachConflict ? { id: coachConflict.id, startTime: coachConflict.startTime, endTime: coachConflict.endTime } : null,
    studentConflict: studentConflict ? { id: studentConflict.id, startTime: studentConflict.startTime, endTime: studentConflict.endTime } : null,
  })
})

route('POST', '/api/schedules', ({ body }) => {
  if (!body.force) {
    const check = db.schedules.find((s) =>
      s.coachId === body.coachId && s.scheduleDate === body.scheduleDate &&
      !(body.endTime <= s.startTime || body.startTime >= s.endTime))
    const sCheck = db.schedules.find((s) =>
      s.studentId === body.studentId && s.scheduleDate === body.scheduleDate &&
      !(body.endTime <= s.startTime || body.startTime >= s.endTime))
    if (check) return fail(`教练该时段已有安排（${check.startTime}-${check.endTime}），请调整时间`)
    if (sCheck) return fail(`学员该时段已有安排（${sCheck.startTime}-${sCheck.endTime}），请调整时间`)
  }
  db.seq.schedule++
  const sch: Schedule = {
    id: db.seq.schedule, coachId: body.coachId, vehicleId: body.vehicleId, studentId: body.studentId,
    branchId: db.getCoach(body.coachId)?.branchId || 0, scheduleDate: body.scheduleDate,
    startTime: body.startTime, endTime: body.endTime, subject: body.subject,
  }
  db.schedules.push(sch)
  log('排班管理', '新增', `新增带教时段 ${db.getCoach(body.coachId)?.name} ${body.scheduleDate}`)
  return ok(sch)
})

route('POST', '/api/schedules/import', ({ body }) => {
  let added = 0
  body.list.forEach((item: any) => {
    const conflict = db.schedules.find((s) => s.coachId === item.coachId && s.scheduleDate === item.scheduleDate && !(item.endTime <= s.startTime || item.startTime >= s.endTime))
    if (conflict) return
    db.seq.schedule++
    db.schedules.push({
      id: db.seq.schedule, coachId: item.coachId, vehicleId: item.vehicleId, studentId: item.studentId,
      branchId: db.getCoach(item.coachId)?.branchId || 0, scheduleDate: item.scheduleDate,
      startTime: item.startTime, endTime: item.endTime, subject: item.subject,
    })
    added++
  })
  log('排班管理', '批量导入', `批量导入排班 ${added} 条`)
  return ok({ added, total: body.list.length })
})

route('DELETE', '/api/schedules/:id', ({ params }) => {
  const idx = db.schedules.findIndex((s) => s.id === Number(params.id))
  if (idx < 0) return fail('排班不存在')
  db.schedules.splice(idx, 1)
  log('排班管理', '删除', `删除带教时段 #${params.id}`)
  return ok({ id: Number(params.id) })
})

// ===================== 车辆管理 =====================
route('GET', '/api/vehicles', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const status = query.status as string | undefined
  const keyword = (query.keyword as string | undefined)?.trim()
  let list = db.vehicles.slice()
  if (branchId) list = list.filter((v) => v.branchId === branchId)
  if (status && status !== 'all') list = list.filter((v) => v.status === status)
  if (keyword) list = list.filter((v) => v.plate.includes(keyword) || v.brand.includes(keyword) || v.model.includes(keyword))
  return ok(list.map((v) => ({
    ...v, branchName: db.getBranch(v.branchId)?.name,
    inspectionDays: daysBetween(todayISO, v.inspectionExpire),
    insuranceDays: daysBetween(todayISO, v.insuranceExpire),
  })))
})

route('PUT', '/api/vehicles/:id/status', ({ params, body }) => {
  const v = db.vehicles.find((x) => x.id === Number(params.id)) as Vehicle | undefined
  if (!v) return fail('车辆不存在')
  v.status = body.status
  log('车辆管理', '更新状态', `更新车辆状态 ${v.plate} -> ${body.status}`)
  return ok(v)
})

route('GET', '/api/vehicles/:id/maintenance', ({ params }) => {
  const id = Number(params.id)
  return ok(db.maintenances.filter((m) => m.vehicleId === id).sort((a, b) => b.maintainDate.localeCompare(a.maintainDate)))
})

route('POST', '/api/vehicles/maintenance', ({ body }) => {
  db.seq.maintenance++
  const m: Maintenance = {
    id: db.seq.maintenance, vehicleId: body.vehicleId, maintainDate: body.maintainDate || todayISO,
    type: body.type, cost: body.cost || 0, remark: body.remark || '',
  }
  db.maintenances.push(m)
  log('车辆管理', '新增保养', `新增车辆保养记录 #${m.id}`)
  return ok(m)
})

route('GET', '/api/vehicles/alerts', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  let list = db.vehicles.slice()
  if (branchId) list = list.filter((v) => v.branchId === branchId)
  const alerts = list.map((v) => ({
    ...v, branchName: db.getBranch(v.branchId)?.name,
    inspectionDays: daysBetween(todayISO, v.inspectionExpire),
    insuranceDays: daysBetween(todayISO, v.insuranceExpire),
  })).filter((v) => v.inspectionDays <= 30 || v.insuranceDays <= 30)
  alerts.sort((a, b) => Math.min(a.inspectionDays, a.insuranceDays) - Math.min(b.inspectionDays, b.insuranceDays))
  return ok(alerts)
})

// ===================== 财务管理 =====================
route('GET', '/api/finance/payments', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const status = query.status as string | undefined
  const keyword = (query.keyword as string | undefined)?.trim()
  let list = db.payments.slice()
  if (branchId) list = list.filter((p) => p.branchId === branchId)
  if (status && status !== 'all') list = list.filter((p) => p.status === status)
  return ok(list.map((p) => ({
    ...p, studentName: db.getStudent(p.studentId)?.name || '-', branchName: db.getBranch(p.branchId)?.name,
  })).filter((p) => !keyword || p.studentName.includes(keyword)))
})

route('POST', '/api/finance/payments/:id/confirm', ({ params, body }) => {
  const p = db.payments.find((x) => x.id === Number(params.id))
  if (!p) return fail('收款记录不存在')
  p.status = 'confirmed'
  p.payMethod = body.payMethod || p.payMethod
  p.confirmedAt = todayISO + ' ' + now()
  log('财务管理', '确认收款', `确认报名费收款 #${p.id}`)
  return ok(p)
})

route('GET', '/api/finance/salary', ({ query }) => {
  const month = (query.month as string) || todayISO.slice(0, 7)
  const branchId = query.branchId ? Number(query.branchId) : null
  let list = db.salaries.filter((s) => s.month === month)
  if (branchId) list = list.filter((s) => s.branchId === branchId)
  return ok(list.map((s) => ({
    ...s, coachName: db.getCoach(s.coachId)?.name, branchName: db.getBranch(s.branchId)?.name,
  })))
})

route('POST', '/api/finance/salary/calculate', ({ body }) => {
  const month = (body.month as string) || todayISO.slice(0, 7)
  // 重新计算本月所有教练工资
  db.coaches.filter((c) => c.status === 1).forEach((c) => {
    const exist = db.salaries.find((s) => s.coachId === c.id && s.month === month)
    const recs = db.examRecords.filter((e) => e.coachId === c.id && e.examDate.slice(0, 7) === month)
    const first = firstAttempts(recs)
    const passed = first.filter((e) => e.passed === 1).length
    const passRate = first.length ? passed / first.length : 0
    const studentCount = new Set(recs.map((e) => e.studentId)).size
    const monthSchedules = db.schedules.filter((s) => s.coachId === c.id && s.scheduleDate.slice(0, 7) === month).length
    const commission = Math.round(monthSchedules * 35)
    const passBonus = Math.round(passRate * 2000)
    const total = c.baseSalary + passBonus + commission
    if (exist) {
      exist.passBonus = passBonus; exist.commission = commission; exist.total = total
      exist.passRate = Math.round(passRate * 100); exist.studentCount = studentCount
    } else {
      db.seq.salary++
      db.salaries.push({
        id: db.seq.salary, coachId: c.id, branchId: c.branchId, month, baseSalary: c.baseSalary,
        passBonus, commission, total, status: 'draft', passRate: Math.round(passRate * 100), studentCount,
      })
    }
  })
  log('财务管理', '工资核算', `触发 ${month} 工资核算`)
  const coachCount = db.salaries.filter((s) => s.month === month).length
  db.addNotify({
    type: 'salary',
    title: '月度工资核算完成',
    content: `${month} 工资已核算完成，共 ${coachCount} 名教练，请到工资核算页面查看并发放`,
    link: '/finance/salary',
  })
  return ok({ month, count: coachCount })
})

route('GET', '/api/finance/revenue', ({ query }) => {
  const months = Number(query.months) || 6
  const result: any[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const m = d.toISOString().slice(0, 7)
    const byBranch = db.branches.map((b) => ({
      branchId: b.id, name: b.name,
      revenue: db.payments.filter((p) => p.branchId === b.id && p.status === 'confirmed' && p.confirmedAt?.slice(0, 7) === m).reduce((s, p) => s + p.amount, 0),
    }))
    result.push({ month: m, branches: byBranch, total: byBranch.reduce((s, x) => s + x.revenue, 0) })
  }
  return ok(result)
})

// ===================== 考试合格率统计 =====================
route('GET', '/api/exam/branch-ranking', ({ query }) => {
  const subject = query.subject as string
  const start = query.start as string | undefined
  const end = query.end as string | undefined
  const batch = query.batch as string | undefined
  const list = db.branches.map((b) => {
    let recs = db.examRecords.filter((e) => e.branchId === b.id && e.subject === subject)
    if (start) recs = recs.filter((e) => e.examDate >= start)
    if (end) recs = recs.filter((e) => e.examDate <= end)
    if (batch && batch !== 'all') recs = recs.filter((e) => e.batch === batch)
    return { branchId: b.id, name: b.name, ...rateOf(recs) }
  }).filter((x) => x.total > 0).sort((a, b) => b.rate - a.rate)
  return ok(list.map((x, i) => ({ rank: i + 1, ...x })))
})

route('GET', '/api/exam/coach-ranking', ({ query }) => {
  const subject = query.subject as string
  const start = query.start as string | undefined
  const end = query.end as string | undefined
  const batch = query.batch as string | undefined
  const branchId = query.branchId ? Number(query.branchId) : null
  let coaches = db.coaches.filter((c) => c.status === 1)
  if (branchId) coaches = coaches.filter((c) => c.branchId === branchId)
  const list = coaches.map((c) => {
    let recs = db.examRecords.filter((e) => e.coachId === c.id && e.subject === subject)
    if (start) recs = recs.filter((e) => e.examDate >= start)
    if (end) recs = recs.filter((e) => e.examDate <= end)
    if (batch && batch !== 'all') recs = recs.filter((e) => e.batch === batch)
    return { coachId: c.id, name: c.name, branchName: db.getBranch(c.branchId)?.name, ...rateOf(recs) }
  }).filter((x) => x.total > 0).sort((a, b) => b.rate - a.rate)
  return ok(list.map((x, i) => ({ rank: i + 1, ...x })))
})

// ===================== 系统管理 =====================
route('GET', '/api/system/users', () => {
  return ok(db.sysUsers.map((u) => ({
    ...u, roleName: db.roles.find((r) => r.id === u.roleId)?.name, branchName: u.branchId ? db.getBranch(u.branchId)?.name : '-',
  })))
})

route('POST', '/api/system/users', ({ body }) => {
  if (db.sysUsers.some((u) => u.username === body.username)) return fail('用户名已存在')
  db.seq.user++
  const u = {
    id: db.seq.user, username: body.username, password: body.password || '123456',
    realName: body.realName, roleId: body.roleId, roleKey: body.roleKey,
    branchId: body.branchId || null, status: body.status !== undefined ? body.status as 1 | 0 : 1, phone: body.phone || '', createdAt: todayISO,
  }
  db.sysUsers.push(u)
  log('系统管理', '新增用户', `新增用户 ${u.username}`)
  return ok(u)
})

route('PUT', '/api/system/users/:id', ({ params, body }) => {
  const u = db.sysUsers.find((x) => x.id === Number(params.id))
  if (!u) return fail('用户不存在')
  Object.assign(u, body)
  log('系统管理', '编辑用户', `编辑用户 ${u.username}`)
  return ok(u)
})

route('GET', '/api/system/logs', ({ query }) => {
  const module = query.module as string | undefined
  let list = db.operationLogs.slice()
  if (module && module !== 'all') list = list.filter((l) => l.module === module)
  return ok(list)
})

// ===================== 系统通知 =====================
route('GET', '/api/notifies', ({ query }) => {
  const branchId = query.branchId ? Number(query.branchId) : null
  const onlyUnread = query.unread === '1'
  let list = db.notifies.slice()
  if (branchId) {
    list = list.filter((n) => {
      if (n.type === 'salary') return true
      return n.branchId === undefined || n.branchId === branchId
    })
  }
  if (onlyUnread) list = list.filter((n) => n.read === 0)
  return ok(list)
})

route('POST', '/api/notifies/:id/read', ({ params }) => {
  const id = Number(params.id)
  const n = db.notifies.find((x) => x.id === id)
  if (!n) return fail('通知不存在')
  n.read = 1
  return ok(n)
})

route('POST', '/api/notifies/read-all', () => {
  db.notifies.forEach((n) => { n.read = 1 })
  return ok({ count: db.notifies.length })
})

// ===================== 派发 =====================
export async function dispatch(method: string, path: string, opts: { query?: any; body?: any } = {}): Promise<ApiResponse<any>> {
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 120))
  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue
    const m = r.pattern.exec(path)
    if (!m) continue
    const params: Record<string, string> = {}
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) })
    try {
      const data = r.handler({ params, query: opts.query || {}, body: opts.body || {} })
      if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
        return data as ApiResponse<any>
      }
      return ok(data)
    } catch (e: any) {
      return fail(e.message || '服务异常')
    }
  }
  return fail('接口不存在: ' + method + ' ' + path)
}
