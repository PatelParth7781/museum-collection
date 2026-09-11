import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GalleryVerticalEnd, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GridSkeleton } from '@/components/ui/Loading';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import type { ExhibitionWithRelations } from '@/types';

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<ExhibitionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('exhibitions')
          .select('*, location:locations(*), exhibition_artifacts(artifact:artifacts(*, artifact_images(*), category:categories(*)))')
          .in('status', ['upcoming', 'active', 'ended'])
          .order('start_date', { ascending: false });
        if (error) throw error;
        setExhibitions(data ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><GridSkeleton count={6} /></div>;
  if (error) return <div className="max-w-4xl mx-auto py-20"><ErrorState /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Exhibitions</h1>
      <p className="text-stone-500 mb-8">Current and past exhibitions at the Heritage Museum</p>

      {exhibitions.length === 0 ? (
        <EmptyState icon={<GalleryVerticalEnd size={48} strokeWidth={1.5} />} title="No exhibitions" message="There are no exhibitions to display at this time." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exhibitions.map((exh) => (
            <Link key={exh.id} to={`/exhibitions/${exh.id}`} className="card group overflow-hidden hover:shadow-md transition-all">
              <div className="h-48 bg-stone-200 overflow-hidden">
                {exh.cover_image_url ? (
                  <img src={exh.cover_image_url} alt={exh.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <GalleryVerticalEnd size={48} strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${
                    exh.status === 'active' ? 'bg-green-100 text-green-700' :
                    exh.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>{exh.status}</span>
                </div>
                <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">{exh.name}</h3>
                <p className="text-sm text-stone-500 mt-1 line-clamp-2">{exh.description}</p>
                <div className="mt-3 space-y-1">
                  {exh.start_date && exh.end_date && (
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Calendar size={12} /> {new Date(exh.start_date).toLocaleDateString()} — {new Date(exh.end_date).toLocaleDateString()}
                    </p>
                  )}
                  {exh.location && (
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <MapPin size={12} /> {exh.location.building} — {exh.location.gallery}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
