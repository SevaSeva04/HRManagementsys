export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateISO(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
}

export const statusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  ON_LEAVE: 'В отпуске',
  TERMINATED: 'Уволен',
};

export const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

export const leaveStatusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'На согласовании',
  APPROVED_BY_MANAGER: 'Одобрено руководителем',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
};

export const leaveStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED_BY_MANAGER: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export const leaveTypeLabels: Record<string, string> = {
  ANNUAL: 'Ежегодный',
  SICK: 'Больничный',
  UNPAID: 'Без содержания',
  MATERNITY: 'Декретный',
  PATERNITY: 'Отцовский',
  OTHER: 'Другое',
};

export const absenceTypeLabels: Record<string, string> = {
  SICK_LEAVE: 'Больничный',
  DAY_OFF: 'Отгул',
  BUSINESS_TRIP: 'Командировка',
  REMOTE_WORK: 'Удаленная работа',
  OTHER: 'Другое',
};

export const genderLabels: Record<string, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
};

export const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  HR_MANAGER: 'HR-менеджер',
  MANAGER: 'Руководитель',
  EMPLOYEE: 'Сотрудник',
};

export const historyEventLabels: Record<string, string> = {
  HIRED: 'Прием на работу',
  DEPARTMENT_CHANGE: 'Перевод в отдел',
  POSITION_CHANGE: 'Изменение должности',
  SALARY_CHANGE: 'Изменение оклада',
  TERMINATED: 'Увольнение',
  REINSTATED: 'Восстановление',
};

export const historyEventColors: Record<string, string> = {
  HIRED: 'text-green-600',
  DEPARTMENT_CHANGE: 'text-blue-600',
  POSITION_CHANGE: 'text-purple-600',
  SALARY_CHANGE: 'text-amber-600',
  TERMINATED: 'text-red-600',
  REINSTATED: 'text-teal-600',
};

export function canAccess(role: string, ...allowedRoles: string[]): boolean {
  return allowedRoles.includes(role);
}
