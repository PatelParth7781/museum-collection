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
    <div className="card p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between min-w-0">
      {/* Top row: Label and Icon side-by-side with no overlap */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-xs font-medium text-stone-500 leading-snug line-clamp-2 min-w-0"
          title={label}
        >
          {label}
        </p>
        <div className={`p-1.5 rounded-lg shrink-0 ${colorMap[color]}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>

      {/* Bottom row: Value and Subtitle */}
      <div>
        <p className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight leading-none">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-stone-400 mt-1 truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
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