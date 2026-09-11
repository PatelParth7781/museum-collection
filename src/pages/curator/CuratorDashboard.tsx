import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Brush, GalleryVerticalEnd, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { supabase } from '@/lib/supabase';
import { GridSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CuratorDashboard() {
  const [stats, setStats] = useState({ total: 0, needConservation: 0, exhibitions: 0, recentArtifacts: [] as any[] });
  const [attentionArtifacts, setAttentionArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [totalRes, needConsRes, exhRes, recentRes] = await Promise.all([
        supabase.from('artifacts').select('*', { count: 'exact', head: true }),
        supabase.from('conservation_records').select('artifact_id, next_inspection_date, artifact:artifacts(name, accession_number)').lt('next_inspection_date', new Date().toISOString()),
        supabase.from('exhibitions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('artifacts').select('id, name, accession_number, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        total: totalRes.count ?? 0,
        needConservation: needConsRes.data?.length ?? 0,
        exhibitions: exhRes.count ?? 0,
        recentArtifacts: recentRes.data ?? [],
      });
      setAttentionArtifacts(needConsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <DashboardLayout title="Curator Dashboard"><GridSkeleton count={4} /></DashboardLayout>;

  return (
    <DashboardLayout title="Curator Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <DashboardCard label="Total Artifacts" value={stats.total} icon={Package} color="stone" />
        <DashboardCard label="Need Conservation" value={stats.needConservation} icon={AlertTriangle} color="red" />
        <DashboardCard label="Active Exhibitions" value={stats.exhibitions} icon={GalleryVerticalEnd} color="amber" />
        <DashboardCard label="Recent Additions" value={stats.recentArtifacts.length} icon={Plus} color="green" />
      </div>

      {/* Artifacts Requiring Attention */}
      <div className="card p-5 mb-6">
        <h3 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" /> Artifacts Requiring Attention
        </h3>
        {attentionArtifacts.length === 0 ? (
          <EmptyState title="All up to date" message="No artifacts have overdue inspections." />
        ) : (
          <div className="space-y-3">
            {attentionArtifacts.map((a) => (
              <div key={a.artifact_id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-stone-800">{a.artifact?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-stone-500">{a.artifact?.accession_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-red-600 font-medium">Overdue inspection</p>
                  <p className="text-xs text-stone-400">{a.next_inspection_date ? new Date(a.next_inspection_date).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link to="/curator/artifacts/new" className="card p-5 hover:shadow-md transition-all group">
          <div className="inline-flex p-3 bg-amber-50 text-amber-700 rounded-lg mb-3"><Plus size={24} strokeWidth={1.5} /></div>
          <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700">Add Artifact</h3>
          <p className="text-sm text-stone-500 mt-1">Create a new artifact record</p>
        </Link>
        <Link to="/curator/exhibitions" className="card p-5 hover:shadow-md transition-all group">
          <div className="inline-flex p-3 bg-blue-50 text-blue-700 rounded-lg mb-3"><GalleryVerticalEnd size={24} strokeWidth={1.5} /></div>
          <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700">Manage Exhibitions</h3>
          <p className="text-sm text-stone-500 mt-1">Create and organize exhibitions</p>
        </Link>
        <Link to="/curator/conservation" className="card p-5 hover:shadow-md transition-all group">
          <div className="inline-flex p-3 bg-green-50 text-green-700 rounded-lg mb-3"><Brush size={24} strokeWidth={1.5} /></div>
          <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700">Conservation</h3>
          <p className="text-sm text-stone-500 mt-1">Record assessments and treatments</p>
        </Link>
      </div>

      {/* Recent Artifacts */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-stone-800">Recent Artifacts</h3>
          <Link to="/curator/artifacts" className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="space-y-3">
          {stats.recentArtifacts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <div><p className="font-medium text-stone-700">{a.name}</p><p className="text-xs text-stone-400">{a.accession_number}</p></div>
              <span className="text-xs text-stone-400">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
