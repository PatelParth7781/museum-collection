import { type ReactNode } from 'react';
import { Inbox, AlertCircle, RotateCw } from 'lucide-react';

export function EmptyState({
  title = 'No results found',
  message = 'There are no items to display.',
  icon,
  action,
}: {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-stone-300">
        {icon ?? <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-semibold text-stone-700 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-500 max-w-md mb-6">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-red-300">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-stone-700 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          <RotateCw size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
