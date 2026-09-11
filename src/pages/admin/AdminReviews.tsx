import { useCallback, useEffect, useState } from 'react';
import { Check, EyeOff, Search, Star, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/Loading';
import { StarRating } from '@/components/ui/StarRating';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { ReviewStatus, ReviewWithRelations } from '@/types';

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('reviews').select('*, user:profiles(id, full_name, email), artifact:artifacts(id, name, accession_number)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (rating) query = query.eq('rating', Number(rating));
    const { data, error } = await query;
    if (error) toast('Could not load reviews.', 'error');
    else setReviews((data ?? []) as ReviewWithRelations[]);
    setLoading(false);
  }, [rating, status, toast]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const filteredReviews = reviews.filter((review) => {
    const value = `${review.body} ${review.title} ${review.user?.full_name ?? ''} ${review.artifact?.name ?? ''}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  const setReviewStatus = async (id: string, nextStatus: ReviewStatus) => {
    const { error } = await supabase.from('reviews').update({ status: nextStatus }).eq('id', id);
    if (error) { toast('Could not update review status.', 'error'); return; }
    toast(nextStatus === 'published' ? 'Review published.' : 'Review hidden.', 'success');
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { toast('Could not delete review.', 'error'); return; }
    toast('Review deleted.', 'info');
    setReviews((current) => current.filter((review) => review.id !== id));
  };

  return (
    <DashboardLayout title="Review Management">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-sm text-stone-500">Moderate visitor feedback and protect the public catalog experience.</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." className="input-field pl-9" /></div>
          <select value={rating} onChange={(e) => setRating(e.target.value)} className="input-field w-auto"><option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto"><option value="">All statuses</option><option value="published">Published</option><option value="pending">Pending</option><option value="hidden">Hidden</option></select>
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="py-16"><LoadingSpinner size={32} /></div> : filteredReviews.length === 0 ? <EmptyState title="No reviews found" message="Try changing your search or filters." /> : <div className="divide-y divide-stone-100">
          {filteredReviews.map((review) => <div key={review.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><StarRating rating={review.rating} size={14} /><span className="text-sm font-medium text-stone-800">{review.user?.full_name ?? 'Anonymous'}</span><span className="text-xs text-stone-400">{new Date(review.created_at).toLocaleDateString()}</span><span className={`badge ${review.status === 'published' ? 'bg-green-100 text-green-700' : review.status === 'hidden' ? 'bg-stone-200 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>{review.status}</span></div><p className="mt-2 text-sm font-semibold text-stone-700">{review.title}</p><p className="mt-1 text-sm leading-relaxed text-stone-600">{review.body}</p><p className="mt-2 text-xs text-stone-400">Artifact: {review.artifact?.name ?? 'Unknown artifact'}</p></div>
            <div className="flex shrink-0 gap-2"><button onClick={() => setReviewStatus(review.id, review.status === 'published' ? 'hidden' : 'published')} className="btn-secondary text-xs">{review.status === 'published' ? <><EyeOff size={14} /> Hide</> : <><Check size={14} /> Publish</>}</button><button onClick={() => deleteReview(review.id)} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={14} /> Delete</button></div>
          </div>)}
        </div>}
      </div>
    </DashboardLayout>
  );
}
