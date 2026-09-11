import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Package } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/FormField';
import type { ArtifactWithRelations, Category } from '@/types';

const PAGE_SIZE = 10;

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700', good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700', poor: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700', restored: 'bg-purple-100 text-purple-700',
};

export default function CuratorArtifacts() {
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []));
  }, []);

  const fetchArtifacts = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('artifacts')
      .select('*, category:categories(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (search) query = query.or(`name.ilike.%${search}%,accession_number.ilike.%${search}%`);
    if (categoryFilter) query = query.eq('category_id', categoryFilter);
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) setError(true);
    else { setArtifacts(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, categoryFilter, page]);

  useEffect(() => { fetchArtifacts(); }, [fetchArtifacts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout title="Artifact Management">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search artifacts..." className="input-field pl-10" />
          </div>
          <SelectField value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-auto">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
        </div>
        <Link to="/curator/artifacts/new" className="btn-primary whitespace-nowrap"><Plus size={18} /> Add Artifact</Link>
      </div>

      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetchArtifacts} /> : artifacts.length === 0 ? (
        <div className="card"><EmptyState icon={<Package size={48} strokeWidth={1.5} />} title="No artifacts found" message="Try adjusting your filters or add a new artifact." action={<Link to="/curator/artifacts/new" className="btn-primary"><Plus size={16} /> Add Artifact</Link>} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>{['Image', 'Accession #', 'Name', 'Category', 'Condition', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {artifacts.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {a.artifact_images?.[0] ? <img src={a.artifact_images[0].image_url} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><Package size={20} /></div>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-stone-500 whitespace-nowrap">{a.accession_number}</td>
                    <td className="px-4 py-3"><Link to={`/artifacts/${a.id}`} className="font-medium text-stone-800 hover:text-amber-700">{a.name}</Link></td>
                    <td className="px-4 py-3 text-sm text-stone-600">{a.category?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${conditionColors[a.condition]}`}>{a.condition}</span></td>
                    <td className="px-4 py-3"><span className="badge bg-stone-100 text-stone-600 capitalize">{a.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/artifacts/${a.id}`} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100" aria-label="View"><Eye size={16} /></Link>
                        <Link to={`/admin/artifacts/${a.id}/edit`} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50" aria-label="Edit"><Pencil size={16} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-stone-100"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} /></div>
        </div>
      )}
    </DashboardLayout>
  );
}
