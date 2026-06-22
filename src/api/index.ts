import { http } from '@/utils/request'
import type {
  Coach, Vehicle, Schedule, Complaint, Payment, Salary, Maintenance,
  OperationLog, SysUser, Role, RoleKey, Student, ExamRecord, StudentStatus, Notify,
} from '@/types'

// ===== 鉴权 =====
export interface LoginResult {
  token: string
  user: { id: number; username: string; realName: string; roleKey: RoleKey; roleId: number; branchId: number | null; phone?: string }
  role: { name: string; key: RoleKey; permissions: string[] }
}
export const authApi = {
  login: (data: { username: string; password: string }) => http.post<LoginResult>('/api/auth/login', data),
}

// ===== 工作台 =====
export interface DashboardData {
  kpis: { studentCount: number; coachCount: number; vehicleCount: number; monthlyRevenue: number; pendingPayments: number; vehicleAlerts: number }
  branchRanking: { branchId: number; name: string; rate: number; passed: number; total: number }[]
  vehicleAlerts: any[]
  revenueTrend: { month: string; revenue: number }[]
}
export const dashboardApi = {
  get: (branchId?: number) => http.get<DashboardData>('/api/dashboard', { branchId }),
}

// ===== 分校 =====
export interface BranchStat {
  id: number; name: string; address: string; phone: string; manager: string
  studentCount: number; coachCount: number; vehicleCount: number
  rate: number; passed: number; total: number; revenue: number
}
export const branchApi = {
  list: () => http.get<BranchStat[]>('/api/branches'),
  dashboard: (id: number) => http.get<any>(`/api/branches/${id}/dashboard`),
  ranking: (params: { subject?: string; start?: string; end?: string }) => http.get<any[]>('/api/branches/ranking', params),
}

// ===== 教练 =====
export interface CoachRow extends Coach {
  branchName?: string; passRate: number; passTotal: number; avgScore: number
  studentCount: number; reviewCount: number; complaintCount: number
}
export const coachApi = {
  list: (params: { branchId?: number; keyword?: string }) => http.get<CoachRow[]>('/api/coaches', params),
  create: (data: Partial<Coach>) => http.post<Coach>('/api/coaches', data),
  update: (id: number, data: Partial<Coach>) => http.put<Coach>(`/api/coaches/${id}`, data),
  ranking: (params: { month?: string; branchId?: number; sortBy?: string }) => http.get<any[]>('/api/coaches/ranking', params),
  reviews: (id: number) => http.get<any>(`/api/coaches/${id}/reviews`),
  complaints: (id: number) => http.get<any[]>(`/api/coaches/${id}/complaints`),
}

export const complaintApi = {
  list: (params: { status?: string; branchId?: number }) => http.get<any[]>('/api/complaints', params),
  resolve: (id: number, data: { status: string; result: string }) => http.post<any>(`/api/complaints/${id}/resolve`, data),
  create: (data: { coachId: number; studentId?: number; content: string }) => http.post<Complaint>('/api/complaints', data),
}

// ===== 学员 =====
export interface StudentRow extends Student {
  branchName?: string; coachName?: string
}
export interface StudentDetail extends Student {
  branchName?: string
  coachName?: string
  exams: ExamRecord[]
  payments: Payment[]
}
export const studentApi = {
  list: (params: { branchId?: number; status?: StudentStatus; keyword?: string }) => http.get<StudentRow[]>('/api/students', params),
  detail: (id: number) => http.get<StudentDetail>(`/api/students/${id}`),
}

// ===== 排班 =====
export interface ScheduleRow extends Schedule {
  coachName?: string; studentName?: string; vehiclePlate?: string
}
export const scheduleApi = {
  list: (params: { coachId?: number; branchId?: number; start?: string; end?: string }) => http.get<ScheduleRow[]>('/api/schedules', params),
  check: (params: any) => http.get<any>('/api/schedules/check', params),
  create: (data: Partial<Schedule> & { force?: boolean }) => http.post<Schedule>('/api/schedules', data),
  importBatch: (list: any[]) => http.post<{ added: number; total: number }>('/api/schedules/import', { list }),
  remove: (id: number) => http.delete(`/api/schedules/${id}`),
}

// ===== 车辆 =====
export interface VehicleRow extends Vehicle {
  branchName?: string; inspectionDays: number; insuranceDays: number
}
export const vehicleApi = {
  list: (params: { branchId?: number; status?: string; keyword?: string }) => http.get<VehicleRow[]>('/api/vehicles', params),
  updateStatus: (id: number, status: string) => http.put<Vehicle>(`/api/vehicles/${id}/status`, { status }),
  maintenance: (id: number) => http.get<Maintenance[]>(`/api/vehicles/${id}/maintenance`),
  addMaintenance: (data: Partial<Maintenance>) => http.post<Maintenance>('/api/vehicles/maintenance', data),
  alerts: (branchId?: number) => http.get<VehicleRow[]>('/api/vehicles/alerts', { branchId }),
}

// ===== 财务 =====
export interface PaymentRow extends Payment { studentName?: string; branchName?: string }
export interface SalaryRow extends Salary { coachName?: string; branchName?: string }
export const financeApi = {
  payments: (params: { branchId?: number; status?: string; keyword?: string }) => http.get<PaymentRow[]>('/api/finance/payments', params),
  confirm: (id: number, payMethod: string) => http.post<Payment>(`/api/finance/payments/${id}/confirm`, { payMethod }),
  salary: (params: { month?: string; branchId?: number }) => http.get<SalaryRow[]>('/api/finance/salary', params),
  calculate: (month: string) => http.post<{ month: string; count: number }>('/api/finance/salary/calculate', { month }),
  revenue: (months?: number) => http.get<any[]>('/api/finance/revenue', { months }),
}

// ===== 考试合格率 =====
export const examApi = {
  branchRanking: (params: { subject: string; start?: string; end?: string; batch?: string }) => http.get<any[]>('/api/exam/branch-ranking', params),
  coachRanking: (params: { subject: string; start?: string; end?: string; batch?: string; branchId?: number }) => http.get<any[]>('/api/exam/coach-ranking', params),
}

// ===== 系统 =====
export interface UserRow extends SysUser { roleName?: string; branchName?: string }
export const systemApi = {
  users: () => http.get<UserRow[]>('/api/system/users'),
  createUser: (data: Partial<SysUser>) => http.post<SysUser>('/api/system/users', data),
  updateUser: (id: number, data: Partial<SysUser>) => http.put<SysUser>(`/api/system/users/${id}`, data),
  logs: (module?: string) => http.get<OperationLog[]>('/api/system/logs', { module }),
  roles: (): Role[] => [
    { id: 1, name: '总校管理员', key: 'admin', permissions: ['*'] },
    { id: 2, name: '分校管理员', key: 'branch', permissions: ['branch', 'coach', 'schedule', 'vehicle', 'finance', 'exam', 'system:log'] },
    { id: 3, name: '教练', key: 'coach', permissions: ['schedule:self', 'exam:self', 'coach:self'] },
  ],
}

// ===== 通知 =====
export const notifyApi = {
  list: (params?: { branchId?: number; unread?: boolean }) => http.get<Notify[]>('/api/notifies', params),
  markRead: (id: number) => http.post<Notify>(`/api/notifies/${id}/read`),
  markAllRead: () => http.post<{ count: number }>('/api/notifies/read-all'),
}
