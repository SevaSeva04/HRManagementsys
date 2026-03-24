import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Employee, EmploymentHistory, LeaveBalance } from '../types';
import { formatDate, formatMoney, statusLabels, statusColors, genderLabels, historyEventLabels, historyEventColors, canAccess } from '../utils/helpers';
import { ArrowLeft, Edit, UserX, UserCheck, Calendar, Briefcase, Building2, DollarSign, Clock } from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<EmploymentHistory[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/history/employee/${id}`),
      api.get(`/leaves/balance/${id}`).catch(() => ({ data: null })),
    ])
      .then(([empRes, histRes, balRes]) => {
        setEmployee(empRes.data);
        setHistory(histRes.data);
        setBalance(balRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleTerminate = async () => {
    if (!window.confirm('Вы уверены, что хотите уволить сотрудника?')) return;
    try {
      await api.post(`/employees/${id}/terminate`, { reason: terminateReason });
      setShowTerminate(false);
      // Reload
      const { data } = await api.get(`/employees/${id}`);
      setEmployee(data);
      const histRes = await api.get(`/history/employee/${id}`);
      setHistory(histRes.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleReinstate = async () => {
    if (!window.confirm('Восстановить сотрудника?')) return;
    try {
      await api.post(`/employees/${id}/reinstate`);
      const { data } = await api.get(`/employees/${id}`);
      setEmployee(data);
      const histRes = await api.get(`/history/employee/${id}`);
      setHistory(histRes.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!employee) return <div className="text-center text-gray-500 py-12">Сотрудник не найден</div>;

  const isEditable = canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER');

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
              {employee.lastName[0]}{employee.firstName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.lastName} {employee.firstName} {employee.middleName || ''}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-500">{employee.employeeNumber}</span>
                <span className={`badge ${statusColors[employee.status]}`}>{statusLabels[employee.status]}</span>
              </div>
            </div>
          </div>
          {isEditable && (
            <div className="flex gap-2">
              <button onClick={() => navigate(`/employees/${id}/edit`)} className="btn-secondary flex items-center gap-2">
                <Edit className="w-4 h-4" /> Редактировать
              </button>
              {employee.status === 'ACTIVE' ? (
                <button onClick={() => setShowTerminate(true)} className="btn-danger flex items-center gap-2">
                  <UserX className="w-4 h-4" /> Уволить
                </button>
              ) : employee.status === 'TERMINATED' ? (
                <button onClick={handleReinstate} className="btn-success flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Восстановить
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Terminate modal */}
      {showTerminate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Увольнение сотрудника</h2>
            <div className="mb-4">
              <label className="label">Причина увольнения</label>
              <textarea value={terminateReason} onChange={e => setTerminateReason(e.target.value)} className="input-field" rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTerminate(false)} className="btn-secondary">Отмена</button>
              <button onClick={handleTerminate} className="btn-danger">Уволить</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Личные данные</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Дата рождения" value={formatDate(employee.dateOfBirth)} />
              <InfoRow label="Пол" value={genderLabels[employee.gender]} />
              <InfoRow label="Телефон" value={employee.phone || '—'} />
              <InfoRow label="Email" value={employee.email} />
              <InfoRow label="Адрес" value={employee.address || '—'} />
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Рабочая информация</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Отдел" value={employee.departmentName || employee.department?.name || '—'} icon={<Building2 className="w-4 h-4" />} />
              <InfoRow label="Должность" value={employee.positionTitle || employee.position?.title || '—'} icon={<Briefcase className="w-4 h-4" />} />
              <InfoRow label="Оклад" value={formatMoney(employee.salary)} icon={<DollarSign className="w-4 h-4" />} />
              <InfoRow label="Руководитель" value={employee.managerName || (employee.manager ? `${employee.manager.lastName} ${employee.manager.firstName}` : '—')} />
              <InfoRow label="Дата приема" value={formatDate(employee.hireDate)} icon={<Calendar className="w-4 h-4" />} />
              {employee.terminationDate && <InfoRow label="Дата увольнения" value={formatDate(employee.terminationDate)} />}
            </div>
            {employee.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">Примечание</div>
                <div className="text-sm text-gray-700 mt-1">{employee.notes}</div>
              </div>
            )}
          </div>

          {/* Employment History Timeline */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Кадровая история</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">История отсутствует</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                <div className="space-y-4">
                  {history.map(h => (
                    <div key={h.id} className="relative flex gap-4 pl-10">
                      <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                        h.eventType === 'HIRED' ? 'bg-green-500' :
                        h.eventType === 'TERMINATED' ? 'bg-red-500' :
                        h.eventType === 'SALARY_CHANGE' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${historyEventColors[h.eventType]}`}>
                            {historyEventLabels[h.eventType]}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(h.eventDate)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leave Balance */}
          {balance && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Баланс отпусков ({balance.year})</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Ежегодный отпуск</span>
                    <span className="font-medium">{balance.annualRemaining ?? (balance.annualTotal - balance.annualUsed)} / {balance.annualTotal} дн.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${((balance.annualTotal - balance.annualUsed) / balance.annualTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Больничный</span>
                    <span className="font-medium">{balance.sickRemaining ?? (balance.sickTotal - balance.sickUsed)} / {balance.sickTotal} дн.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${((balance.sickTotal - balance.sickUsed) / balance.sickTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subordinates */}
          {employee.subordinates && employee.subordinates.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Подчиненные</h2>
              <div className="space-y-2">
                {employee.subordinates.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => navigate(`/employees/${sub.id}`)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-medium">
                      {sub.lastName[0]}{sub.firstName[0]}
                    </div>
                    <span>{sub.lastName} {sub.firstName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {employee.user && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Учетная запись</h2>
              <InfoRow label="Логин" value={employee.user.username} />
              <InfoRow label="Роль" value={employee.user.role} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
