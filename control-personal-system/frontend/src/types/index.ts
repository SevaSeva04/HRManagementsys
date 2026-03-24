export interface User {
  id: number;
  username: string;
  role: string;
  employeeId?: number;
  employeeName?: string;
}

export interface Employee {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName?: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email: string;
  address?: string;
  hireDate: string;
  terminationDate?: string;
  status: string;
  salary: number;
  photoUrl?: string;
  notes?: string;
  departmentId?: number;
  positionId?: number;
  managerId?: number;
  userId?: number;
  department?: Department;
  position?: Position;
  manager?: { id: number; firstName: string; lastName: string };
  subordinates?: { id: number; firstName: string; lastName: string }[];
  leaveBalance?: LeaveBalance;
  departmentName?: string;
  positionTitle?: string;
  managerName?: string;
  user?: { id: number; username: string; role: string };
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  managerId?: number;
  manager?: { id: number; firstName: string; lastName: string };
  managerName?: string;
  employeeCount?: number;
  employees?: Employee[];
  _count?: { employees: number };
}

export interface Position {
  id: number;
  title: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  employeeCount?: number;
  departmentNames?: string[];
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string;
  managerComment?: string;
  hrComment?: string;
  createdAt: string;
  employeeName?: string;
  departmentName?: string;
  days?: number;
}

export interface Absence {
  id: number;
  employeeId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  employeeName?: string;
  departmentName?: string;
  days?: number;
}

export interface EmploymentHistory {
  id: number;
  employeeId: number;
  eventType: string;
  eventDate: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  employeeName?: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  annualTotal: number;
  annualUsed: number;
  annualRemaining?: number;
  sickTotal: number;
  sickUsed: number;
  sickRemaining?: number;
  year: number;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DashboardData {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    terminatedEmployees: number;
    onLeaveEmployees: number;
    pendingLeaves: number;
    recentHires: number;
  };
  byDepartment: { department: string; count: number }[];
  byPosition: { position: string; count: number }[];
  hiresByMonth: { month: string; count: number }[];
  turnoverByMonth: { month: string; count: number }[];
}
