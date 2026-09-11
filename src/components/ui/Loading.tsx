import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      <Loader2 className="animate-spin text-stone-400" size={size} />
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size={40} />
    </div>
  );
}

export function InlineSpinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={16} />;
}

export function ButtonSpinner() {
  return <Loader2 className="animate-spin" size={16} />;
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="h-48 bg-stone-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-stone-200 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-stone-200 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-8 bg-stone-200 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingOverlay({ children }: { children?: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <LoadingSpinner size={32} />
      </div>
      {children}
    </div>
  );
}
