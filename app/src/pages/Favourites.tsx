import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import ProfessionalCard from '@/components/ProfessionalCard';
import { fetchFavoriteProviders } from '@/lib/api';
import { type Provider } from '@/data/marketplaceData';
import { useAuth } from '@/context/AuthContext';

export default function Favourites() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/favourites' } });
      return;
    }
    let cancelled = false;
    fetchFavoriteProviders().then((data) => {
      if (cancelled) return;
      setProviders(data ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white pt-[72px] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-[72px] page-enter">
      <div className="max-w-[1200px] mx-auto px-6 pt-12 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / My Favourites
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          My Favourites
        </h1>
        <p className="mt-3 text-lg text-[#8B7E74]">
          Professionals you've saved for quick access.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
                <div className="aspect-[16/9] skeleton-shimmer" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-2/3 skeleton-shimmer rounded" />
                  <div className="h-4 w-1/2 skeleton-shimmer rounded" />
                  <div className="h-9 w-full skeleton-shimmer rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : providers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {providers.map((pro) => (
              <ProfessionalCard key={pro.id} provider={pro} className="h-full" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart size={64} className="mx-auto text-[#8B7E74] mb-4" />
            <h3 className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              No favourites yet
            </h3>
            <p className="mt-2 text-sm text-[#8B7E74]">
              Browse professionals and tap the heart to save them here.
            </p>
            <Link
              to="/professionals"
              className="mt-5 inline-flex px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors"
            >
              Browse Professionals
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
