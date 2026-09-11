import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Artifact } from '@/types';

export function SearchBar({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Artifact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('artifacts')
        .select('id, name, accession_number, origin')
        .or(`name.ilike.%${query.trim()}%,accession_number.ilike.%${query.trim()}%`)
        .eq('is_public', true)
        .limit(6);
      setSuggestions((data ?? []) as Artifact[]);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/collection?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
      setFocused(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'h-9' : 'h-11';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length >= 2) setShowSuggestions(true);
          }}
          placeholder="Search the collection..."
          className={`w-full ${sizeClasses} pl-10 pr-9 bg-stone-100 border border-transparent rounded-lg text-sm text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all`}
          aria-label="Search artifacts"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>
      {showSuggestions && focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 z-50 overflow-hidden animate-fade-in">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-stone-400" size={20} />
            </div>
          )}
          {!loading &&
            suggestions.map((s) => (
              <Link
                key={s.id}
                to={`/artifacts/${s.id}`}
                onClick={() => {
                  setShowSuggestions(false);
                  setQuery('');
                  setFocused(false);
                }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">{s.name}</p>
                  <p className="text-xs text-stone-400">{s.accession_number}</p>
                </div>
                {s.origin && <span className="text-xs text-stone-400">{s.origin}</span>}
              </Link>
            ))}
        </div>
      )}
      {showSuggestions && focused && !loading && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 z-50 py-4 px-4 text-sm text-stone-500 animate-fade-in">
          No artifacts found for "{query}"
        </div>
      )}
    </div>
  );
}

export function SearchResultsWrapper({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
