import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, History, Users, GalleryVerticalEnd, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ArtifactCard } from '@/components/ArtifactCard';
import { GridSkeleton } from '@/components/ui/Loading';
import { ErrorState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import type { ArtifactWithRelations, Category, ExhibitionWithRelations } from '@/types';

const FEATURED_PAGE_SIZE = 8;

export default function HomePage() {
  const [featured, setFeatured] = useState<ArtifactWithRelations[]>([]);
  const [featuredPage, setFeaturedPage] = useState(1);
  const [featuredTotal, setFeaturedTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exhibitions, setExhibitions] = useState<ExhibitionWithRelations[]>([]);
  const [stats, setStats] = useState({ artifacts: 0, periods: 0, artists: 0, exhibitions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, exhRes, periodRes, artistRes, exhCountRes] = await Promise.all([
          supabase.from('categories').select('*').limit(8),
          supabase
            .from('exhibitions')
            .select('*, location:locations(*), exhibition_artifacts(artifact:artifacts(*, artifact_images(*)))')
            .eq('status', 'active')
            .limit(3),
          supabase.from('historical_periods').select('*', { count: 'exact', head: true }),
          supabase.from('artists').select('*', { count: 'exact', head: true }),
          supabase.from('exhibitions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);

        setCategories(catRes.data ?? []);
        setExhibitions(exhRes.data ?? []);
        setStats({
          artifacts: 0,
          periods: periodRes.count ?? 0,
          artists: artistRes.count ?? 0,
          exhibitions: exhCountRes.count ?? 0,
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadFeatured() {
      setLoading(true);
      setError(false);
      const { data, count, error: fetchError } = await supabase
        .from('artifacts')
        .select('*, category:categories(*), artist:artists(*), historical_period:historical_periods(*), current_location:locations(*), artifact_images(*)', { count: 'exact' })
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range((featuredPage - 1) * FEATURED_PAGE_SIZE, featuredPage * FEATURED_PAGE_SIZE - 1);

      if (fetchError) {
        setError(true);
      } else {
        setFeatured(data ?? []);
        setFeaturedTotal(count ?? 0);
        setStats((prev) => ({ ...prev, artifacts: count ?? 0 }));
      }
      setLoading(false);
    }
    loadFeatured();
  }, [featuredPage]);

  const featuredTotalPages = Math.ceil(featuredTotal / FEATURED_PAGE_SIZE);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-stone-900 text-stone-50 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-6">
              Discover History.<br />Preserve Heritage.
            </h1>
            <p className="text-lg text-stone-300 leading-relaxed mb-8 max-w-xl">
              Explore our digital collection of historical and cultural artifacts spanning millennia — from ancient
              Indus Valley seals to Mughal miniature paintings and traditional textiles.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/collection" className="btn-primary bg-amber-600 hover:bg-amber-700 text-white">
                Explore Collection <ArrowRight size={18} />
              </Link>
              <Link to="/exhibitions" className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
                View Exhibitions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Artifacts', value: stats.artifacts, icon: Package },
              { label: 'Historical Periods', value: stats.periods, icon: History },
              { label: 'Artists & Creators', value: stats.artists, icon: Users },
              { label: 'Current Exhibitions', value: stats.exhibitions, icon: GalleryVerticalEnd },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="inline-flex p-3 bg-amber-50 text-amber-700 rounded-lg mb-2">
                  <s.icon size={24} strokeWidth={1.5} />
                </div>
                <p className="text-3xl font-bold text-stone-800">{s.value}</p>
                <p className="text-sm text-stone-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-800">Featured Collection</h2>
            <p className="text-stone-500 mt-1">Recently added artifacts from our collection</p>
          </div>
          <Link to="/collection" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <GridSkeleton count={8} />
        ) : error ? (
          <ErrorState message="Failed to load featured artifacts. Please try again." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featured.map((a) => (
                <ArtifactCard key={a.id} artifact={a} />
              ))}
            </div>
            <Pagination
              page={featuredPage}
              totalPages={featuredTotalPages}
              onPageChange={setFeaturedPage}
              totalItems={featuredTotal}
              pageSize={FEATURED_PAGE_SIZE}
            />
          </>
        )}
      </section>

      {/* Categories */}
      <section className="bg-stone-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-8 text-center">Collection Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/collection?category=${cat.id}`}
                className="card p-6 text-center hover:shadow-md transition-all group"
              >
                <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Current Exhibitions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-800">Current Exhibitions</h2>
            <p className="text-stone-500 mt-1">Now on display at the museum</p>
          </div>
          <Link to="/exhibitions" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-64 animate-pulse bg-stone-200" />
            ))}
          </div>
        ) : exhibitions.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No active exhibitions at this time.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {exhibitions.map((exh) => (
              <Link key={exh.id} to={`/exhibitions/${exh.id}`} className="card overflow-hidden group hover:shadow-md transition-all">
                <div className="h-40 bg-stone-200 overflow-hidden">
                  {exh.cover_image_url ? (
                    <img src={exh.cover_image_url} alt={exh.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <GalleryVerticalEnd size={40} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <span className="badge bg-green-100 text-green-700 mb-2">Active</span>
                  <h3 className="font-serif font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">{exh.name}</h3>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{exh.description}</p>
                  {exh.location && (
                    <p className="text-xs text-stone-400 mt-2">{exh.location.building} — {exh.location.gallery}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* About */}
      <section className="bg-stone-900 text-stone-300 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-100 mb-4">About the Museum</h2>
          <p className="text-stone-400 leading-relaxed">
            The Heritage Museum is dedicated to preserving, studying, and sharing the rich cultural heritage of our
            civilization. Our digital collection platform provides scholars, students, and enthusiasts worldwide with
            access to thousands of historically significant artifacts — each with detailed provenance, conservation
            records, and historical context. Through digital innovation, we bring history to life for future generations.
          </p>
          <Link to="/about" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:text-amber-300 font-medium">
            Learn more about us <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
