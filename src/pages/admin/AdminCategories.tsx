import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { Category } from '@/types';

export default function AdminCategories() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) setError(true);
    else setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', description: '' }); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditTarget(cat); setForm({ name: cat.name, description: cat.description }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Category name is required', 'error'); return; }
    setFormLoading(true);
    if (editTarget) {
      const { error } = await supabase.from('categories').update(form).eq('id', editTarget.id);
      if (error) { toast('Failed to update category', 'error'); setFormLoading(false); return; }
      toast('Category updated', 'success');
      await logAction('category_updated', 'category', editTarget.id, `Category "${form.name}" updated by ${profile?.email}`);
    } else {
      const { error } = await supabase.from('categories').insert(form);
      if (error) { toast('Failed to create category', 'error'); setFormLoading(false); return; }
      toast('Category created', 'success');
      await logAction('category_created', 'category', null, `Category "${form.name}" created by ${profile?.email}`);
    }
    setFormLoading(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget);
    if (error) { toast('Failed to delete category — it may be in use', 'error'); return; }
    toast('Category deleted', 'success');
    fetch();
  };

  return (
    <DashboardLayout title="Categories">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Category</button>
      </div>
      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : categories.length === 0 ? (
        <div className="card"><EmptyState icon={<Tags size={48} strokeWidth={1.5} />} title="No categories" message="Create your first category to get started." action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Category</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-serif font-semibold text-stone-800">{cat.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteTarget(cat.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-stone-500">{cat.description}</p>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sculpture" /></FormField>
          <FormField label="Description"><TextArea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Category" message="Are you sure? This cannot be undone." confirmLabel="Delete" danger />
    </DashboardLayout>
  );
}
