import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, GalleryVerticalEnd } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FullPageSpinner } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { ArtifactCard } from '@/components/ArtifactCard';
import type { ExhibitionWithRelations, ArtifactWithRelations } from '@/types';

export default function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exhibition, setExhibition] = useState<ExhibitionWithRelations | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('exhibitions')
          .select('*, location:locations(*)')
          .eq('id', id)
          .maybeSingle();
        if (error || !data) { setError(true); return; }
        setExhibition(data as ExhibitionWithRelations);

        const { data: eaData } = await supabase
          .from('exhibition_artifacts')
          .select('artifact:artifacts(*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*))')
          .eq('exhibition_id', id)
          .order('display_order', { ascending: true });
        setArtifacts((eaData ?? []).map((ea: any) => ea.artifact));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (error || !exhibition) return <div className="max-w-4xl mx-auto py-20"><ErrorState title="Exhibition not found" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/exhibitions" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> Back to Exhibitions
      </Link>

      <div className="mb-8">
        <span className={`badge mb-3 ${
          exhibition.status === 'active' ? 'bg-green-100 text-green-700' :
          exhibition.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
          'bg-stone-100 text-stone-600'
        }`}>{exhibition.status}</span>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-800 mb-3">{exhibition.name}</h1>
        <p className="text-stone-600 leading-relaxed max-w-3xl">{exhibition.description}</p>
        <div className="flex flex-wrap gap-4 mt-4">
          {exhibition.start_date && exhibition.end_date && (
            <p className="text-sm text-stone-500 flex items-center gap-1.5">
              <Calendar size={16} /> {new Date(exhibition.start_date).toLocaleDateString()} — {new Date(exhibition.end_date).toLocaleDateString()}
            </p>
          )}
          {exhibition.location && (
            <p className="text-sm text-stone-500 flex items-center gap-1.5">
              <MapPin size={16} /> {exhibition.location.building} — {exhibition.location.gallery}
            </p>
          )}
        </div>
      </div>

      <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 pb-2 border-b border-stone-200">
        Featured Artifacts ({artifacts.length})
      </h2>
      {artifacts.length === 0 ? (
        <p className="text-stone-500 text-center py-8">No artifacts in this exhibition.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artifacts.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
        </div>
      )}
    </div>
  );
}
