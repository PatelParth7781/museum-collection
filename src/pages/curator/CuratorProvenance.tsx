import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ScrollText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea, SelectField } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { ArtifactWithRelations, ProvenanceRecord } from '@/types';

export default function CuratorProvenance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<(ProvenanceRecord & { artifact?: ArtifactWithRelations })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [form, setForm] = useState({ artifact_id: '', owner_name: '', location: '', start_date: '', end_date: '', ownership_type: 'private', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error } = await supabase
      .from('provenance_records')
      .select('*, artifact:artifacts(*, artifact_images(*), category:categories(*))')
      .order('start_date', { ascending: true });
    if (error) { setError(true); setLoading(false); return; }
    setRecords(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    supabase.from('artifacts').select('*, artifact_images(*), category:categories(*)').order('name').limit(100).then(({ data }) => setArtifacts(data ?? []));
  }, [fetch]);

  const openCreate = () => {
    setForm({ artifact_id: '', owner_name: '', location: '', start_date: '', end_date: '', ownership_type: 'private', description: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artifact_id) { toast('Please select an artifact', 'error'); return; }
    if (!form.owner_name.trim()) { toast('Owner name is required', 'error'); return; }
    setFormLoading(true);
    const payload = {
      artifact_id: form.artifact_id,
      owner_name: form.owner_name,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      ownership_type: form.ownership_type,
      description: form.description || null,
    };
    const { error } = await supabase.from('provenance_records').insert(payload);
    if (error) { toast('Failed to add provenance record', 'error'); setFormLoading(false); return; }
    toast('Provenance record added', 'success');
    const artName = artifacts.find((a) => a.id === form.artifact_id)?.name ?? 'Unknown';
    await logAction('provenance_added', 'provenance_record', null, `Provenance record for "${artName}" added by ${profile?.email}`);
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('provenance_records').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete record', 'error'); return; }
    toast('Provenance record deleted', 'success');
    fetch();
  };

  return (
    <DashboardLayout title="Provenance Management">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Provenance Record</button>
      </div>

      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : records.length === 0 ? (
        <div className="card"><EmptyState icon={<ScrollText size={48} strokeWidth={1.5} />} title="No provenance records" message="Add your first provenance record to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Record</button>} /></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            records.reduce((acc, r) => {
              const key = r.artifact_id;
              if (!acc[key]) acc[key] = { artifact: r.artifact, records: [] };
              acc[key].records.push(r);
              return acc;
            }, {} as Record<string, { artifact?: ArtifactWithRelations; records: typeof records }>)
          ).map(([artifactId, group]) => (
            <div key={artifactId} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <Link to={`/artifacts/${artifactId}`} className="font-serif font-semibold text-stone-800 hover:text-amber-700">{group.artifact?.name ?? 'Unknown Artifact'}</Link>
                <span className="text-xs text-stone-400">{group.records.length} record{group.records.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {group.records.map((r, i) => (
                  <div key={r.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">{i + 1}</div>
                      {i < group.records.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 mt-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-stone-800">{r.owner_name}</p>
                          {r.location && <p className="text-sm text-stone-500">{r.location}</p>}
                          <p className="text-xs text-stone-400 mt-0.5">
                            {r.start_date ? new Date(r.start_date).toLocaleDateString() : '?'} — {r.end_date ? new Date(r.end_date).toLocaleDateString() : 'present'}
                            {' '}({r.ownership_type})
                          </p>
                          {r.description && <p className="text-sm text-stone-600 mt-1">{r.description}</p>}
                        </div>
                        <button onClick={() => setDeleteTarget(r.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Provenance Record" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Artifact" required>
            <SelectField value={form.artifact_id} onChange={(e) => setForm({ ...form, artifact_id: e.target.value })}>
              <option value="">Select artifact...</option>
              {artifacts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.accession_number})</option>)}
            </SelectField>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Owner Name" required><TextInput value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="e.g. Private Collection" /></FormField>
            <FormField label="Location"><TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Paris, France" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date"><TextInput type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></FormField>
            <FormField label="End Date"><TextInput type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></FormField>
          </div>
          <FormField label="Ownership Type">
            <SelectField value={form.ownership_type} onChange={(e) => setForm({ ...form, ownership_type: e.target.value })}>
              <option value="private">Private</option><option value="institutional">Institutional</option>
              <option value="government">Government</option><option value="religious">Religious</option><option value="unknown">Unknown</option>
            </SelectField>
          </FormField>
          <FormField label="Description"><TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? <Loader2 className="animate-spin" size={16} /> : null}{formLoading ? 'Saving...' : 'Add Record'}</button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Provenance Record" message="Are you sure? This cannot be undone." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
