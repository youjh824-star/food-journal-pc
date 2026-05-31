import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, BookOpen, FlaskConical, Cpu,
  Beaker, BarChart3, FileText, Calculator, Settings, Menu, X, CheckSquare, ScrollText,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/upload', icon: Upload, label: '결과파일 업로드' },
  { to: '/worklogs', icon: BookOpen, label: '업무일지' },
  { to: '/samples', icon: FlaskConical, label: '샘플 관리' },
  { to: '/equipment', icon: Cpu, label: '장비 관리' },
  { to: '/reagents', icon: Beaker, label: '시약 관리' },
  { to: '/todos', icon: CheckSquare, label: '할 일 관리' },
  { to: '/methods', icon: ScrollText, label: '실험법 자료' },
  { to: '/statistics', icon: BarChart3, label: '업무 통계' },
  { to: '/reports', icon: FileText, label: '리포트 생성' },
  { to: '/calculator', icon: Calculator, label: '계산기' },
  { to: '/settings', icon: Settings, label: '설정' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={clsx(
          'bg-navy-800 border-r border-navy-600 flex flex-col transition-all duration-200',
          sidebarOpen ? 'w-56' : 'w-16',
        )}
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-navy-600">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-accent" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm text-white">Lab Work Log</h1>
              <p className="text-[10px] text-slate-light">분석실 업무 자동화</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-md',
                  isActive
                    ? 'bg-accent/15 text-accent-light font-medium'
                    : 'text-slate-light hover:text-white hover:bg-navy-700',
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-navy-800 border-b border-navy-600 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-light hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <span className="text-xs text-slate-light font-mono">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-navy-900">{children}</main>
      </div>
    </div>
  );
}
