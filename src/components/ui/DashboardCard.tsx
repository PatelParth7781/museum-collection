import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export function DashboardCard({
  label,
  value,
  icon: Icon,
  color = 'stone',
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'stone' | 'amber' | 'blue' | 'green' | 'red' | 'purple';
  subtitle?: string;
}) {
  const colorMap: Record<string, string> = {
    stone: 'bg-stone-100 text-stone-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="card relative p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="min-w-0 pr-11">
        <p className="min-h-10 text-sm font-medium leading-5 text-stone-500">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-stone-800 mt-1.5 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-stone-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`absolute right-4 top-4 p-2.5 rounded-xl ${colorMap[color]}`}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-stone-800">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
