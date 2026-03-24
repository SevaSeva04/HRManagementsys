import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { LeaveRequest } from '../types';
import { formatDate, leaveStatusLabels, leaveStatusColors, leaveTypeLabels, canAccess } from '../utils/helpers';
import { Plus, Check, X, MessageSquare } from 'lucide-react';

export default function LeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReview, setShowReview] = useState<LeaveRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [form, setForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '', status: 'PENDING' });
  const [error, setError] = useState('');

  const fetchLeaves = () => {
    setLoading(true);
    const params: any = {};
    if (filterStatus) params.status = filterStatus;
    api.get('/leaves', { params })
      .then(({ data }) => setLeaves(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeaves(); }, [filterStatus]);

  const handleCreate = async () => {
    if (!form.startDate || !form.endDate) { setError('Укажите даты'); return; }
    try {
      await api.post('/leaves', form);
      setShowCreate(false);
      setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '', status: 'PENDING' });
      fetchLeaves();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!showReview) return;
    try {
      await api.post(`/leaves/${showReview.id}/review`, { action, comment: reviewComment });
      setShowReview(null);
      setReviewComment('');
      fetchLeaves();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const canReview = canAccess(user?.role || '', 'ADMIN', 'HR_MANAGER', 'MANAGER');
  const canCreate = true; // All roles can create leave requests

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отпуска</h1>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
            <option value="">Все статусы</option>
            <option value="DRAFT">Черновики</option>
            <option value="PENDING">На согласовании</option>
            <option value="APPROVED_BY_MANAGER">Одобрено руководителем</option>
            <option value="APPROVED">Одобрено</option>
            <option value="REJECTED">Отклонено</option>
          </select>
          {canCreate && (
            <button onClick={() => { setError(''); setShowCreate(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Новая заявка
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : leaves.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">Заявки не найдены</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Сотрудник</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Тип</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Период</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Дней</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Статус</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Причина</th>
                {canReview && <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaves.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{leave.employeeName}</div>
                    <div className="text-xs text-gray-500">{leave.departmentName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{leaveTypeLabels[leave.type]}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{leave.days}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${leaveStatusColors[leave.status]}`}>{leaveStatusLabels[leave.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{leave.reason || '—'}</td>
                  {canReview && (
                    <td className="px-6 py-4">
                      {['PENDING', 'APPROVED_BY_MANAGER'].includes(leave.status) && (
                        <button onClick={() => { setShowReview(leave); setReviewComment(''); }} className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50" title="Рассмотреть">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Заявка на отпуск</h2>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Тип отпуска</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                  {Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Дата начала</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Дата окончания</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Причина</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field" rows={2} />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.status === 'DRAFT'} onChange={e => setForm({ ...form, status: e.target.checked ? 'DRAFT' : 'PENDING' })} className="rounded" />
                  <span className="text-sm text-gray-700">Сохранить как черновик</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Отмена</button>
              <button onClick={handleCreate} className="btn-primary">Отправить</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Рассмотрение заявки</h2>
            <div className="text-sm text-gray-600 mb-4">
              <p><strong>{showReview.employeeName}</strong></p>
              <p>{leaveTypeLabels[showReview.type]}: {formatDate(showReview.startDate)} — {formatDate(showReview.endDate)} ({showReview.days} дн.)</p>
              {showReview.reason && <p className="mt-1">Причина: {showReview.reason}</p>}
            </div>
            <div className="mb-4">
              <label className="label">Комментарий</label>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="input-field" rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReview(null)} className="btn-secondary">Отмена</button>
              <button onClick={() => handleReview('reject')} className="btn-danger flex items-center gap-1">
                <X className="w-4 h-4" /> Отклонить
              </button>
              <button onClick={() => handleReview('approve')} className="btn-success flex items-center gap-1">
                <Check className="w-4 h-4" /> Одобрить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
