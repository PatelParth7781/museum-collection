import { Star } from 'lucide-react';

export function StarRating({
  rating,
  size = 16,
  className = '',
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}
        />
      ))}
    </div>
  );
}

export function InteractiveStarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          className={`transition-transform ${disabled ? 'cursor-default' : 'hover:scale-110'}`}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={s <= value ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
          />
        </button>
      ))}
    </div>
  );
}
