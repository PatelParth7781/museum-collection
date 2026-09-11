import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <p className="text-sm text-stone-500">
        Showing <span className="font-medium text-stone-700">{start}</span>–
        <span className="font-medium text-stone-700">{end}</span> of{' '}
        <span className="font-medium text-stone-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="First page"
        >
          <ChevronsLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="px-3 py-1.5 text-sm font-medium text-stone-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Last page"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
}
