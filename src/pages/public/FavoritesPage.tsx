import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArtifactCard } from '@/components/ArtifactCard';
import { GridSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ArtifactWithRelations } from '@/types';

export default function FavoritesPage() {
  const { session } = useAuth();
  const [favorites, setFavorites] = useState<ArtifactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase
        .from('favorites')
        .select('artifact:artifacts(*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setFavorites((data ?? []).map((f: any) => f.artifact));
      setLoading(false);
    })();
  }, [session?.user]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><GridSkeleton count={4} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">My Favorites</h1>
      <p className="text-stone-500 mb-8">Artifacts you've saved to your collection</p>

      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={48} strokeWidth={1.5} />}
          title="No favorites yet"
          message="Browse the collection and click the heart icon on any artifact to save it here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
        </div>
      )}
    </div>
  );
}
