import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Department, Employee } from '../types';
import { canAccess } from '../utils/helpers';
import { Plus, Edit, Trash2, Building2, Users } from 'lucide-react';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '', managerId: '' });
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/departments'),
      api.get('/employees', { params: { limit: 100 } }),
    ]).then(([depts, emps]) => {
      setDepartments(depts.data);
      setEmployees(emps.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: '', description: '', managerId: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '', managerId: dept.managerId ? String(dept.managerId) : '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Укажите название'); return; }
    try {
      const payload = { ...form, managerId: form.managerId ? Number(form.managerId) : null };
      if (editDept) {
        await api.put(`/departments/${editDept.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить отдел?')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const isEditable = canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отделы</h1>
        {isEditable && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Добавить отдел
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    {dept.description && <p className="text-xs text-gray-500">{dept.description}</p>}
                  </div>
                </div>
                {isEditable && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(dept)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {dept.employeeCount ?? dept._count?.employees ?? 0} сотр.</span>
                {dept.managerName && <span>Рук.: {dept.managerName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editDept ? 'Редактирование отдела' : 'Новый отдел'}</h2>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Название *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Описание</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
              </div>
              <div>
                <label className="label">Руководитель</label>
                <select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} className="input-field">
                  <option value="">Не указан</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
                </select>
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
