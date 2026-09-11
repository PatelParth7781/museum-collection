import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { Location } from '@/types';

export default function AdminLocations() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<(Location & { artifact_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ building: '', gallery: '', room: '', shelf_or_display: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('locations').select('*').order('building').order('gallery');
    if (error) { setError(true); setLoading(false); return; }
    const locs = data ?? [];
    const counts = await Promise.all(locs.map(async (l) => {
      const { count } = await supabase.from('artifacts').select('*', { count: 'exact', head: true }).eq('current_location_id', l.id);
      return { ...l, artifact_count: count ?? 0 };
    }));
    setLocations(counts);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditTarget(null); setForm({ building: '', gallery: '', room: '', shelf_or_display: '', description: '' }); setModalOpen(true); };
  const openEdit = (loc: Location) => { setEditTarget(loc); setForm({ building: loc.building, gallery: loc.gallery, room: loc.room ?? '', shelf_or_display: loc.shelf_or_display ?? '', description: loc.description }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.building.trim() || !form.gallery.trim()) { toast('Building and gallery are required', 'error'); return; }
    setFormLoading(true);
    const payload = { ...form, room: form.room || null, shelf_or_display: form.shelf_or_display || null };
    if (editTarget) {
      const { error } = await supabase.from('locations').update(payload).eq('id', editTarget.id);
      if (error) { toast('Failed to update location', 'error'); setFormLoading(false); return; }
      toast('Location updated', 'success');
      await logAction('location_updated', 'location', editTarget.id, `Location "${form.building} — ${form.gallery}" updated by ${profile?.email}`);
    } else {
      const { error } = await supabase.from('locations').insert(payload);
      if (error) { toast('Failed to create location', 'error'); setFormLoading(false); return; }
      toast('Location created', 'success');
      await logAction('location_created', 'location', null, `Location "${form.building} — ${form.gallery}" created by ${profile?.email}`);
    }
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('locations').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete location', 'error'); return; }
    toast('Location deleted', 'success');
    fetch();
  };

  const buildings = [...new Set(locations.map((l) => l.building))];

  return (
    <DashboardLayout title="Museum Locations">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Location</button>
      </div>
      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : locations.length === 0 ? (
        <div className="card"><EmptyState icon={<MapPin size={48} strokeWidth={1.5} />} title="No locations" message="Add your first museum location to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Location</button>} /></div>
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => (
            <div key={building}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className="text-stone-500" />
                <h3 className="font-serif font-semibold text-stone-800">{building}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.filter((l) => l.building === building).map((loc) => (
                  <div key={loc.id} className="card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-stone-800">{loc.gallery}</h4>
                        {loc.room && <p className="text-xs text-stone-500">Room: {loc.room}</p>}
                        {loc.shelf_or_display && <p className="text-xs text-stone-500">Display: {loc.shelf_or_display}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(loc)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(loc.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {loc.description && <p className="text-sm text-stone-500 mb-2">{loc.description}</p>}
                    <span className="badge bg-stone-100 text-stone-600">{loc.artifact_count ?? 0} artifact{(loc.artifact_count ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Location' : 'Add Location'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Building" required><TextInput value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="e.g. Main Building" /></FormField>
            <FormField label="Gallery" required><TextInput value={form.gallery} onChange={(e) => setForm({ ...form, gallery: e.target.value })} placeholder="e.g. Gallery A" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Room"><TextInput value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 101" /></FormField>
            <FormField label="Shelf / Display"><TextInput value={form.shelf_or_display} onChange={(e) => setForm({ ...form, shelf_or_display: e.target.value })} placeholder="e.g. Display Case 1" /></FormField>
          </div>
          <FormField label="Description"><TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Location" message="Are you sure? Artifacts in this location will have their location cleared." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
