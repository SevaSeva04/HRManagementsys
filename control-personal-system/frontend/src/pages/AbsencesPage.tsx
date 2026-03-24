import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Absence, Employee } from '../types';
import { formatDate, absenceTypeLabels, canAccess } from '../utils/helpers';
import { Plus, Trash2 } from 'lucide-react';

export default function AbsencesPage() {
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employeeId: '', type: 'SICK_LEAVE', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/absences'),
      api.get('/employees', { params: { limit: 100 } }),
    ]).then(([abs, emps]) => {
      setAbsences(abs.data);
      setEmployees(emps.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) { setError('Заполните все обязательные поля'); return; }
    try {
      await api.post('/absences', form);
      setShowModal(false);
      setForm({ employeeId: '', type: 'SICK_LEAVE', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/absences/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const isEditable = canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER', 'MANAGER');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отсутствия</h1>
        {isEditable && (
          <button onClick={() => { setError(''); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : absences.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">Записи не найдены</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Сотрудник</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Тип</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Период</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Дней</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Причина</th>
                {isEditable && <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {absences.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{a.employeeName}</div>
                    <div className="text-xs text-gray-500">{a.departmentName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{absenceTypeLabels[a.type]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(a.startDate)} — {formatDate(a.endDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.days}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{a.reason || '—'}</td>
                  {isEditable && (
                    <td className="px-6 py-4">
                      <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Регистрация отсутствия</h2>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Сотрудник *</label>
                <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="input-field">
                  <option value="">Выберите сотрудника</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Тип отсутствия</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                  {Object.entries(absenceTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Дата начала *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Дата окончания *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Причина</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Отмена</button>
              <button onClick={handleCreate} className="btn-primary">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
