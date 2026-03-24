import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { DashboardData } from '../types';
import { Users, UserCheck, UserX, CalendarClock, UserPlus, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  if (!data) return <div className="text-center text-gray-500 py-12">Не удалось загрузить данные</div>;

  const statCards = [
    { label: 'Всего сотрудников', value: data.summary.totalEmployees, icon: Users, color: 'bg-blue-500', link: '/employees' },
    { label: 'Активных', value: data.summary.activeEmployees, icon: UserCheck, color: 'bg-green-500', link: '/employees' },
    { label: 'Уволенных', value: data.summary.terminatedEmployees, icon: UserX, color: 'bg-red-500', link: '/employees' },
    { label: 'Ожидают согласования', value: data.summary.pendingLeaves, icon: CalendarClock, color: 'bg-yellow-500', link: '/leaves' },
    { label: 'Принято за месяц', value: data.summary.recentHires, icon: UserPlus, color: 'bg-purple-500', link: '/employees' },
    { label: 'В отпуске', value: data.summary.onLeaveEmployees, icon: Clock, color: 'bg-cyan-500', link: '/leaves' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Дашборд HR-аналитики</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map(card => (
          <div
            key={card.label}
            onClick={() => navigate(card.link)}
            className="card cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-xs text-gray-500">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Department */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Сотрудники по отделам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.byDepartment}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="department"
                label={({ department, count }) => `${department}: ${count}`}
              >
                {data.byDepartment.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Position */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Распределение по должностям</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byPosition} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="position" type="category" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hires by month */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Динамика приема сотрудников</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.hiresByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" name="Принято" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
