import clsx from 'clsx';
import { Upload } from 'lucide-react';

export function KPICard({ label, value, unit, trend }: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="kpi-card">
      <span className="text-xs text-slate-light uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-2xl font-bold font-mono', trend === 'up' ? 'text-accent-light' : 'text-white')}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-light">{unit}</span>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-light mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function FormField({ label, hint, children, className }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-slate-light block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-lab mt-0.5">{hint}</p>}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
  const colors = {
    default: 'bg-navy-700 text-slate-light',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    error: 'bg-red-900/50 text-red-400',
    info: 'bg-accent/20 text-accent-light',
  };
  return (
    <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium', colors[variant])}>
      {children}
    </span>
  );
}

export function DataTable({ columns, data }: {
  columns: { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[];
  data: Record<string, unknown>[];
}) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full">
        <thead className="bg-navy-900/50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table-header">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-600">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="table-cell text-center text-slate-light py-8">데이터 없음</td></tr>
          ) : data.map((row, i) => (
            <tr key={i} className="hover:bg-navy-700/30 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="table-cell">
                  {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DropZone({ onDrop, processing }: {
  onDrop: (files: FileList) => void;
  processing?: boolean;
}) {
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className="border-2 border-dashed border-navy-600 rounded-xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer bg-navy-800/50"
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv,.txt"
        multiple
        onChange={(e) => e.target.files && onDrop(e.target.files)}
      />
      {processing ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-accent-light font-medium">파일 분석 중...</p>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 text-accent mx-auto mb-4 opacity-60" />
          <p className="text-white font-medium mb-1">결과파일을 드래그앤드롭</p>
          <p className="text-sm text-slate-light">Excel (.xlsx, .xls), CSV, TXT 지원</p>
          <p className="text-xs text-slate-lab mt-2">ICP-MS · HPLC · GC · LC/MS · UV · 수분측정기</p>
        </>
      )}
    </div>
  );
}

export function AlertItem({ severity, message }: { severity: string; message: string }) {
  const variant = severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info';
  return (
    <div className={clsx('flex items-start gap-2 p-2 rounded text-sm', {
      'bg-red-900/20 text-red-300': variant === 'error',
      'bg-yellow-900/20 text-yellow-300': variant === 'warning',
      'bg-accent/10 text-accent-light': variant === 'info',
    })}>
      <span className="font-mono text-xs uppercase mt-0.5">{severity}</span>
      <span>{message}</span>
    </div>
  );
}
