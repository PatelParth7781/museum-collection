import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/FormField';
import type { AuditLog, Profile } from '@/types';

const PAGE_SIZE = 20;

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<(AuditLog & { user?: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase.from('audit_logs').select('*, user:profiles(*)', { count: 'exact' });
    if (search) query = query.or(`action.ilike.%${search}%,description.ilike.%${search}%`);
    if (actionFilter) query = query.eq('action', actionFilter);
    query = query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) setError(true);
    else { setLogs(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  }, [search, actionFilter, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const uniqueActions = [...new Set(logs.map((l) => l.action))].filter(Boolean);

  return (
    <DashboardLayout title="Audit Logs">
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..." className="input-field pl-10" />
        </div>
        <SelectField value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </SelectField>
      </div>

      {loading ? <div className="card p-6"><TableSkeleton rows={10} /></div> : error ? <ErrorState onRetry={fetch} /> : logs.length === 0 ? (
        <div className="card"><EmptyState icon={<ScrollText size={48} strokeWidth={1.5} />} title="No audit logs" message="No activity has been recorded yet." /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['User', 'Action', 'Entity', 'Description', 'Date/Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-stone-700">{log.user?.full_name ?? log.user?.email ?? 'System'}</td>
                    <td className="px-4 py-3"><span className="badge bg-stone-100 text-stone-700">{log.action}</span></td>
                    <td className="px-4 py-3 text-sm text-stone-600">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-600 max-w-xs truncate">{log.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-stone-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
