import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { HistoricalPeriod } from '@/types';

export default function AdminPeriods() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [periods, setPeriods] = useState<HistoricalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HistoricalPeriod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', start_year: '', end_year: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('historical_periods').select('*').order('start_year');
    if (error) setError(true);
    else setPeriods(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', start_year: '', end_year: '', description: '' }); setModalOpen(true); };
  const openEdit = (per: HistoricalPeriod) => { setEditTarget(per); setForm({ name: per.name, start_year: per.start_year?.toString() ?? '', end_year: per.end_year?.toString() ?? '', description: per.description }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Period name is required', 'error'); return; }
    setFormLoading(true);
    const payload = { name: form.name, start_year: form.start_year ? parseInt(form.start_year) : null, end_year: form.end_year ? parseInt(form.end_year) : null, description: form.description };
    if (editTarget) {
      const { error } = await supabase.from('historical_periods').update(payload).eq('id', editTarget.id);
      if (error) { toast('Failed to update period', 'error'); setFormLoading(false); return; }
      toast('Period updated', 'success');
      await logAction('period_updated', 'historical_period', editTarget.id, `Period "${form.name}" updated by ${profile?.email}`);
    } else {
      const { error } = await supabase.from('historical_periods').insert(payload);
      if (error) { toast('Failed to create period', 'error'); setFormLoading(false); return; }
      toast('Period created', 'success');
      await logAction('period_created', 'historical_period', null, `Period "${form.name}" created by ${profile?.email}`);
    }
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('historical_periods').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete period', 'error'); return; }
    toast('Period deleted', 'success');
    fetch();
  };

  return (
    <DashboardLayout title="Historical Periods">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Period</button>
      </div>
      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : periods.length === 0 ? (
        <div className="card"><EmptyState icon={<History size={48} strokeWidth={1.5} />} title="No historical periods" message="Add your first historical period to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Period</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map((per) => (
            <div key={per.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-serif font-semibold text-stone-800">{per.name}</h3>
                  {(per.start_year !== null || per.end_year !== null) && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {per.start_year !== null ? (per.start_year < 0 ? Math.abs(per.start_year) + ' BCE' : per.start_year) : '?'} — {per.end_year !== null ? (per.end_year < 0 ? Math.abs(per.end_year) + ' BCE' : per.end_year) : '?'}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(per)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteTarget(per.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-stone-500 line-clamp-3">{per.description}</p>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Historical Period' : 'Add Historical Period'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mughal Empire" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Year" help="Use negative for BCE (e.g. -322)"><TextInput type="number" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} placeholder="e.g. 1526" /></FormField>
            <FormField label="End Year"><TextInput type="number" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} placeholder="e.g. 1857" /></FormField>
          </div>
          <FormField label="Description"><TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Historical Period" message="Are you sure? This cannot be undone." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
