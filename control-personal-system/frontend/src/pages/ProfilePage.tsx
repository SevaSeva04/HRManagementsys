import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Employee, LeaveBalance, LeaveRequest, EmploymentHistory } from '../types';
import { formatDate, formatMoney, statusLabels, statusColors, genderLabels, leaveStatusLabels, leaveStatusColors, leaveTypeLabels, historyEventLabels, historyEventColors, roleLabels } from '../utils/helpers';
import { User, Building2, Briefcase, DollarSign, Calendar, CalendarDays, History, Plus } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<EmploymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get(`/employees/${user.employeeId}`),
      api.get(`/leaves/balance/${user.employeeId}`).catch(() => ({ data: null })),
      api.get('/leaves', { params: { employeeId: user.employeeId, limit: 10 } }),
      api.get(`/history/employee/${user.employeeId}`),
    ]).then(([empRes, balRes, leavesRes, histRes]) => {
      setEmployee(empRes.data);
      setBalance(balRes.data);
      setLeaves(leavesRes.data.data);
      setHistory(histRes.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!employee) {
    return (
      <div className="card text-center py-12">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Профиль</h2>
        <p className="text-gray-500">Пользователь: {user?.username}</p>
        <p className="text-gray-500">Роль: {roleLabels[user?.role || '']}</p>
        <p className="text-sm text-gray-400 mt-2">Профиль сотрудника не привязан к учетной записи</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мой профиль</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
                {employee.lastName[0]}{employee.firstName[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {employee.lastName} {employee.firstName} {employee.middleName || ''}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">{employee.employeeNumber}</span>
                  <span className={`badge ${statusColors[employee.status]}`}>{statusLabels[employee.status]}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<Building2 className="w-4 h-4" />} label="Отдел" value={employee.departmentName || employee.department?.name || '—'} />
              <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Должность" value={employee.positionTitle || employee.position?.title || '—'} />
              <InfoItem icon={<DollarSign className="w-4 h-4" />} label="Оклад" value={formatMoney(employee.salary)} />
              <InfoItem icon={<User className="w-4 h-4" />} label="Руководитель" value={employee.managerName || '—'} />
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Дата приема" value={formatDate(employee.hireDate)} />
              <InfoItem label="Email" value={employee.email} />
              <InfoItem label="Телефон" value={employee.phone || '—'} />
              <InfoItem label="Дата рождения" value={formatDate(employee.dateOfBirth)} />
              <InfoItem label="Пол" value={genderLabels[employee.gender]} />
            </div>
          </div>

          {/* Leave history */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> Мои заявки на отпуск
              </h2>
              <button onClick={() => navigate('/leaves')} className="btn-secondary text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Подать заявку
              </button>
            </div>
            {leaves.length === 0 ? (
              <p className="text-sm text-gray-500">Заявки не найдены</p>
            ) : (
              <div className="space-y-3">
                {leaves.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{leaveTypeLabels[l.type]}</div>
                      <div className="text-xs text-gray-500">{formatDate(l.startDate)} — {formatDate(l.endDate)} ({l.days} дн.)</div>
                    </div>
                    <span className={`badge ${leaveStatusColors[l.status]}`}>{leaveStatusLabels[l.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employment history */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <History className="w-5 h-5" /> Кадровая история
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">История отсутствует</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                <div className="space-y-3">
                  {history.map(h => (
                    <div key={h.id} className="relative flex gap-4 pl-10">
                      <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                        h.eventType === 'HIRED' ? 'bg-green-500' :
                        h.eventType === 'TERMINATED' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${historyEventColors[h.eventType]}`}>{historyEventLabels[h.eventType]}</span>
                          <span className="text-xs text-gray-400">{formatDate(h.eventDate)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: leave balance */}
        <div className="space-y-6">
          {balance && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Баланс отпусков {balance.year}</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Ежегодный отпуск</span>
                    <span className="font-medium text-gray-900">{balance.annualRemaining ?? (balance.annualTotal - balance.annualUsed)} из {balance.annualTotal} дн.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-primary-500 h-3 rounded-full transition-all" style={{ width: `${((balance.annualTotal - balance.annualUsed) / balance.annualTotal) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Использовано: {balance.annualUsed} дн.</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Больничный</span>
                    <span className="font-medium text-gray-900">{balance.sickRemaining ?? (balance.sickTotal - balance.sickUsed)} из {balance.sickTotal} дн.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: `${((balance.sickTotal - balance.sickUsed) / balance.sickTotal) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Использовано: {balance.sickUsed} дн.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">{icon}{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
