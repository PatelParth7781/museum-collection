import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { AuthPromptModal } from '@/components/ui/AuthPromptModal';
import type { ArtifactWithRelations } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';

export function ArtifactCard({ artifact }: { artifact: ArtifactWithRelations }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('artifact_id', artifact.id)
        .maybeSingle();
      setIsFavorite(!!data);
    })();
  }, [session?.user, artifact.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      setAuthPromptOpen(true);
      return;
    }
    setFavLoading(true);
    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('artifact_id', artifact.id);
      setIsFavorite(false);
      toast('Removed from favorites', 'info');
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: session.user.id, artifact_id: artifact.id });
      setIsFavorite(true);
      toast('Added to favorites', 'success');
    }
    setFavLoading(false);
  };

  const primaryImage = artifact.artifact_images?.find((img) => img.is_primary) ?? artifact.artifact_images?.[0];
  const imageUrl = primaryImage?.image_url;
  const periodName = artifact.historical_period?.name;
  const categoryName = artifact.category?.name;
  const locationName = artifact.current_location
    ? `${artifact.current_location.building} — ${artifact.current_location.gallery}`
    : null;

  return (
    <>
    <Link
      to={`/artifacts/${artifact.id}`}
      className="card group overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
    >
      <div className="relative h-56 bg-stone-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artifact.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <button
          onClick={toggleFavorite}
          disabled={favLoading}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={18}
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-stone-500'}
          />
        </button>
        {categoryName && (
          <span className="absolute bottom-3 left-3 badge bg-white/90 backdrop-blur-sm text-stone-700">
            {categoryName}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">
          {artifact.name}
        </h3>
        {periodName && (
          <p className="text-xs text-stone-500 mt-0.5">{periodName}</p>
        )}
        {artifact.origin && (
          <p className="text-xs text-stone-400 mt-0.5">{artifact.origin}</p>
        )}
        <p className="text-sm text-stone-600 mt-2 line-clamp-2 flex-1">{artifact.description}</p>
        {artifact.review_summary && artifact.review_summary.review_count > 0 ? (
          <div className="mt-3 flex items-center gap-2">
            <StarRating rating={artifact.review_summary.average_rating} size={13} />
            <span className="text-xs font-medium text-stone-600">{artifact.review_summary.average_rating.toFixed(1)}</span>
            <span className="text-xs text-stone-400">({artifact.review_summary.review_count})</span>
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-400">No reviews yet</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <span className="text-xs font-mono text-stone-400">{artifact.accession_number}</span>
          {locationName && (
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <MapPin size={12} />
              <span className="truncate max-w-[120px]">{locationName}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
    <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} action="save artifacts to your favorites" />
    </>
  );
}

export function ArtifactCardGrid({ artifacts }: { artifacts: ArtifactWithRelations[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {artifacts.map((a) => (
        <ArtifactCard key={a.id} artifact={a} />
      ))}
    </div>
  );
}

export function CardWrapper({ children }: { children: ReactNode }) {
  return <div className="card group overflow-hidden hover:shadow-md transition-all duration-300">{children}</div>;
}
