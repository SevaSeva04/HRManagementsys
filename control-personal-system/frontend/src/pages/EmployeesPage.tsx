import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Employee, Department, Position } from '../types';
import { formatDate, formatMoney, statusLabels, statusColors, canAccess } from '../utils/helpers';
import { Plus, Search, Eye, Edit, Download } from 'lucide-react';

export default function EmployeesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEmployees = () => {
    setLoading(true);
    const params: any = { page, limit: 15 };
    if (search) params.search = search;
    if (filterDept) params.departmentId = filterDept;
    if (filterPos) params.positionId = filterPos;
    if (filterStatus) params.status = filterStatus;

    api.get('/employees', { params })
      .then(({ data }) => {
        setEmployees(data.data);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/departments'),
      api.get('/positions'),
    ]).then(([depts, poss]) => {
      setDepartments(depts.data);
      setPositions(poss.data);
    });
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, filterDept, filterPos, filterStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const handleExport = () => {
    api.get('/analytics/export/employees', { responseType: 'blob' }).then(({ data }) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
        <div className="flex gap-2">
          {canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER') && (
            <>
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => navigate('/employees/new')} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Добавить сотрудника
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ФИО, email, табельный номер..."
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="label">Отдел</label>
            <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }} className="input-field">
              <option value="">Все отделы</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="label">Должность</label>
            <select value={filterPos} onChange={e => { setFilterPos(e.target.value); setPage(1); }} className="input-field">
              <option value="">Все должности</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="label">Статус</label>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-field">
              <option value="">Все</option>
              <option value="ACTIVE">Активен</option>
              <option value="ON_LEAVE">В отпуске</option>
              <option value="TERMINATED">Уволен</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Найти</button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-500 py-12">Сотрудники не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Сотрудник</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Табельный №</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Отдел</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Должность</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Оклад</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Статус</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm">
                          {emp.lastName[0]}{emp.firstName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{emp.fullName || `${emp.lastName} ${emp.firstName}`}</div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.employeeNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.departmentName || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.positionTitle || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatMoney(emp.salary)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${statusColors[emp.status]}`}>{statusLabels[emp.status]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => navigate(`/employees/${emp.id}`)} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50" title="Просмотр">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER') && (
                          <button onClick={() => navigate(`/employees/${emp.id}/edit`)} className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50" title="Редактировать">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Страница {page} из {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1 px-3">
                Назад
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-1 px-3">
                Вперед
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
