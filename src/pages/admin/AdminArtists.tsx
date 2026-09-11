import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { Artist } from '@/types';

export default function AdminArtists() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Artist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', biography: '', birth_year: '', death_year: '', nationality: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('artists').select('*').order('name');
    if (error) setError(true);
    else setArtists(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', biography: '', birth_year: '', death_year: '', nationality: '' }); setModalOpen(true); };
  const openEdit = (art: Artist) => { setEditTarget(art); setForm({ name: art.name, biography: art.biography, birth_year: art.birth_year?.toString() ?? '', death_year: art.death_year?.toString() ?? '', nationality: art.nationality }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Artist name is required', 'error'); return; }
    setFormLoading(true);
    const payload = { name: form.name, biography: form.biography, birth_year: form.birth_year ? parseInt(form.birth_year) : null, death_year: form.death_year ? parseInt(form.death_year) : null, nationality: form.nationality };
    if (editTarget) {
      const { error } = await supabase.from('artists').update(payload).eq('id', editTarget.id);
      if (error) { toast('Failed to update artist', 'error'); setFormLoading(false); return; }
      toast('Artist updated', 'success');
      await logAction('artist_updated', 'artist', editTarget.id, `Artist "${form.name}" updated by ${profile?.email}`);
    } else {
      const { error } = await supabase.from('artists').insert(payload);
      if (error) { toast('Failed to create artist', 'error'); setFormLoading(false); return; }
      toast('Artist created', 'success');
      await logAction('artist_created', 'artist', null, `Artist "${form.name}" created by ${profile?.email}`);
    }
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('artists').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete artist', 'error'); return; }
    toast('Artist deleted', 'success');
    fetch();
  };

  return (
    <DashboardLayout title="Artists & Creators">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Artist</button>
      </div>
      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : artists.length === 0 ? (
        <div className="card"><EmptyState icon={<Users size={48} strokeWidth={1.5} />} title="No artists" message="Add your first artist to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Artist</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((art) => (
            <div key={art.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-serif font-semibold text-stone-800">{art.name}</h3>
                  {art.nationality && <p className="text-xs text-stone-500">{art.nationality}</p>}
                  {(art.birth_year || art.death_year) && <p className="text-xs text-stone-400 mt-0.5">{art.birth_year ?? '?'} — {art.death_year ?? '?'}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(art)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteTarget(art.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-stone-500 line-clamp-3">{art.biography}</p>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Artist' : 'Add Artist'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Master Bihari" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Birth Year"><TextInput type="number" value={form.birth_year} onChange={(e) => setForm({ ...form, birth_year: e.target.value })} placeholder="e.g. 1740" /></FormField>
            <FormField label="Death Year"><TextInput type="number" value={form.death_year} onChange={(e) => setForm({ ...form, death_year: e.target.value })} placeholder="e.g. 1810" /></FormField>
          </div>
          <FormField label="Nationality"><TextInput value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Indian" /></FormField>
          <FormField label="Biography"><TextArea rows={4} value={form.biography} onChange={(e) => setForm({ ...form, biography: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Artist" message="Are you sure? This cannot be undone." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
