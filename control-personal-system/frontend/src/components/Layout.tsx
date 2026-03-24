import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { roleLabels, canAccess } from '../utils/helpers';
import {
  LayoutDashboard, Users, Building2, Briefcase, CalendarDays,
  CalendarOff, History, FileBarChart, User, Bell, LogOut, Menu, X, ChevronDown
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setUnreadCount(data.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/notifications').then(({ data }) => setUnreadCount(data.unreadCount)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard, roles: ['ADMIN', 'HR_MANAGER'] },
    { to: '/employees', label: 'Сотрудники', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'MANAGER'] },
    { to: '/departments', label: 'Отделы', icon: Building2, roles: ['ADMIN', 'HR_MANAGER', 'MANAGER'] },
    { to: '/positions', label: 'Должности', icon: Briefcase, roles: ['ADMIN', 'HR_MANAGER'] },
    { to: '/leaves', label: 'Отпуска', icon: CalendarDays, roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE'] },
    { to: '/absences', label: 'Отсутствия', icon: CalendarOff, roles: ['ADMIN', 'HR_MANAGER', 'MANAGER'] },
    { to: '/history', label: 'Кадровая история', icon: History, roles: ['ADMIN', 'HR_MANAGER'] },
    { to: '/reports', label: 'Отчеты', icon: FileBarChart, roles: ['ADMIN', 'HR_MANAGER'] },
    { to: '/profile', label: 'Мой профиль', icon: User, roles: ['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE'] },
  ];

  const filteredNav = navItems.filter(item => user && canAccess(user.role, ...item.roles));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 fixed h-full z-20`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-800">HR System</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {filteredNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-200`}>
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium text-sm">
                  {user?.employeeName?.[0] || user?.username[0]?.toUpperCase()}
                </div>
                {sidebarOpen && (
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-700">{user?.employeeName || user?.username}</div>
                    <div className="text-xs text-gray-500">{roleLabels[user?.role || '']}</div>
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Мой профиль
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
