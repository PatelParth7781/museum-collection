import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, Loader2, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ArtifactCard } from '@/components/ArtifactCard';
import { GridSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/FormField';
import type { ArtifactWithRelations, Category, Artist, HistoricalPeriod, Location } from '@/types';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'All Conditions' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
  { value: 'restored', label: 'Restored' },
];

export default function CollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const { toast } = useToast();
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    period: '',
    artist: '',
    material: '',
    location: '',
    condition: '',
    sort: 'newest',
  });
  const [filterOptions, setFilterOptions] = useState<{
    categories: Category[];
    periods: HistoricalPeriod[];
    artists: Artist[];
    locations: Location[];
  }>({ categories: [], periods: [], artists: [], locations: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [aiSearch, setAiSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [likedCategories, setLikedCategories] = useState<Set<string>>(new Set());
  const [categoryLikeCounts, setCategoryLikeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('historical_periods').select('*').order('start_year'),
      supabase.from('artists').select('*').order('name'),
      supabase.from('locations').select('*').order('building'),
    ]).then(([cat, per, art, loc]) => {
      setFilterOptions({
        categories: cat.data ?? [],
        periods: per.data ?? [],
        artists: art.data ?? [],
        locations: loc.data ?? [],
      });
    });
  }, []);

  useEffect(() => {
    if (!session?.user) { setLikedCategories(new Set()); return; }
    Promise.all([
      supabase.from('category_likes').select('category_id').eq('user_id', session.user.id),
    ]).then(([likes]) => {
      setLikedCategories(new Set((likes.data ?? []).map((l: any) => l.category_id)));
    });
  }, [session?.user]);

  useEffect(() => {
    supabase.from('category_likes').select('category_id').then(({ data }) => {
      const counts: Record<string, number> = {};
      (data ?? []).forEach((l: any) => { counts[l.category_id] = (counts[l.category_id] ?? 0) + 1; });
      setCategoryLikeCounts(counts);
    });
  }, [likedCategories]);

  const toggleCategoryLike = async (categoryId: string, categoryName: string) => {
    if (!session?.user) { toast('Please sign in to like categories', 'info'); return; }
    if (likedCategories.has(categoryId)) {
      await supabase.from('category_likes').delete().eq('user_id', session.user.id).eq('category_id', categoryId);
      setLikedCategories((prev) => { const next = new Set(prev); next.delete(categoryId); return next; });
      toast(`Unliked "${categoryName}"`, 'info');
    } else {
      await supabase.from('category_likes').insert({ user_id: session.user.id, category_id: categoryId });
      setLikedCategories((prev) => new Set(prev).add(categoryId));
      toast(`Liked "${categoryName}"`, 'success');
    }
  };

  const fetchArtifacts = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('artifacts')
      .select('*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*)', { count: 'exact' })
      .eq('is_public', true);

    if (filters.q) {
      query = query.or(`name.ilike.%${filters.q}%,accession_number.ilike.%${filters.q}%,origin.ilike.%${filters.q}%,material.ilike.%${filters.q}%`);
    }
    if (filters.category) query = query.eq('category_id', filters.category);
    if (filters.period) query = query.eq('historical_period_id', filters.period);
    if (filters.artist) query = query.eq('artist_id', filters.artist);
    if (filters.material) query = query.ilike('material', `%${filters.material}%`);
    if (filters.location) query = query.eq('current_location_id', filters.location);
    if (filters.condition) query = query.eq('condition', filters.condition);

    switch (filters.sort) {
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      case 'name_asc': query = query.order('name', { ascending: true }); break;
      case 'name_desc': query = query.order('name', { ascending: false }); break;
      default: query = query.order('created_at', { ascending: false });
    }

    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) {
      setError(true);
    } else {
      const visibleArtifacts = (data ?? []) as ArtifactWithRelations[];
      const withSummaries = await Promise.all(
        visibleArtifacts.map(async (artifact) => {
          const { data: summary } = await supabase.rpc('get_artifact_review_summary', { artifact_uuid: artifact.id });
          return { ...artifact, review_summary: summary?.[0] ?? null };
        }),
      );
      setArtifacts(withSummaries);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { fetchArtifacts(); }, [fetchArtifacts]);

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ q: '', category: '', period: '', artist: '', material: '', location: '', condition: '', sort: 'newest' });
    setSearchParams({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '' && v !== 'newest');

  const handleAiSearch = async () => {
    if (!aiSearch.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query: aiSearch },
      });
      if (error || !data) throw new Error('AI search failed');
      setFilters((prev) => ({
        ...prev,
        q: data.search_text || '',
        category: data.category_id || '',
        period: data.period_id || '',
        condition: data.condition || '',
        material: data.material || '',
      }));
      setPage(1);
    } catch {
      setFilters((prev) => ({ ...prev, q: aiSearch }));
      setPage(1);
    } finally {
      setAiLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-800">Collection</h1>
        <p className="text-stone-500 mt-1">Browse our complete collection of historical artifacts</p>
      </div>

      {/* AI Search */}
      <div className="card p-4 mb-6 bg-amber-50/50 border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-amber-600" />
          <span className="text-sm font-medium text-stone-700">AI-Powered Natural Language Search</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiSearch}
            onChange={(e) => setAiSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            placeholder="e.g. 'Show me ancient Indian stone sculptures' or 'Find bronze artifacts in good condition'"
            className="input-field flex-1"
          />
          <button onClick={handleAiSearch} disabled={aiLoading} className="btn-primary whitespace-nowrap">
            {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {aiLoading ? 'Searching...' : 'AI Search'}
          </button>
        </div>
      </div>

      {/* Category Like Bar */}
      {filterOptions.categories.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Browse by Category — Click to filter, tap the heart to like</p>
          <div className="flex flex-wrap gap-2">
            {filterOptions.categories.map((cat) => {
              const isLiked = likedCategories.has(cat.id);
              const likeCount = categoryLikeCounts[cat.id] ?? 0;
              const isActive = filters.category === cat.id;
              return (
                <div key={cat.id} className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <button
                    onClick={() => updateFilter('category', isActive ? '' : cat.id)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-stone-800 text-amber-400' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                  <button
                    onClick={() => toggleCategoryLike(cat.id, cat.name)}
                    className={`flex items-center gap-1 px-2.5 py-2 border-l border-stone-200 transition-colors ${
                      isLiked ? 'text-red-500 hover:bg-red-50' : 'text-stone-400 hover:bg-stone-50'
                    }`}
                    aria-label={isLiked ? `Unlike ${cat.name}` : `Like ${cat.name}`}
                  >
                    <Heart size={14} className={isLiked ? 'fill-red-500' : ''} />
                    {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter toggle */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Search by name, accession number, origin, material..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary lg:hidden ${showFilters ? 'bg-stone-100' : ''}`}
        >
          <SlidersHorizontal size={18} /> Filters
        </button>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
        <SelectField value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {filterOptions.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
          <option value="">All Periods</option>
          {filterOptions.periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        <SelectField value={filters.artist} onChange={(e) => updateFilter('artist', e.target.value)}>
          <option value="">All Artists</option>
          {filterOptions.artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </SelectField>
        <SelectField value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}>
          <option value="">All Locations</option>
          {filterOptions.locations.map((l) => <option key={l.id} value={l.id}>{l.building} — {l.gallery}</option>)}
        </SelectField>
        <input
          type="text"
          value={filters.material}
          onChange={(e) => updateFilter('material', e.target.value)}
          placeholder="Filter by material..."
          className="input-field"
        />
        <SelectField value={filters.condition} onChange={(e) => updateFilter('condition', e.target.value)}>
          {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </SelectField>
        <SelectField value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </SelectField>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            <X size={16} /> Clear Filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <GridSkeleton count={8} />
      ) : error ? (
        <ErrorState onRetry={fetchArtifacts} />
      ) : artifacts.length === 0 ? (
        <EmptyState
          title="No artifacts found"
          message="Try adjusting your search or filters to find what you're looking for."
          action={<button onClick={clearFilters} className="btn-secondary">Clear all filters</button>}
        />
      ) : (
        <>
          <p className="text-sm text-stone-500 mb-4">{total} artifact{total !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artifacts.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}
