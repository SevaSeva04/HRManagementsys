import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Position } from '../types';
import { formatMoney, canAccess } from '../utils/helpers';
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react';

export default function PositionsPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [form, setForm] = useState({ title: '', description: '', minSalary: '', maxSalary: '' });
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get('/positions').then(({ data }) => setPositions(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditPos(null);
    setForm({ title: '', description: '', minSalary: '', maxSalary: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (pos: Position) => {
    setEditPos(pos);
    setForm({
      title: pos.title,
      description: pos.description || '',
      minSalary: pos.minSalary ? String(pos.minSalary) : '',
      maxSalary: pos.maxSalary ? String(pos.maxSalary) : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Укажите название'); return; }
    try {
      const payload = {
        ...form,
        minSalary: form.minSalary ? Number(form.minSalary) : null,
        maxSalary: form.maxSalary ? Number(form.maxSalary) : null,
      };
      if (editPos) {
        await api.put(`/positions/${editPos.id}`, payload);
      } else {
        await api.post('/positions', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить должность?')) return;
    try {
      await api.delete(`/positions/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const isEditable = canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Должности</h1>
        {isEditable && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Добавить должность
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Должность</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Описание</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Вилка оклада</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Сотрудников</th>
                {isEditable && <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {positions.map(pos => (
                <tr key={pos.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{pos.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pos.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {pos.minSalary && pos.maxSalary
                      ? `${formatMoney(pos.minSalary)} — ${formatMoney(pos.maxSalary)}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pos.employeeCount ?? 0}</td>
                  {isEditable && (
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(pos)} className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button onClick={() => handleDelete(pos.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
            <h2 className="text-lg font-bold mb-4">{editPos ? 'Редактирование должности' : 'Новая должность'}</h2>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Название *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Описание</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Мин. оклад</label>
                  <input type="number" value={form.minSalary} onChange={e => setForm({ ...form, minSalary: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Макс. оклад</label>
                  <input type="number" value={form.maxSalary} onChange={e => setForm({ ...form, maxSalary: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Отмена</button>
              <button onClick={handleSave} className="btn-primary">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
