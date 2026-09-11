import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Brush, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea, SelectField } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { ArtifactWithRelations, ConservationRecord } from '@/types';

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700', good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700', poor: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700', restored: 'bg-purple-100 text-purple-700',
};

export default function CuratorConservation() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<(ConservationRecord & { artifact?: ArtifactWithRelations })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [form, setForm] = useState({ artifact_id: '', assessment_date: '', condition: 'good', treatment: '', conservator: '', treatment_date: '', next_inspection_date: '', notes: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [attentionArtifacts, setAttentionArtifacts] = useState<any[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error } = await supabase
      .from('conservation_records')
      .select('*, artifact:artifacts(*, artifact_images(*), category:categories(*))')
      .order('assessment_date', { ascending: false });
    if (error) { setError(true); setLoading(false); return; }
    setRecords(data ?? []);
    const overdue = (data ?? []).filter((r) => r.next_inspection_date && new Date(r.next_inspection_date) < new Date());
    setAttentionArtifacts(overdue);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    supabase.from('artifacts').select('*, artifact_images(*), category:categories(*)').order('name').limit(100).then(({ data }) => setArtifacts(data ?? []));
  }, [fetch]);

  const openCreate = () => {
    setForm({ artifact_id: '', assessment_date: new Date().toISOString().slice(0, 10), condition: 'good', treatment: '', conservator: '', treatment_date: '', next_inspection_date: '', notes: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artifact_id) { toast('Please select an artifact', 'error'); return; }
    if (!form.assessment_date) { toast('Assessment date is required', 'error'); return; }
    setFormLoading(true);
    const payload = {
      artifact_id: form.artifact_id,
      assessment_date: form.assessment_date,
      condition: form.condition,
      treatment: form.treatment || null,
      conservator: form.conservator || null,
      treatment_date: form.treatment_date || null,
      next_inspection_date: form.next_inspection_date || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from('conservation_records').insert(payload);
    if (error) { toast('Failed to add conservation record', 'error'); setFormLoading(false); return; }
    toast('Conservation record added', 'success');
    const artName = artifacts.find((a) => a.id === form.artifact_id)?.name ?? 'Unknown';
    await logAction('conservation_added', 'conservation_record', null, `Conservation record for "${artName}" added by ${profile?.email}`);
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('conservation_records').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete record', 'error'); return; }
    toast('Conservation record deleted', 'success');
    fetch();
  };

  return (
    <DashboardLayout title="Conservation Management">
      {/* Attention section */}
      {attentionArtifacts.length > 0 && (
        <div className="card p-5 mb-6 border-red-200 bg-red-50/50">
          <h3 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Artifacts Requiring Attention ({attentionArtifacts.length})
          </h3>
          <div className="space-y-2">
            {attentionArtifacts.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-stone-800">{r.artifact?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-stone-500">{r.artifact?.accession_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-red-600 font-medium">Overdue inspection</p>
                  <p className="text-xs text-stone-400">{r.next_inspection_date ? new Date(r.next_inspection_date).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Conservation Record</button>
      </div>

      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : records.length === 0 ? (
        <div className="card"><EmptyState icon={<Brush size={48} strokeWidth={1.5} />} title="No conservation records" message="Add your first conservation record to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Record</button>} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>{['Artifact', 'Assessment Date', 'Condition', 'Treatment', 'Conservator', 'Next Inspection', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3"><Link to={`/artifacts/${r.artifact_id}`} className="font-medium text-stone-800 hover:text-amber-700">{r.artifact?.name ?? '—'}</Link></td>
                    <td className="px-4 py-3 text-sm text-stone-600">{new Date(r.assessment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`badge ${conditionColors[r.condition]}`}>{r.condition}</span></td>
                    <td className="px-4 py-3 text-sm text-stone-600 max-w-xs truncate">{r.treatment || '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{r.conservator || '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">{r.next_inspection_date ? new Date(r.next_inspection_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => setDeleteTarget(r.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Conservation Record" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Artifact" required>
            <SelectField value={form.artifact_id} onChange={(e) => setForm({ ...form, artifact_id: e.target.value })}>
              <option value="">Select artifact...</option>
              {artifacts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.accession_number})</option>)}
            </SelectField>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Assessment Date" required><TextInput type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} /></FormField>
            <FormField label="Condition" required>
              <SelectField value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                <option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option>
                <option value="poor">Poor</option><option value="critical">Critical</option><option value="restored">Restored</option>
              </SelectField>
            </FormField>
          </div>
          <FormField label="Treatment"><TextArea rows={2} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="Describe the treatment applied..." /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Conservator"><TextInput value={form.conservator} onChange={(e) => setForm({ ...form, conservator: e.target.value })} placeholder="Name of conservator" /></FormField>
            <FormField label="Treatment Date"><TextInput type="date" value={form.treatment_date} onChange={(e) => setForm({ ...form, treatment_date: e.target.value })} /></FormField>
          </div>
          <FormField label="Next Inspection Date"><TextInput type="date" value={form.next_inspection_date} onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })} /></FormField>
          <FormField label="Notes"><TextArea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? <Loader2 className="animate-spin" size={16} /> : null}{formLoading ? 'Saving...' : 'Add Record'}</button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Conservation Record" message="Are you sure? This cannot be undone." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
