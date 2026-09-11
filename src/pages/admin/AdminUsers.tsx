import { useEffect, useState, useCallback } from 'react';
import { Shield, UserCheck, UserX, Loader2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { logAction } from '@/lib/audit';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/FormField';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import type { Profile, UserRole } from '@/types';

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700', curator: 'bg-amber-100 text-amber-700', visitor: 'bg-blue-100 text-blue-700',
};

export default function AdminUsers() {
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('visitor');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) setError(true);
    else setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openEdit = (user: Profile) => {
    setEditTarget(user);
    setNewRole(user.role);
  };

  const handleRoleChange = async () => {
    if (!editTarget) return;
    if (editTarget.id === currentUser?.id && newRole !== 'admin') {
      toast('You cannot remove your own admin access', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', editTarget.id);
    if (error) { toast('Failed to update role', 'error'); setSaving(false); return; }
    toast('User role updated', 'success');
    await logAction('user_role_changed', 'profile', editTarget.id, `Role for ${editTarget.email} changed from ${editTarget.role} to ${newRole} by ${currentUser?.email}`);
    setSaving(false);
    setEditTarget(null);
    fetch();
  };

  const toggleActive = async (user: Profile) => {
    if (user.id === currentUser?.id) { toast('You cannot deactivate your own account', 'error'); return; }
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) { toast('Failed to update status', 'error'); return; }
    toast(`User ${!user.is_active ? 'activated' : 'deactivated'}`, 'success');
    await logAction('user_status_changed', 'profile', user.id, `User ${user.email} ${!user.is_active ? 'activated' : 'deactivated'} by ${currentUser?.email}`);
    fetch();
  };

  return (
    <DashboardLayout title="User Management">
      {loading ? <div className="card p-6"><TableSkeleton /></div> : error ? <ErrorState onRetry={fetch} /> : users.length === 0 ? (
        <div className="card"><EmptyState icon={<Shield size={48} strokeWidth={1.5} />} title="No users found" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center text-sm font-semibold">{user.full_name?.[0]?.toUpperCase() ?? 'U'}</div>
                        <span className="font-medium text-stone-800">{user.full_name || 'Unnamed'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{user.email}</td>
                    <td className="px-4 py-3"><span className={`badge ${roleColors[user.role]} capitalize`}>{user.role}</span></td>
                    <td className="px-4 py-3">
                      {user.is_active ? <span className="badge bg-green-100 text-green-700">Active</span> : <span className="badge bg-red-100 text-red-700">Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50" aria-label="Change role"><Shield size={16} /></button>
                        <button onClick={() => toggleActive(user)} className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50" aria-label="Toggle active">
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Change User Role">
        {editTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-lg">
              <p className="text-sm font-medium text-stone-800">{editTarget.full_name}</p>
              <p className="text-xs text-stone-500">{editTarget.email}</p>
              <p className="text-xs text-stone-400 mt-1">Current role: <span className="font-medium capitalize">{editTarget.role}</span></p>
            </div>
            {editTarget.id === currentUser?.id && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle size={16} /> You cannot change your own role.
              </div>
            )}
            <SelectField value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} disabled={editTarget.id === currentUser?.id}>
              <option value="admin">Admin</option><option value="curator">Curator</option><option value="visitor">Visitor</option>
            </SelectField>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleRoleChange} disabled={saving || editTarget.id === currentUser?.id} className="btn-primary">
                {saving ? <Loader2 className="animate-spin" size={16} /> : null} Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
