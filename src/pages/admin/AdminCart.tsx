import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Trash2, Search, Package, X, Loader2,
  ChevronDown, ChevronRight, User, Calendar, Package as PackageIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/lib/audit';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { FormField, TextInput, TextArea, SelectField } from '@/components/ui/FormField';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Loading';
import type { CartWithRelations, ArtifactWithRelations, Profile } from '@/types';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  checked_out: 'bg-blue-100 text-blue-700',
  abandoned: 'bg-stone-100 text-stone-500',
};

export default function AdminCart() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [carts, setCarts] = useState<CartWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTargetCart, setAddTargetCart] = useState<CartWithRelations | null>(null);
  const [deleteCartTarget, setDeleteCartTarget] = useState<string | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ cartId: string; itemId: string } | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [artifactSearch, setArtifactSearch] = useState('');
  const [addForm, setAddForm] = useState({ artifact_id: '', quantity: 1, notes: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ user_id: '', notes: '' });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('carts')
      .select('*, user:profiles(id, full_name, email), cart_items(*, artifact:artifacts(*, artifact_images(*), category:categories(*)))')
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (error) { setError(true); setLoading(false); return; }
    let filtered = data ?? [];
    if (search) {
      filtered = filtered.filter((c: any) =>
        c.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.cart_items?.some((ci: any) => ci.artifact?.name?.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setCarts(filtered as CartWithRelations[]);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCarts();
    supabase.from('artifacts').select('*, artifact_images(*), category:categories(*)').eq('is_public', true).order('name').limit(100).then(({ data }) => setArtifacts(data ?? []));
    supabase.from('profiles').select('*').order('full_name').then(({ data }) => setUsers(data ?? []));
  }, [fetchCarts]);

  const openAddModal = (cart: CartWithRelations) => {
    setAddTargetCart(cart);
    setAddForm({ artifact_id: '', quantity: 1, notes: '' });
    setArtifactSearch('');
    setAddModalOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTargetCart) return;
    if (!addForm.artifact_id) { toast('Please select an artifact', 'error'); return; }
    if (addForm.quantity < 1) { toast('Quantity must be at least 1', 'error'); return; }
    setAddLoading(true);
    const { error } = await supabase.from('cart_items').insert({
      cart_id: addTargetCart.id,
      artifact_id: addForm.artifact_id,
      quantity: addForm.quantity,
      notes: addForm.notes || null,
      added_by: profile?.id,
    });
    if (error) {
      if (error.code === '23505') toast('This artifact is already in the cart', 'error');
      else toast('Failed to add item to cart', 'error');
      setAddLoading(false);
      return;
    }
    toast('Item added to cart', 'success');
    const artName = artifacts.find((a) => a.id === addForm.artifact_id)?.name ?? 'Unknown';
    await logAction('cart_item_added', 'cart', addTargetCart.id, `Added "${artName}" (x${addForm.quantity}) to cart by ${profile?.email}`);
    setAddLoading(false);
    setAddModalOpen(false);
    fetchCarts();
  };

  const handleRemoveItem = async () => {
    if (!deleteItemTarget) return;
    const { error } = await supabase.from('cart_items').delete().eq('id', deleteItemTarget.itemId);
    if (error) { toast('Failed to remove item', 'error'); return; }
    toast('Item removed from cart', 'success');
    await logAction('cart_item_removed', 'cart', deleteItemTarget.cartId, `Removed item from cart by ${profile?.email}`);
    fetchCarts();
  };

  const handleDeleteCart = async () => {
    if (!deleteCartTarget) return;
    const { error } = await supabase.from('carts').delete().eq('id', deleteCartTarget);
    if (error) { toast('Failed to delete cart', 'error'); return; }
    toast('Cart deleted', 'success');
    await logAction('cart_deleted', 'cart', deleteCartTarget, `Cart deleted by ${profile?.email}`);
    fetchCarts();
  };

  const handleStatusChange = async (cartId: string, status: string) => {
    const { error } = await supabase.from('carts').update({ status }).eq('id', cartId);
    if (error) { toast('Failed to update cart status', 'error'); return; }
    toast('Cart status updated', 'success');
    await logAction('cart_status_changed', 'cart', cartId, `Cart status changed to "${status}" by ${profile?.email}`);
    fetchCarts();
  };

  const openCreateModal = () => {
    setCreateForm({ user_id: '', notes: '' });
    setCreateModalOpen(true);
  };

  const handleCreateCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.user_id) { toast('Please select a user', 'error'); return; }
    setCreateLoading(true);
    const { data, error } = await supabase.from('carts').insert({
      user_id: createForm.user_id,
      notes: createForm.notes || null,
      status: 'active',
    }).select('id').single();
    if (error) { toast('Failed to create cart', 'error'); setCreateLoading(false); return; }
    toast('Cart created', 'success');
    const userName = users.find((u) => u.id === createForm.user_id)?.full_name ?? 'Unknown';
    await logAction('cart_created', 'cart', data.id, `Cart created for "${userName}" by ${profile?.email}`);
    setCreateLoading(false);
    setCreateModalOpen(false);
    fetchCarts();
  };

  const filteredArtifacts = artifacts.filter((a) =>
    a.name.toLowerCase().includes(artifactSearch.toLowerCase()) ||
    a.accession_number.toLowerCase().includes(artifactSearch.toLowerCase())
  );

  return (
    <DashboardLayout title="Cart Management">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user or artifact..." className="input-field pl-10" />
          </div>
          <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="checked_out">Checked Out</option>
            <option value="abandoned">Abandoned</option>
          </SelectField>
        </div>
        <button onClick={openCreateModal} className="btn-primary whitespace-nowrap"><Plus size={18} /> Create Cart</button>
      </div>

      {loading ? (
        <div className="card p-6"><TableSkeleton rows={4} cols={5} /></div>
      ) : error ? (
        <ErrorState onRetry={fetchCarts} />
      ) : carts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShoppingCart size={48} strokeWidth={1.5} />}
            title="No carts found"
            message="Create a new cart or try adjusting your filters."
            action={<button onClick={openCreateModal} className="btn-primary"><Plus size={16} /> Create Cart</button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {carts.map((cart) => (
            <div key={cart.id} className="card overflow-hidden">
              {/* Cart header */}
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => setExpandedCart(expandedCart === cart.id ? null : cart.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  {expandedCart === cart.id ? <ChevronDown size={18} className="text-stone-400 shrink-0" /> : <ChevronRight size={18} className="text-stone-400 shrink-0" />}
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    <ShoppingCart size={18} className="text-stone-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">{cart.user?.full_name ?? 'Unknown User'}</p>
                    <p className="text-xs text-stone-400">{cart.user?.email} • {cart.cart_items?.length ?? 0} item(s) • {new Date(cart.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <SelectField value={cart.status} onChange={(e) => handleStatusChange(cart.id, e.target.value)} className="w-auto text-xs py-1">
                    <option value="active">Active</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="abandoned">Abandoned</option>
                  </SelectField>
                  <button onClick={() => openAddModal(cart)} className="p-1.5 rounded-lg text-stone-400 hover:text-green-600 hover:bg-green-50" aria-label="Add item"><Plus size={16} /></button>
                  <button onClick={() => setDeleteCartTarget(cart.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete cart"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* Expanded items */}
              {expandedCart === cart.id && (
                <div className="border-t border-stone-100">
                  {cart.cart_items && cart.cart_items.length > 0 ? (
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full">
                        <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>{['Image', 'Artifact', 'Accession #', 'Category', 'Qty', 'Notes', 'Added', 'Actions'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {cart.cart_items.map((item) => (
                            <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                                  {item.artifact?.artifact_images?.[0] ? (
                                    <img src={item.artifact.artifact_images[0].image_url} alt={item.artifact.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-300"><Package size={16} /></div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <Link to={`/artifacts/${item.artifact_id}`} className="text-sm font-medium text-stone-800 hover:text-amber-700">{item.artifact?.name ?? 'Unknown'}</Link>
                              </td>
                              <td className="px-4 py-2.5 text-xs font-mono text-stone-500 whitespace-nowrap">{item.artifact?.accession_number ?? '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-stone-600">{item.artifact?.category?.name ?? '—'}</td>
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 text-sm font-semibold">{item.quantity}</span>
                              </td>
                              <td className="px-4 py-2.5 text-sm text-stone-500 max-w-[200px] truncate">{item.notes || '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-stone-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-2.5">
                                <button onClick={() => setDeleteItemTarget({ cartId: cart.id, itemId: item.id })} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50" aria-label="Remove item"><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-stone-400 mb-3">This cart is empty.</p>
                      <button onClick={() => openAddModal(cart)} className="btn-secondary text-sm"><Plus size={14} /> Add Item</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title={`Add Item to Cart — ${addTargetCart?.user?.full_name ?? ''}`} size="lg">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="label-text">Search & Select Artifact</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input type="text" value={artifactSearch} onChange={(e) => setArtifactSearch(e.target.value)} placeholder="Search artifacts..." className="input-field pl-10" />
            </div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin border border-stone-200 rounded-lg">
              {filteredArtifacts.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">No artifacts found.</p>
              ) : filteredArtifacts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAddForm({ ...addForm, artifact_id: a.id })}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    addForm.artifact_id === a.id ? 'bg-amber-50 border-l-4 border-amber-500' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {a.artifact_images?.[0] ? <img src={a.artifact_images[0].image_url} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><Package size={16} /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{a.name}</p>
                    <p className="text-xs text-stone-400">{a.accession_number} • {a.category?.name ?? '—'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <FormField label="Quantity" required>
            <TextInput type="number" min={1} value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })} />
          </FormField>
          <FormField label="Notes">
            <TextArea rows={2} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Optional notes about this item..." />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={addLoading || !addForm.artifact_id} className="btn-primary">
              {addLoading ? <Loader2 className="animate-spin" size={16} /> : null}
              {addLoading ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Cart Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Cart" size="md">
        <form onSubmit={handleCreateCart} className="space-y-4">
          <FormField label="Select User" required>
            <SelectField value={createForm.user_id} onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}>
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.email}) — {u.role}</option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="Notes">
            <TextArea rows={3} value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Optional notes about this cart..." />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createLoading || !createForm.user_id} className="btn-primary">
              {createLoading ? <Loader2 className="animate-spin" size={16} /> : null}
              {createLoading ? 'Creating...' : 'Create Cart'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Cart Confirmation */}
      <ConfirmDialog
        open={!!deleteCartTarget}
        onClose={() => setDeleteCartTarget(null)}
        onConfirm={handleDeleteCart}
        title="Delete Cart"
        message="This will permanently delete the cart and all its items. This cannot be undone."
        confirmLabel="Delete"
        danger
      />

      {/* Delete Item Confirmation */}
      <ConfirmDialog
        open={!!deleteItemTarget}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={handleRemoveItem}
        title="Remove Item"
        message="Remove this item from the cart?"
        confirmLabel="Remove"
        danger
      />
    </DashboardLayout>
  );
}
