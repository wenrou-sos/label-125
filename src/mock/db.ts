import type {
  Branch, Coach, Vehicle, Student, Schedule, ExamRecord, Payment, Salary,
  Maintenance, Review, Complaint, SysUser, Role, OperationLog, VehicleStatus,
  StudentStatus, PayMethod, ComplaintStatus, Notify,
} from '@/types'

// ===== 确定性随机 =====
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260621)
const rand = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const chance = (p: number) => rng() < p
const fmtDate = (d: Date) => d.toISOString().slice(0, 10)
const today = new Date('2026-06-21')
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const fmtMonth = (d: Date) => d.toISOString().slice(0, 7)
const daysBetween = (a: Date, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

// ===== 名字池 =====
const SURNAMES = '王李张刘陈杨黄赵周吴徐孙马朱胡郭林何高罗郑梁谢宋唐许韩冯邓曹彭'
const GIVEN_M = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超', '鹏', '辉', '刚', '建国', '志强', '建军', '海涛', '俊杰', '国庆', '宏伟']
const GIVEN_F = ['芳', '娜', '敏', '静', '丽', '艳', '娟', '婷', '燕', '雪', '梅', '玲', '桂花', '丽华', '淑芬', '玉兰', '晓敏', '佳怡', '梦瑶', '雨彤']
function makeName(gender: 1 | 2) {
  const s = SURNAMES[rand(0, SURNAMES.length - 1)]
  const g = gender === 1 ? pick(GIVEN_M) : pick(GIVEN_F)
  return s + g
}
function makePhone() {
  let p = pick(['138', '139', '150', '151', '152', '158', '159', '176', '186', '188'])
  for (let i = 0; i < 8; i++) p += rand(0, 9)
  return p
}

// ===== 角色 =====
export const roles: Role[] = [
  { id: 1, name: '总校管理员', key: 'admin', permissions: ['*'] },
  { id: 2, name: '分校管理员', key: 'branch', permissions: ['branch', 'coach', 'schedule', 'vehicle', 'finance', 'exam', 'system:log'] },
  { id: 3, name: '教练', key: 'coach', permissions: ['schedule:self', 'exam:self', 'coach:self'] },
]

// ===== 分校 =====
const BRANCH_DEFS = [
  ['京城总校', '北京市朝阳区建国路88号', '010-88880001', '周建国'],
  ['海淀分校', '北京市海淀区中关村大街27号', '010-88880002', '李慧敏'],
  ['朝阳东区分校', '北京市朝阳区青年路6号', '010-88880003', '赵海涛'],
  ['丰台分校', '北京市丰台区南三环西路16号', '010-88880004', '孙丽华'],
  ['通州分校', '北京市通州区新华大街21号', '010-88880005', '王志强'],
  ['昌平分校', '北京市昌平区政府街9号', '010-88880006', '陈国庆'],
  ['大兴分校', '北京市大兴区兴华大街3号', '010-88880007', '杨建军'],
  ['顺义分校', '北京市顺义区府前中街12号', '010-88880008', '黄玉兰'],
  ['石景山分校', '北京市石景山区八角西街5号', '010-88880009', '刘俊杰'],
  ['房山分校', '北京市房山区良乡拱辰大街18号', '010-88880010', '马晓敏'],
]
export const branches: Branch[] = BRANCH_DEFS.map((b, i) => ({
  id: i + 1,
  name: b[0],
  address: b[1],
  phone: b[2],
  manager: b[3],
  createdAt: fmtDate(addDays(today, -rand(400, 900))),
}))

// ===== 教练 =====
const CERT_LEVELS = ['初级教练员', '中级教练员', '高级教练员', '教练技师']
const SUBJECT_POOL = ['科目二', '科目三']
const AVATAR_COLORS = ['#0F5C4E', '#D97706', '#2563EB', '#7C3AED', '#0891B2', '#BE185D', '#15803D', '#B45309']
export const coaches: Coach[] = []
let coachSeq = 0
branches.forEach((br) => {
  const count = rand(6, 9)
  for (let i = 0; i < count; i++) {
    coachSeq++
    const gender: 1 | 2 = chance(0.72) ? 1 : 2
    const cert = pick(CERT_LEVELS)
    const subs = chance(0.6) ? ['科目二', '科目三'] : [pick(SUBJECT_POOL)]
    coaches.push({
      id: coachSeq,
      branchId: br.id,
      name: makeName(gender),
      phone: makePhone(),
      gender,
      avatarColor: pick(AVATAR_COLORS),
      certNo: 'JL' + (2015 + rand(0, 9)) + String(100000 + rand(0, 899999)),
      certLevel: cert,
      teachYears: rand(2, 18),
      subjects: subs,
      baseSalary: cert.includes('技师') ? 5500 : cert.includes('高级') ? 4800 : cert.includes('中级') ? 4200 : 3800,
      status: chance(0.96) ? 1 : 0,
      createdAt: fmtDate(addDays(today, -rand(200, 800))),
    })
  }
})

// ===== 车辆 =====
const VEHICLE_BRANDS = [
  ['大众', '捷达'], ['大众', '桑塔纳'], ['丰田', '卡罗拉'], ['比亚迪', '秦PLUS'],
  ['雪铁龙', '爱丽舍'], ['斯柯达', '明锐'], ['本田', '飞度'], ['日产', '轩逸'],
  ['现代', '伊兰特'], ['吉利', '帝豪'],
]
const PLATE_PREFIX = ['京A', '京B', '京C', '京Q', '京N']
export const vehicles: Vehicle[] = []
let vehSeq = 0
branches.forEach((br) => {
  const count = rand(7, 10)
  for (let i = 0; i < count; i++) {
    vehSeq++
    const [brand, model] = pick(VEHICLE_BRANDS)
    const plate = `${pick(PLATE_PREFIX)}${String.fromCharCode(65 + rand(0, 25))}${rand(1000, 9999)}`
    const purchase = addDays(today, -rand(120, 2200))
    // 让部分车辆年检/保险临近到期（30天内）
    const nearExpire = chance(0.22)
    const inspectionExpire = nearExpire ? addDays(today, rand(2, 28)) : addDays(today, rand(60, 360))
    const insuranceExpire = chance(0.18) ? addDays(today, rand(1, 25)) : addDays(today, rand(40, 380))
    const status: VehicleStatus = chance(0.08) ? 'repair' : chance(0.06) ? 'inspecting' : 'available'
    vehicles.push({
      id: vehSeq,
      branchId: br.id,
      plate,
      brand,
      model,
      purchaseDate: fmtDate(purchase),
      inspectionExpire: fmtDate(inspectionExpire),
      insuranceExpire: fmtDate(insuranceExpire),
      status,
      mileage: rand(15000, 180000),
    })
  }
})

// ===== 学员 =====
const STUDENT_STATUS_WEIGHTS: [StudentStatus, number][] = [
  ['enrolled', 0.12], ['training', 0.34], ['examining', 0.16], ['passed', 0.38],
]
function weightedStatus(): StudentStatus {
  const r = rng()
  let acc = 0
  for (const [s, w] of STUDENT_STATUS_WEIGHTS) {
    acc += w
    if (r < acc) return s
  }
  return 'training'
}
export const students: Student[] = []
let stuSeq = 0
branches.forEach((br) => {
  const branchCoaches = coaches.filter((c) => c.branchId === br.id && c.status === 1)
  const count = rand(80, 140)
  for (let i = 0; i < count; i++) {
    stuSeq++
    const gender: 1 | 2 = chance(0.55) ? 1 : 2
    const coach = pick(branchCoaches)
    students.push({
      id: stuSeq,
      branchId: br.id,
      coachId: coach.id,
      name: makeName(gender),
      phone: makePhone(),
      gender,
      enrollDate: fmtDate(addDays(today, -rand(10, 400))),
      status: weightedStatus(),
    })
  }
})

// ===== 考试记录（用于合格率统计）=====
// 为每位教练赋予一个技能水平，影响通过率
const coachSkill = new Map<number, number>()
coaches.forEach((c) => coachSkill.set(c.id, 0.6 + rng() * 0.32))

export const examRecords: ExamRecord[] = []
let examSeq = 0
const SUBJECT_LIST = ['科目一', '科目二', '科目三', '科目四']
const BATCHES = ['2026A', '2026B', '2026C', '2025D', '2025E']
students.forEach((s) => {
  const skill = coachSkill.get(s.coachId) ?? 0.75
  // 根据学员状态决定已参加的科目数量
  let taken = 0
  if (s.status === 'training') taken = rand(1, 2)
  else if (s.status === 'examining') taken = rand(2, 3)
  else if (s.status === 'passed') taken = 4
  else taken = rand(0, 1)
  // 最多补考一次，制造"一次性通过率"
  for (let i = 0; i < taken; i++) {
    const subject = SUBJECT_LIST[i]
    const examDate = addDays(today, -rand(5, 170))
    const passedOnce = chance(skill)
    examSeq++
    examRecords.push({
      id: examSeq,
      studentId: s.id,
      branchId: s.branchId,
      coachId: s.coachId,
      subject,
      examDate: fmtDate(examDate),
      batch: pick(BATCHES),
      passed: passedOnce ? 1 : 0,
    })
    // 未通过则补考一次（补考大概率通过，但补考记录不计入"一次性"）
    if (!passedOnce && chance(0.7)) {
      examSeq++
      examRecords.push({
        id: examSeq,
        studentId: s.id,
        branchId: s.branchId,
        coachId: s.coachId,
        subject,
        examDate: fmtDate(addDays(examDate, rand(10, 30))),
        batch: pick(BATCHES),
        passed: 1,
      })
    }
  }
})

// ===== 排班（近 45 天内）=====
const TIME_SLOTS = [
  ['07:00', '09:00'], ['09:10', '11:10'], ['13:30', '15:30'], ['15:40', '17:40'],
]
export const schedules: Schedule[] = []
let schSeq = 0
coaches.forEach((c) => {
  const branchVehicles = vehicles.filter((v) => v.branchId === c.branchId && v.status === 'available')
  const branchStudents = students.filter((s) => s.coachId === c.id && s.status !== 'passed')
  for (let d = 0; d < 45; d++) {
    const date = addDays(today, -d + 5)
    if (date.getDay() === 0) continue
    const slotsToday = rand(0, 3)
    for (let i = 0; i < slotsToday; i++) {
      if (!branchVehicles.length || !branchStudents.length) break
      const slot = TIME_SLOTS[i % TIME_SLOTS.length]
      schSeq++
      schedules.push({
        id: schSeq,
        coachId: c.id,
        vehicleId: pick(branchVehicles).id,
        studentId: pick(branchStudents).id,
        branchId: c.branchId,
        scheduleDate: fmtDate(date),
        startTime: slot[0],
        endTime: slot[1],
        subject: pick(c.subjects),
      })
    }
  }
})

// ===== 报名费收款 =====
export const payments: Payment[] = []
let paySeq = 0
students.forEach((s) => {
  paySeq++
  const methods: PayMethod[] = ['cash', 'wechat', 'alipay', 'card']
  const method = pick(methods)
  const confirmed = s.status !== 'enrolled' || chance(0.5)
  payments.push({
    id: paySeq,
    studentId: s.id,
    branchId: s.branchId,
    amount: pick([4200, 4500, 4800, 5200, 5600]),
    payMethod: method,
    status: confirmed ? 'confirmed' : 'pending',
    createdAt: fmtDate(addDays(new Date(s.enrollDate), 0)),
    confirmedAt: confirmed ? fmtDate(addDays(today, -rand(1, 60))) : null,
  })
})

// ===== 车辆保养记录 =====
export const maintenances: Maintenance[] = []
let mntSeq = 0
const MAINT_TYPES = ['常规保养', '更换轮胎', '更换刹车片', '机油更换', '年检保养', '空调维修', '离合器维修']
vehicles.forEach((v) => {
  const count = rand(1, 4)
  for (let i = 0; i < count; i++) {
    mntSeq++
    maintenances.push({
      id: mntSeq,
      vehicleId: v.id,
      maintainDate: fmtDate(addDays(today, -rand(20, 500))),
      type: pick(MAINT_TYPES),
      cost: pick([300, 480, 680, 880, 1200, 1800, 2400]),
      remark: '保养完成，车况良好',
    })
  }
})

// ===== 学员评价 =====
const REVIEW_TAGS = ['教学耐心', '讲解清晰', '准时守约', '态度温和', '技术专业', '通过率高', '注重细节', '责任心强', '经验丰富']
const REVIEW_CONTENTS = [
  '教练教学非常认真，每个动作都讲得很细，练车过程很放心。',
  '态度很好，从不发火，会反复指导直到学会为止。',
  '约课准时，科目二一次性通过，非常感谢教练！',
  '技术过硬，点位讲得清楚，推荐给大家。',
  '有时候稍微有点急，但总体还是负责任的。',
  '教学经验丰富，对考试要点把握很准。',
  '练车环境不错，教练指导到位，科三顺利通过。',
  '讲解细致，纠正动作很及时，进步很快。',
]
export const reviews: Review[] = []
let revSeq = 0
coaches.forEach((c) => {
  const branchStudents = students.filter((s) => s.coachId === c.id)
  const count = rand(3, 8)
  for (let i = 0; i < count; i++) {
    if (!branchStudents.length) break
    revSeq++
    const score = pick([3, 4, 4, 5, 5, 5])
    reviews.push({
      id: revSeq,
      coachId: c.id,
      studentId: pick(branchStudents).id,
      score,
      tags: [pick(REVIEW_TAGS), pick(REVIEW_TAGS)],
      content: pick(REVIEW_CONTENTS),
      createdAt: fmtDate(addDays(today, -rand(5, 200))),
    })
  }
})

// ===== 投诉记录 =====
const COMPLAINT_CONTENTS = [
  '教练在练车期间接听私人电话，影响教学。',
  '预约练车时间被临时调整，未提前通知。',
  '教练态度生硬，对学员提问表现出不耐烦。',
  '车辆空调制冷不足，多次反映未解决。',
  '练车时长未达约定标准。',
]
const COMPLAINT_RESULTS = [
  '已与教练谈话并提醒，承诺改进服务态度。',
  '已调整排班系统，提前24小时通知学员。',
  '已对车辆空调进行维修并通过验收。',
  '已补足练车时长并致歉，学员表示满意。',
]
export const complaints: Complaint[] = []
let cmpSeq = 0
coaches.forEach((c) => {
  const count = rand(0, 3)
  const branchStudents = students.filter((s) => s.coachId === c.id)
  for (let i = 0; i < count; i++) {
    cmpSeq++
    const status: ComplaintStatus = pick(['pending', 'processing', 'resolved', 'resolved'])
    complaints.push({
      id: cmpSeq,
      coachId: c.id,
      studentId: branchStudents.length ? pick(branchStudents).id : null,
      branchId: c.branchId,
      content: pick(COMPLAINT_CONTENTS),
      status,
      result: status === 'resolved' ? pick(COMPLAINT_RESULTS) : '',
      createdAt: fmtDate(addDays(today, -rand(3, 120))),
    })
  }
})

// ===== 系统用户 =====
export const sysUsers: SysUser[] = []
sysUsers.push({
  id: 1, username: 'admin', password: '123456', realName: '系统管理员',
  roleId: 1, roleKey: 'admin', branchId: null, status: 1, phone: '13800000001',
  createdAt: fmtDate(addDays(today, -800)),
})
branches.forEach((b, i) => {
  sysUsers.push({
    id: i + 2, username: `branch${b.id}`, password: '123456', realName: b.manager,
    roleId: 2, roleKey: 'branch', branchId: b.id, status: 1, phone: b.phone,
    createdAt: fmtDate(addDays(today, -rand(200, 700))),
  })
})
// 教练登录账号（取每分校第一位教练）
let coachUserSeq = branches.length + 2
coaches.forEach((c) => {
  if (c.id % 7 === 1) {
    sysUsers.push({
      id: coachUserSeq++, username: `coach${c.id}`, password: '123456', realName: c.name,
      roleId: 3, roleKey: 'coach', branchId: c.branchId, status: 1, phone: c.phone,
      createdAt: fmtDate(addDays(today, -rand(100, 500))),
    })
  }
})

// ===== 操作日志（种子）=====
const LOG_TEMPLATES = [
  ['教练管理', '新增', '新增教练档案'],
  ['车辆管理', '更新状态', '更新车辆状态'],
  ['排班管理', '新增', '新增带教时段'],
  ['财务管理', '确认收款', '确认报名费收款'],
  ['系统管理', '新增用户', '创建系统用户'],
  ['教练管理', '处理投诉', '处理学员投诉'],
  ['财务管理', '工资核算', '触发月度工资核算'],
  ['车辆管理', '新增保养', '新增车辆保养记录'],
]
export const operationLogs: OperationLog[] = []
for (let i = 0; i < 24; i++) {
  const u = pick(sysUsers)
  const t = pick(LOG_TEMPLATES)
  operationLogs.push({
    id: i + 1,
    userId: u.id,
    username: u.username,
    module: t[0],
    action: t[1],
    detail: t[2] + '（#' + rand(100, 999) + '）',
    createdAt: fmtDate(addDays(today, -rand(0, 30))) + ' ' +
      String(rand(8, 20)).padStart(2, '0') + ':' + String(rand(0, 59)).padStart(2, '0') + ':00',
  })
}

// ===== 工资（预生成近 3 个月）=====
export const salaries: Salary[] = []
let salSeq = 0
function computeSalary(c: Coach, month: string): Salary {
  const monthRecords = examRecords.filter((e) => e.coachId === c.id && e.examDate.slice(0, 7) === month)
  // 一次性通过率（仅取该科目首次记录）
  const firstAttempts = new Map<string, ExamRecord>()
  monthRecords.forEach((e) => {
    const key = e.studentId + '-' + e.subject
    if (!firstAttempts.has(key) || firstAttempts.get(key)!.examDate > e.examDate) {
      firstAttempts.set(key, e)
    }
  })
  const attempts = Array.from(firstAttempts.values())
  const passed = attempts.filter((e) => e.passed === 1).length
  const passRate = attempts.length ? passed / attempts.length : 0
  const studentCount = new Set(monthRecords.map((e) => e.studentId)).size
  // 课时费提成：本月排班数 * 35
  const monthSchedules = schedules.filter((s) => s.coachId === c.id && s.scheduleDate.slice(0, 7) === month).length
  const commission = Math.round(monthSchedules * 35)
  const passBonus = Math.round(passRate * 2000)
  const total = c.baseSalary + passBonus + commission
  return {
    id: salSeq++, coachId: c.id, branchId: c.branchId, month,
    baseSalary: c.baseSalary, passBonus, commission, total,
    status: 'draft', passRate: Math.round(passRate * 100), studentCount,
  }
}
const SALARY_MONTHS = [fmtMonth(addDays(today, -60)), fmtMonth(addDays(today, -30)), fmtMonth(today)]
coaches.filter((c) => c.status === 1).forEach((c) => {
  SALARY_MONTHS.forEach((m) => salaries.push(computeSalary(c, m)))
})

// ===== 查询辅助（必须在通知生成之前定义）=====
export const getBranch = (id: number) => branches.find((b) => b.id === id)
export const getCoach = (id: number) => coaches.find((c) => c.id === id)
export const getVehicle = (id: number) => vehicles.find((v) => v.id === id)
export const getStudent = (id: number) => students.find((s) => s.id === id)
export const getUser = (id: number) => sysUsers.find((u) => u.id === id)

// ===== 系统通知（从车辆、投诉、工资数据动态生成）=====
function makeTime(base: string, hMin: number, hMax: number) {
  return base + ' ' + String(rand(hMin, hMax)).padStart(2, '0') + ':' + String(rand(0, 59)).padStart(2, '0') + ':00'
}
function genNotifies(): Notify[] {
  const list: Notify[] = []
  let nid = 0
  // 车辆到期提醒（30天内）
  vehicles.forEach((v) => {
    const insDays = daysBetween(today, v.inspectionExpire)
    if (insDays <= 30) {
      nid++
      list.push({
        id: nid,
        type: 'vehicle',
        title: '车辆年检即将到期',
        content: `车牌 ${v.plate}（${getBranch(v.branchId)?.name}）将在 ${insDays} 天后到期，请及时安排年检`,
        link: '/vehicle/alert',
        read: chance(0.35) ? 1 : 0,
        createdAt: makeTime(fmtDate(addDays(today, -rand(0, 15))), 8, 18),
        branchId: v.branchId,
        sourceId: v.id,
      })
    }
    const insDays2 = daysBetween(today, v.insuranceExpire)
    if (insDays2 <= 30) {
      nid++
      list.push({
        id: nid,
        type: 'vehicle',
        title: '车辆保险即将到期',
        content: `车牌 ${v.plate}（${getBranch(v.branchId)?.name}）将在 ${insDays2} 天后到期，请及时续保`,
        link: '/vehicle/alert',
        read: chance(0.35) ? 1 : 0,
        createdAt: makeTime(fmtDate(addDays(today, -rand(0, 15))), 8, 18),
        branchId: v.branchId,
        sourceId: v.id,
      })
    }
  })
  // 投诉处理结果
  complaints.filter((c) => c.status === 'resolved').forEach((c) => {
    nid++
    list.push({
      id: nid,
      type: 'complaint',
      title: '投诉已处理完成',
      content: `针对教练 ${getCoach(c.coachId)?.name} 的投诉已处理：${c.result || '已妥善解决'}`,
      link: '/coach/complaint',
      read: chance(0.5) ? 1 : 0,
      createdAt: makeTime(fmtDate(addDays(today, -rand(1, 10))), 9, 17),
      branchId: c.branchId,
      sourceId: c.id,
    })
  })
  // 工资核算完成（总校可见）
  SALARY_MONTHS.forEach((m) => {
    nid++
    list.push({
      id: nid,
      type: 'salary',
      title: '月度工资核算完成',
      content: `${m} 工资已核算完成，共 ${coaches.filter((c) => c.status === 1).length} 名教练，请到工资核算页面查看并发放`,
      link: '/finance/salary',
      read: chance(0.6) ? 1 : 0,
      createdAt: makeTime(m + '-' + String(rand(1, 28)).padStart(2, '0'), 10, 20),
      sourceId: nid,
    })
  })
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  list.forEach((n, i) => { n.id = i + 1 })
  return list
}
export const notifies: Notify[] = genNotifies()

// ===== 新增通知（供投诉处理、工资核算等接口调用）=====
export function addNotify(notify: Omit<Notify, 'id' | 'read' | 'createdAt'> & { read?: 0 | 1; createdAt?: string }) {
  seq.notify++
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const full: Notify = {
    id: seq.notify,
    read: 0,
    createdAt: notify.createdAt || `${fmtDate(today)} ${hh}:${mm}:${ss}`,
    ...notify,
  }
  notifies.unshift(full)
  return full
}

// ===== 自增序列计数器 =====
export const seq = {
  coach: coaches.length,
  vehicle: vehicles.length,
  student: students.length,
  schedule: schedules.length,
  exam: examRecords.length,
  payment: payments.length,
  maintenance: maintenances.length,
  review: reviews.length,
  complaint: complaints.length,
  user: sysUsers.length,
  log: operationLogs.length,
  salary: salaries.length,
  notify: notifies.length,
}
