import { useState } from 'react';
import api from '../utils/api';
import { formatDate, formatMoney } from '../utils/helpers';
import { FileBarChart, Download, Building2, CalendarDays } from 'lucide-react';

type ReportType = 'by-department' | 'on-leave';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async (type: ReportType) => {
    setActiveReport(type);
    setLoading(true);
    setData(null);
    try {
      const params: any = {};
      if (type === 'on-leave') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const { data } = await api.get(`/analytics/reports/${type}`, { params });
      setData(data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
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
        <h1 className="text-2xl font-bold text-gray-900">Отчеты</h1>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Экспорт сотрудников в CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => loadReport('by-department')}
          className={`card cursor-pointer hover:shadow-md transition-shadow text-left ${activeReport === 'by-department' ? 'ring-2 ring-primary-500' : ''}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">По отделам</h3>
          </div>
          <p className="text-sm text-gray-500">Список сотрудников по отделам</p>
        </button>

        <button
          onClick={() => loadReport('on-leave')}
          className={`card cursor-pointer hover:shadow-md transition-shadow text-left ${activeReport === 'on-leave' ? 'ring-2 ring-primary-500' : ''}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Отпуска за период</h3>
          </div>
          <p className="text-sm text-gray-500">Сотрудники в отпуске за указанный период</p>
        </button>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Кадровая история</h3>
          </div>
          <p className="text-sm text-gray-500">Доступна на странице «Кадровая история»</p>
        </div>
      </div>

      {activeReport === 'on-leave' && (
        <div className="card mb-6">
          <div className="flex items-end gap-4">
            <div>
              <label className="label">Дата начала</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Дата окончания</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
            </div>
            <button onClick={() => loadReport('on-leave')} className="btn-primary">Сформировать</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      )}

      {!loading && data && activeReport === 'by-department' && (
        <div className="space-y-4">
          {data.map((dept: any) => (
            <div key={dept.id} className="card">
              <h3 className="font-semibold text-gray-900 mb-3">{dept.name} ({dept.employees.length} сотр.)</h3>
              {dept.employees.length === 0 ? (
                <p className="text-sm text-gray-500">Нет сотрудников</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">ФИО</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Должность</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Email</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Оклад</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.employees.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-gray-50">
                        <td className="py-2">{emp.lastName} {emp.firstName} {emp.middleName || ''}</td>
                        <td className="py-2">{emp.position?.title || '—'}</td>
                        <td className="py-2 text-gray-500">{emp.email}</td>
                        <td className="py-2">{formatMoney(emp.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data && activeReport === 'on-leave' && (
        <div className="card overflow-hidden p-0">
          {data.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Нет данных за указанный период</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Сотрудник</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Отдел</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Тип</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Период</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Дней</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{r.employeeName}</td>
                    <td className="px-6 py-3">{r.department || '—'}</td>
                    <td className="px-6 py-3">{r.type}</td>
                    <td className="px-6 py-3">{formatDate(r.startDate)} — {formatDate(r.endDate)}</td>
                    <td className="px-6 py-3">{r.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
