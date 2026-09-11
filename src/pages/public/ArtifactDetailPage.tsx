import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MapPin, Calendar, User, Package, Ruler, Weight, ArrowLeft, Tag, Layers, MessageSquare, Send, Trash2, Loader2, Pencil, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { FullPageSpinner } from '@/components/ui/Loading';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ArtifactCard } from '@/components/ArtifactCard';
import { TextArea } from '@/components/ui/FormField';
import { AuthPromptModal } from '@/components/ui/AuthPromptModal';
import { InteractiveStarRating, StarRating } from '@/components/ui/StarRating';
import type { ArtifactWithRelations, ProvenanceRecord, ConservationRecord, Exhibition, Acquisition, ReviewWithRelations, CommentWithRelations } from '@/types';

export default function ArtifactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { toast } = useToast();
  const [artifact, setArtifact] = useState<ArtifactWithRelations | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceRecord[]>([]);
  const [conservation, setConservation] = useState<ConservationRecord[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [related, setRelated] = useState<ArtifactWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([]);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [commentForm, setCommentForm] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<ReviewWithRelations | null>(null);
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewStats, setReviewStats] = useState<{ average_rating: number; review_count: number; five_star: number; four_star: number; three_star: number; two_star: number; one_star: number } | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authAction, setAuthAction] = useState('interact with the collection');

  const fetchReviews = useCallback(async (artifactId: string, page = 1, sort = reviewSort) => {
    const from = (page - 1) * 8;
    const to = from + 7;
    let query = supabase
      .from('reviews')
      .select('*, user:profiles(id, full_name, email), artifact:artifacts(id, name, accession_number)', { count: 'exact' })
      .eq('artifact_id', artifactId)
      .eq('status', 'published');
    if (sort === 'highest') query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
    else if (sort === 'lowest') query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, count } = await query.range(from, to);
    setReviews((previous) => (page === 1 ? (data ?? []) : [...previous, ...(data ?? [])]) as ReviewWithRelations[]);
    setReviewTotal(count ?? 0);
    if (page === 1) {
      const { data: stats } = await supabase
        .rpc('get_artifact_review_summary', { artifact_uuid: artifactId });
      setReviewStats(stats?.[0] ?? null);
    }
    if (session?.user) {
      const { data: mine } = await supabase
        .from('reviews')
        .select('*, user:profiles(id, full_name, email), artifact:artifacts(id, name, accession_number)')
        .eq('artifact_id', artifactId)
        .eq('user_id', session.user.id)
        .maybeSingle();
      setUserReview(mine as ReviewWithRelations | null);
      if (mine) setReviewForm({ rating: mine.rating, title: mine.title, body: mine.body });
    }
  }, [session?.user, reviewSort]);

  const fetchComments = useCallback(async (artifactId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('*, user:profiles(id, full_name, email), artifact:artifacts(id, name, accession_number)')
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: false });
    setComments((data ?? []) as CommentWithRelations[]);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setActiveImage(0);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('artifacts')
          .select('*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*)')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
          setError(true);
          setLoading(false);
          return;
        }

        setArtifact(data as ArtifactWithRelations);

        const [provRes, consRes, exhRes, acqRes, relRes] = await Promise.all([
          supabase.from('provenance_records').select('*').eq('artifact_id', id).order('start_date', { ascending: true }),
          supabase.from('conservation_records').select('*').eq('artifact_id', id).order('assessment_date', { ascending: false }),
          supabase
            .from('exhibition_artifacts')
            .select('exhibition:exhibitions(*)')
            .eq('artifact_id', id),
          supabase.from('acquisitions').select('*').eq('artifact_id', id).maybeSingle(),
          data.category_id
            ? supabase
                .from('artifacts')
                .select('*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*)')
                .eq('category_id', data.category_id)
                .neq('id', id)
                .eq('is_public', true)
                .limit(4)
            : Promise.resolve({ data: [] }),
        ]);

        setProvenance(provRes.data ?? []);
        setConservation(consRes.data ?? []);
        setExhibitions((exhRes.data ?? []).map((e: any) => e.exhibition));
        setAcquisition(acqRes.data as Acquisition | null);
        setRelated((relRes.data as ArtifactWithRelations[]) ?? []);

        if (session?.user) {
          const favRes = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('artifact_id', id)
            .maybeSingle();
          setIsFavorite(!!favRes.data);
        }

        fetchReviews(id);
        fetchComments(id);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user, fetchReviews, fetchComments]);

  const toggleFavorite = async () => {
    if (!session?.user) {
      setAuthAction('save artifacts to your favorites');
      setAuthPromptOpen(true);
      return;
    }
    if (!id) return;
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('artifact_id', id);
      setIsFavorite(false);
      toast('Removed from favorites', 'info');
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, artifact_id: id });
      setIsFavorite(true);
      toast('Added to favorites', 'success');
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setAuthAction('review this artifact');
      setAuthPromptOpen(true);
      return;
    }
    if (reviewForm.rating < 1 || reviewForm.rating > 5) { toast('Please choose a rating from 1 to 5 stars.', 'error'); return; }
    if (!reviewForm.title.trim() || !reviewForm.body.trim()) { toast('Please fill in the title and review text.', 'error'); return; }
    if (reviewForm.body.trim().length > 5000) { toast('Your review is too long. Please keep it under 5,000 characters.', 'error'); return; }
    if (!id) return;
    setReviewSubmitting(true);
    if (userReview) {
      const { error } = await supabase.from('reviews').update({
        rating: reviewForm.rating, title: reviewForm.title, body: reviewForm.body,
      }).eq('id', userReview.id);
      if (error) { toast('Failed to update review', 'error'); setReviewSubmitting(false); return; }
      toast('Your review has been updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('reviews').insert({
        user_id: session.user.id, artifact_id: id,
        rating: reviewForm.rating, title: reviewForm.title, body: reviewForm.body,
      });
      if (error) { toast('Failed to submit review', 'error'); setReviewSubmitting(false); return; }
      toast('Your review has been submitted successfully.', 'success');
    }
    setReviewForm({ rating: 5, title: '', body: '' });
    setUserReview(null);
    setReviewSubmitting(false);
    setReviewPage(1);
    fetchReviews(id, 1, reviewSort);
  };

  const deleteReview = async (reviewId: string) => {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) { toast('Failed to delete review', 'error'); return; }
    toast('Review deleted', 'info');
    setReviewForm({ rating: 5, title: '', body: '' });
    setUserReview(null);
    if (id) {
      setReviewPage(1);
      fetchReviews(id, 1, reviewSort);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) { toast('Please sign in to comment', 'info'); return; }
    if (!commentForm.trim()) { toast('Please write a comment', 'error'); return; }
    if (!id) return;
    setCommentSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      user_id: session.user.id, artifact_id: id, body: commentForm.trim(),
    });
    if (error) { toast('Failed to post comment', 'error'); setCommentSubmitting(false); return; }
    toast('Comment posted! It will appear once approved by an admin.', 'success');
    setCommentForm('');
    setCommentSubmitting(false);
    fetchComments(id);
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) { toast('Failed to delete comment', 'error'); return; }
    toast('Comment deleted', 'info');
    if (id) fetchComments(id);
  };

  const ratingCounts = reviewStats
    ? [reviewStats.five_star, reviewStats.four_star, reviewStats.three_star, reviewStats.two_star, reviewStats.one_star]
    : [0, 0, 0, 0, 0];
  const avgRating = reviewStats && reviewStats.review_count > 0
    ? Number(reviewStats.average_rating).toFixed(1)
    : null;

  if (loading) return <FullPageSpinner />;
  if (error || !artifact) return <div className="max-w-4xl mx-auto py-20"><ErrorState title="Artifact not found" message="This artifact may not exist or is not publicly accessible." /></div>;

  const images = artifact.artifact_images ?? [];
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];

  const timelineEvents = [
    ...(artifact.creation_date ? [{ date: artifact.creation_date, title: 'Created', description: artifact.origin, icon: Calendar }] : []),
    ...provenance.map((p) => ({ date: p.start_date ?? '', title: `Owned by ${p.owner_name}`, description: p.location, icon: User })),
    ...(artifact.acquisition_date ? [{ date: artifact.acquisition_date, title: 'Acquired by Museum', description: artifact.acquisition_method, icon: Package }] : []),
    ...conservation.map((c) => ({ date: c.assessment_date, title: 'Conservation Assessment', description: c.treatment || c.condition, icon: Layers })),
    ...exhibitions.map((e) => ({ date: e.start_date ?? '', title: `Exhibited: ${e.name}`, description: e.status, icon: Tag })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const conditionColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    poor: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
    restored: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/collection" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> Back to Collection
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Image gallery */}
        <div>
          <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
            {primaryImage ? (
              <img src={images[activeImage]?.image_url ?? primaryImage.image_url} alt={artifact.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <Package size={64} strokeWidth={1} />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                    activeImage === i ? 'border-amber-600' : 'border-stone-200'
                  }`}
                >
                  <img src={img.image_url} alt={img.caption || `Image ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-mono text-stone-400 mb-1">{artifact.accession_number}</p>
              <h1 className="text-3xl font-serif font-bold text-stone-800">{artifact.name}</h1>
            </div>
            <button
              onClick={toggleFavorite}
              className="p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors shrink-0"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={22} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-stone-400'} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {artifact.category && <span className="badge bg-stone-100 text-stone-700">{artifact.category.name}</span>}
            {artifact.historical_period && <span className="badge bg-amber-100 text-amber-700">{artifact.historical_period.name}</span>}
            <span className={`badge ${conditionColors[artifact.condition]}`}>Condition: {artifact.condition}</span>
            <span className="badge bg-stone-100 text-stone-600 capitalize">{artifact.status.replace('_', ' ')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { icon: Calendar, label: 'Creation Date', value: artifact.creation_date },
              { icon: MapPin, label: 'Origin', value: artifact.origin },
              { icon: User, label: 'Artist / Creator', value: artifact.artist?.name },
              { icon: Package, label: 'Material', value: artifact.material },
              { icon: Ruler, label: 'Dimensions', value: artifact.dimensions },
              { icon: Weight, label: 'Weight', value: artifact.weight },
            ].map((item) => (
              item.value ? (
                <div key={item.label}>
                  <p className="text-xs text-stone-400 flex items-center gap-1.5"><item.icon size={14} /> {item.label}</p>
                  <p className="text-sm font-medium text-stone-700 mt-0.5">{item.value}</p>
                </div>
              ) : null
            ))}
          </div>

          {artifact.current_location && (
            <div className="flex items-center gap-2 text-sm text-stone-600 mb-4 p-3 bg-stone-50 rounded-lg">
              <MapPin size={16} className="text-amber-600" />
              <span>{artifact.current_location.building} — {artifact.current_location.gallery}{artifact.current_location.room ? `, ${artifact.current_location.room}` : ''}</span>
            </div>
          )}

          {acquisition && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-stone-700 mb-1">Acquisition Information</p>
              <p className="text-sm text-stone-600">
                {acquisition.acquisition_method && <span className="capitalize">{acquisition.acquisition_method}</span>}
                {acquisition.source && ` from ${acquisition.source}`}
                {acquisition.acquisition_date && ` on ${new Date(acquisition.acquisition_date).toLocaleDateString()}`}
                {acquisition.donor_name && ` (Donor: ${acquisition.donor_name})`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <Section title="About the Artifact">
        <p className="text-stone-600 leading-relaxed">{artifact.description}</p>
      </Section>

      {/* Historical Context */}
      {artifact.historical_period && (
        <Section title="Historical Context">
          <div className="p-5 bg-stone-50 rounded-lg border border-stone-200">
            <h3 className="font-serif font-semibold text-stone-800 mb-2">{artifact.historical_period.name}</h3>
            {artifact.historical_period.start_year && artifact.historical_period.end_year && (
              <p className="text-sm text-stone-500 mb-2">
                {artifact.historical_period.start_year < 0 ? Math.abs(artifact.historical_period.start_year) + ' BCE' : artifact.historical_period.start_year} —
                {' '}{artifact.historical_period.end_year < 0 ? Math.abs(artifact.historical_period.end_year) + ' BCE' : artifact.historical_period.end_year}
              </p>
            )}
            <p className="text-sm text-stone-600">{artifact.historical_period.description}</p>
          </div>
        </Section>
      )}

      {/* Artist */}
      {artifact.artist && (
        <Section title="Artist / Creator">
          <div className="p-5 bg-stone-50 rounded-lg border border-stone-200">
            <h3 className="font-serif font-semibold text-stone-800 mb-1">{artifact.artist.name}</h3>
            {artifact.artist.nationality && <p className="text-sm text-stone-500 mb-2">{artifact.artist.nationality}</p>}
            {(artifact.artist.birth_year || artifact.artist.death_year) && (
              <p className="text-sm text-stone-500 mb-2">
                {artifact.artist.birth_year ?? '?'} — {artifact.artist.death_year ?? '?'}
              </p>
            )}
            <p className="text-sm text-stone-600">{artifact.artist.biography}</p>
          </div>
        </Section>
      )}

      {/* Provenance */}
      {provenance.length > 0 && (
        <Section title="Provenance">
          <div className="space-y-3">
            {provenance.map((p, i) => (
              <div key={p.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold shrink-0">{i + 1}</div>
                  {i < provenance.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-stone-800">{p.owner_name}</p>
                  {p.location && <p className="text-sm text-stone-500">{p.location}</p>}
                  <p className="text-xs text-stone-400 mt-0.5">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : '?'} — {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'present'}
                    {' '}({p.ownership_type})
                  </p>
                  {p.description && <p className="text-sm text-stone-600 mt-1">{p.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Conservation */}
      {conservation.length > 0 && (
        <Section title="Conservation History">
          <div className="space-y-3">
            {conservation.map((c, i) => (
              <div key={c.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">{i + 1}</div>
                  {i < conservation.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 mt-1" />}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-800">{new Date(c.assessment_date).toLocaleDateString()}</p>
                    <span className={`badge ${conditionColors[c.condition]}`}>{c.condition}</span>
                  </div>
                  {c.conservator && <p className="text-sm text-stone-500 mt-0.5">Conservator: {c.conservator}</p>}
                  {c.treatment && <p className="text-sm text-stone-600 mt-1">Treatment: {c.treatment}</p>}
                  {c.notes && <p className="text-sm text-stone-500 mt-1">{c.notes}</p>}
                  {c.next_inspection_date && (
                    <p className="text-xs text-amber-600 mt-1">Next inspection: {new Date(c.next_inspection_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Exhibition History */}
      {exhibitions.length > 0 && (
        <Section title="Exhibition History">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exhibitions.map((e) => (
              <Link key={e.id} to={`/exhibitions/${e.id}`} className="card p-4 hover:shadow-md transition-all">
                <h3 className="font-serif font-semibold text-stone-800 hover:text-amber-700">{e.name}</h3>
                <p className="text-sm text-stone-500 mt-1">{e.description}</p>
                <span className={`badge mt-2 ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>{e.status}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Timeline */}
      {timelineEvents.length > 0 && (
        <Section title="Timeline">
          <div className="space-y-3">
            {timelineEvents.map((event, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center shrink-0">
                    <event.icon size={14} />
                  </div>
                  {i < timelineEvents.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm text-stone-400">{event.date || 'Date unknown'}</p>
                  <p className="font-medium text-stone-800">{event.title}</p>
                  {event.description && <p className="text-sm text-stone-500">{event.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Reviews & Ratings">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-5 mb-5">
                <div className="text-center">
                  <p className="text-4xl font-bold text-stone-800">{avgRating ?? '—'}</p>
                  <StarRating rating={Number(avgRating ?? 0)} size={15} className="mt-1" />
                  <p className="text-xs text-stone-400 mt-1">{reviewStats?.review_count ?? 0} review{(reviewStats?.review_count ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {ratingCounts.map((count, index) => {
                    const rating = 5 - index;
                    const total = reviewStats?.review_count ?? 0;
                    const percentage = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="w-8">{rating} star</span>
                        <div className="h-2 flex-1 rounded-full bg-stone-100 overflow-hidden"><div className="h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} /></div>
                        <span className="w-7 text-right">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {session?.user ? (
                <form onSubmit={submitReview} className="space-y-3 border-t border-stone-100 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-700">{userReview ? 'Edit Review' : 'Write a Review'}</p>
                    {userReview && <span className="text-xs text-stone-400">You have already reviewed this artifact.</span>}
                  </div>
                  <InteractiveStarRating value={reviewForm.rating} onChange={(rating) => setReviewForm({ ...reviewForm, rating })} disabled={reviewSubmitting} />
                  <input type="text" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Review title..." maxLength={120} className="input-field" />
                  <TextArea rows={4} value={reviewForm.body} onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })} placeholder="Share your thoughts about this artifact..." maxLength={5000} />
                  <p className="text-right text-xs text-stone-400">{reviewForm.body.length}/5000</p>
                  <button type="submit" disabled={reviewSubmitting} className="btn-primary w-full">
                    {reviewSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    {reviewSubmitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                  </button>
                  {userReview && <button type="button" onClick={() => deleteReview(userReview.id)} className="btn-secondary w-full text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={14} /> Delete My Review</button>}
                </form>
              ) : (
                <div className="text-center border-t border-stone-100 pt-5">
                  <p className="text-sm text-stone-500 mb-3">Be the first to review this artifact.</p>
                  <button type="button" onClick={() => { setAuthAction('review this artifact'); setAuthPromptOpen(true); }} className="btn-primary w-full">Write a Review</button>
                </div>
              )}
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2"><MessageSquare size={16} /> Leave a Comment</p>
              {session?.user ? (
                <form onSubmit={submitComment} className="space-y-3">
                  <TextArea rows={3} value={commentForm} onChange={(e) => setCommentForm(e.target.value)} placeholder="Share your thoughts or ask a question..." maxLength={3000} />
                  <button type="submit" disabled={commentSubmitting} className="btn-secondary w-full">{commentSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}{commentSubmitting ? 'Posting...' : 'Post Comment'}</button>
                </form>
              ) : <button type="button" onClick={() => { setAuthAction('leave a comment'); setAuthPromptOpen(true); }} className="btn-secondary w-full">Sign in to comment</button>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-600">Visitor Reviews</p>
              <label className="flex items-center gap-2 text-xs text-stone-500">Sort by
                <span className="relative"><select value={reviewSort} onChange={(e) => { const sort = e.target.value as typeof reviewSort; setReviewSort(sort); setReviewPage(1); if (id) fetchReviews(id, 1, sort); }} className="appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-3 pr-8 text-xs text-stone-700"><option value="recent">Most Recent</option><option value="highest">Highest Rating</option><option value="lowest">Lowest Rating</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" /></span>
              </label>
            </div>
            {reviews.length === 0 ? <div className="card p-8"><EmptyState icon={<MessageSquare size={40} strokeWidth={1.5} />} title="No reviews yet" message="Be the first to review this artifact." /></div> : reviews.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-sm font-semibold shrink-0">{review.user?.full_name?.[0]?.toUpperCase() ?? 'U'}</div><div><p className="text-sm font-medium text-stone-800">{review.user?.full_name ?? 'Anonymous'}</p><p className="text-xs text-stone-400">{new Date(review.created_at).toLocaleDateString()}</p></div></div><StarRating rating={review.rating} size={14} /></div>
                <p className="text-sm font-semibold text-stone-700 mb-1">{review.title}</p><p className="text-sm text-stone-600 leading-relaxed">{review.body}</p>
                {session?.user?.id === review.user_id && <div className="mt-3 flex gap-3"><button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1"><Pencil size={12} /> Edit</button><button type="button" onClick={() => deleteReview(review.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12} /> Delete</button></div>}
              </div>
            ))}
            {reviewPage * 8 < reviewTotal && <button type="button" onClick={() => { const next = reviewPage + 1; setReviewPage(next); if (id) fetchReviews(id, next, reviewSort); }} className="btn-secondary w-full">Load More Reviews</button>}
            {comments.length > 0 && <div className="space-y-3 pt-4"><p className="text-sm font-semibold text-stone-600">Comments</p>{comments.map((comment) => <div key={comment.id} className="card p-4"><div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">{comment.user?.full_name?.[0]?.toUpperCase() ?? 'U'}</div><div><p className="text-sm font-medium text-stone-800">{comment.user?.full_name ?? 'Anonymous'}</p><p className="text-xs text-stone-400">{new Date(comment.created_at).toLocaleDateString()}</p></div></div><p className="text-sm text-stone-600 leading-relaxed">{comment.body}</p>{session?.user?.id === comment.user_id && <button onClick={() => deleteComment(comment.id)} className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1"><Trash2 size={12} /> Delete</button>}</div>)}</div>}
          </div>
        </div>
      </Section>

      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} action={authAction} />

      {/* Related */}
      {related.length > 0 && (
        <Section title="Related Artifacts">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 pb-2 border-b border-stone-200">{title}</h2>
      {children}
    </section>
  );
}
