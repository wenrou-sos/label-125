// ===== 角色与权限 =====
export type RoleKey = 'admin' | 'branch' | 'coach'

export interface Role {
  id: number
  name: string
  key: RoleKey
  permissions: string[]
}

export interface SysUser {
  id: number
  username: string
  password: string
  realName: string
  roleId: number
  roleKey: RoleKey
  branchId: number | null
  status: 1 | 0
  phone?: string
  createdAt: string
}

// ===== 分校 =====
export interface Branch {
  id: number
  name: string
  address: string
  phone: string
  manager: string
  createdAt: string
}

// ===== 教练 =====
export interface Coach {
  id: number
  branchId: number
  name: string
  phone: string
  gender: 1 | 2
  avatarColor: string
  certNo: string
  certLevel: string
  teachYears: number
  subjects: string[]
  baseSalary: number
  status: 1 | 0
  createdAt: string
}

// ===== 车辆 =====
export type VehicleStatus = 'available' | 'repair' | 'inspecting'

export interface Vehicle {
  id: number
  branchId: number
  plate: string
  brand: string
  model: string
  purchaseDate: string
  inspectionExpire: string
  insuranceExpire: string
  status: VehicleStatus
  mileage: number
}

// ===== 学员 =====
export type StudentStatus = 'enrolled' | 'training' | 'examining' | 'passed'

export interface Student {
  id: number
  branchId: number
  coachId: number
  name: string
  phone: string
  gender: 1 | 2
  enrollDate: string
  status: StudentStatus
}

// ===== 排班 =====
export interface Schedule {
  id: number
  coachId: number
  vehicleId: number
  studentId: number
  branchId: number
  scheduleDate: string
  startTime: string
  endTime: string
  subject: string
}

// ===== 考试记录 =====
export interface ExamRecord {
  id: number
  studentId: number
  branchId: number
  coachId: number
  subject: string
  examDate: string
  batch: string
  passed: 0 | 1
}

// ===== 报名费收款 =====
export type PayMethod = 'cash' | 'wechat' | 'alipay' | 'card'

export interface Payment {
  id: number
  studentId: number
  branchId: number
  amount: number
  payMethod: PayMethod
  status: 'pending' | 'confirmed'
  createdAt: string
  confirmedAt: string | null
}

// ===== 工资 =====
export interface Salary {
  id: number
  coachId: number
  branchId: number
  month: string
  baseSalary: number
  passBonus: number
  commission: number
  total: number
  status: 'draft' | 'confirmed'
  passRate: number
  studentCount: number
}

// ===== 保养记录 =====
export interface Maintenance {
  id: number
  vehicleId: number
  maintainDate: string
  type: string
  cost: number
  remark: string
}

// ===== 学员评价 =====
export interface Review {
  id: number
  coachId: number
  studentId: number
  score: number
  tags: string[]
  content: string
  createdAt: string
}

// ===== 投诉记录 =====
export type ComplaintStatus = 'pending' | 'processing' | 'resolved'

export interface Complaint {
  id: number
  coachId: number
  studentId: number | null
  branchId: number
  content: string
  status: ComplaintStatus
  result: string
  createdAt: string
}

// ===== 操作日志 =====
export interface OperationLog {
  id: number
  userId: number
  username: string
  module: string
  action: string
  detail: string
  createdAt: string
}

// ===== 统一响应 =====
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
}

// ===== 常量映射 =====
export const SUBJECTS = ['科目一', '科目二', '科目三', '科目四'] as const
export const SUBJECT_SHORT: Record<string, string> = {
  科目一: '科一',
  科目二: '科二',
  科目三: '科三',
  科目四: '科四',
}

export const VEHICLE_STATUS_MAP: Record<VehicleStatus, { label: string; type: string; color: string }> = {
  available: { label: '教学可用', type: 'success', color: '#16A34A' },
  repair: { label: '故障维修', type: 'danger', color: '#DC2626' },
  inspecting: { label: '年检中', type: 'warning', color: '#F59E0B' },
}

export const STUDENT_STATUS_MAP: Record<StudentStatus, { label: string; type: string }> = {
  enrolled: { label: '已报名', type: 'info' },
  training: { label: '培训中', type: 'warning' },
  examining: { label: '考试中', type: 'primary' },
  passed: { label: '已通过', type: 'success' },
}

export const PAY_METHOD_MAP: Record<PayMethod, { label: string; icon: string }> = {
  cash: { label: '现金', icon: 'Wallet' },
  wechat: { label: '微信', icon: 'ChatDotRound' },
  alipay: { label: '支付宝', icon: 'Money' },
  card: { label: '银行卡', icon: 'CreditCard' },
}

export const COMPLAINT_STATUS_MAP: Record<ComplaintStatus, { label: string; type: string }> = {
  pending: { label: '待处理', type: 'danger' },
  processing: { label: '处理中', type: 'warning' },
  resolved: { label: '已解决', type: 'success' },
}

export const ROLE_MAP: Record<RoleKey, string> = {
  admin: '总校管理员',
  branch: '分校管理员',
  coach: '教练',
}
