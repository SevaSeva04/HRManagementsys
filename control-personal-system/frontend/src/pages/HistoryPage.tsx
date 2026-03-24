import { useState, useEffect } from 'react';
import api from '../utils/api';
import { EmploymentHistory } from '../types';
import { formatDate, historyEventLabels, historyEventColors } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function HistoryPage() {
  const [records, setRecords] = useState<EmploymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 30 };
    if (filterType) params.eventType = filterType;
    api.get('/history', { params })
      .then(({ data }) => { setRecords(data.data); setTotalPages(data.totalPages); })
      .finally(() => setLoading(false));
  }, [page, filterType]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Кадровая история</h1>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">Все события</option>
          {Object.entries(historyEventLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : records.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">Записи не найдены</div>
      ) : (
        <div className="card">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
            <div className="space-y-4">
              {records.map(r => (
                <div key={r.id} className="relative flex gap-4 pl-10">
                  <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                    r.eventType === 'HIRED' ? 'bg-green-500' :
                    r.eventType === 'TERMINATED' ? 'bg-red-500' :
                    r.eventType === 'SALARY_CHANGE' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${historyEventColors[r.eventType]}`}>
                        {historyEventLabels[r.eventType]}
                      </span>
                      <button
                        onClick={() => navigate(`/employees/${r.employeeId}`)}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        {r.employeeName}
                      </button>
                      <span className="text-xs text-gray-400">{formatDate(r.eventDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Страница {page} из {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1 px-3">Назад</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm py-1 px-3">Вперед</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
