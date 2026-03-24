import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { Department, Position, Employee } from '../types';
import { formatDateISO } from '../utils/helpers';
import { ArrowLeft, Save } from 'lucide-react';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: 'MALE',
    phone: '',
    email: '',
    address: '',
    hireDate: new Date().toISOString().split('T')[0],
    salary: '',
    departmentId: '',
    positionId: '',
    managerId: '',
    notes: '',
    createAccount: false,
    username: '',
    password: 'password123',
    userRole: 'EMPLOYEE',
  });

  useEffect(() => {
    Promise.all([
      api.get('/departments'),
      api.get('/positions'),
      api.get('/employees', { params: { limit: 100 } }),
    ]).then(([depts, poss, emps]) => {
      setDepartments(depts.data);
      setPositions(poss.data);
      setEmployees(emps.data.data);
    });

    if (isEdit) {
      setLoading(true);
      api.get(`/employees/${id}`).then(({ data }) => {
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || '',
          dateOfBirth: formatDateISO(data.dateOfBirth),
          gender: data.gender,
          phone: data.phone || '',
          email: data.email,
          address: data.address || '',
          hireDate: formatDateISO(data.hireDate),
          salary: String(data.salary),
          departmentId: data.departmentId ? String(data.departmentId) : '',
          positionId: data.positionId ? String(data.positionId) : '',
          managerId: data.managerId ? String(data.managerId) : '',
          notes: data.notes || '',
          createAccount: false,
          username: '',
          password: 'password123',
          userRole: 'EMPLOYEE',
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.lastName.trim()) errs.lastName = 'Укажите фамилию';
    if (!form.firstName.trim()) errs.firstName = 'Укажите имя';
    if (!form.email.trim()) errs.email = 'Укажите email';
    if (!form.dateOfBirth) errs.dateOfBirth = 'Укажите дату рождения';
    if (!form.hireDate) errs.hireDate = 'Укажите дату приема';
    if (!form.salary || Number(form.salary) <= 0) errs.salary = 'Укажите оклад';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        salary: Number(form.salary),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        positionId: form.positionId ? Number(form.positionId) : null,
        managerId: form.managerId ? Number(form.managerId) : null,
      };

      if (isEdit) {
        await api.put(`/employees/${id}`, payload);
        navigate(`/employees/${id}`);
      } else {
        const { data } = await api.post('/employees', payload);
        navigate(`/employees/${data.id}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Ошибка сохранения';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Редактирование сотрудника' : 'Новый сотрудник'}
      </h1>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal data */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Личные данные</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Фамилия *" error={errors.lastName}>
              <input value={form.lastName} onChange={e => updateField('lastName', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Имя *" error={errors.firstName}>
              <input value={form.firstName} onChange={e => updateField('firstName', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Отчество">
              <input value={form.middleName} onChange={e => updateField('middleName', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Дата рождения *" error={errors.dateOfBirth}>
              <input type="date" value={form.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Пол *">
              <select value={form.gender} onChange={e => updateField('gender', e.target.value)} className="input-field">
                <option value="MALE">Мужской</option>
                <option value="FEMALE">Женский</option>
              </select>
            </FormField>
            <FormField label="Телефон">
              <input value={form.phone} onChange={e => updateField('phone', e.target.value)} className="input-field" placeholder="+7 (XXX) XXX-XX-XX" />
            </FormField>
            <FormField label="Email *" error={errors.email}>
              <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Адрес">
              <input value={form.address} onChange={e => updateField('address', e.target.value)} className="input-field" />
            </FormField>
          </div>
        </div>

        {/* Work data */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Рабочая информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Дата приема *" error={errors.hireDate}>
              <input type="date" value={form.hireDate} onChange={e => updateField('hireDate', e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Отдел">
              <select value={form.departmentId} onChange={e => updateField('departmentId', e.target.value)} className="input-field">
                <option value="">Не указан</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Должность">
              <select value={form.positionId} onChange={e => updateField('positionId', e.target.value)} className="input-field">
                <option value="">Не указана</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </FormField>
            <FormField label="Оклад (руб.) *" error={errors.salary}>
              <input type="number" value={form.salary} onChange={e => updateField('salary', e.target.value)} className="input-field" min="0" />
            </FormField>
            <FormField label="Руководитель">
              <select value={form.managerId} onChange={e => updateField('managerId', e.target.value)} className="input-field">
                <option value="">Не указан</option>
                {employees.filter(e => String(e.id) !== id).map(e => (
                  <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Примечание">
              <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} className="input-field" rows={3} />
            </FormField>
          </div>
        </div>

        {/* Account creation */}
        {!isEdit && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Учетная запись</h2>
            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={form.createAccount} onChange={e => updateField('createAccount', e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Создать учетную запись</span>
            </label>
            {form.createAccount && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Логин">
                  <input value={form.username} onChange={e => updateField('username', e.target.value)} className="input-field" placeholder={form.email} />
                </FormField>
                <FormField label="Пароль">
                  <input value={form.password} onChange={e => updateField('password', e.target.value)} className="input-field" />
                </FormField>
                <FormField label="Роль">
                  <select value={form.userRole} onChange={e => updateField('userRole', e.target.value)} className="input-field">
                    <option value="EMPLOYEE">Сотрудник</option>
                    <option value="MANAGER">Руководитель</option>
                    <option value="HR_MANAGER">HR-менеджер</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                </FormField>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Отмена</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
