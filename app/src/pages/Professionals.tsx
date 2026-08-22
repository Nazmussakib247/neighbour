import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ChevronDown, WifiOff, Award, X } from 'lucide-react';
import ProfessionalCard from '@/components/ProfessionalCard';
import { providers as staticProviders, type Provider } from '@/data/marketplaceData';
import { fetchProfessionals } from '@/lib/api';

type SortKey = 'top' | 'rating' | 'reviews';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'top', label: 'Top Pros first' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'reviews', label: 'Most reviewed' },
];

export default function Professionals() {
  const [allPros, setAllPros] = useState<Provider[]>(staticProviders);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [topOnly, setTopOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('top');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProfessionals().then((data) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setAllPros(data);
        setOffline(false);
      } else {
        setAllPros(staticProviders);
        setOffline(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const areas = [...new Set(allPros.map((p) => p.location.split(',')[0].trim()).filter(Boolean))].sort();

  const filtered = allPros
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchesArea = area === null || p.location.split(',')[0].trim() === area;
      const matchesTop = !topOnly || Boolean(p.topPro);
      return matchesSearch && matchesArea && matchesTop;
    })
    .sort((a, b) => {
      if (sort === 'reviews') return b.reviewCount - a.reviewCount;
      if (sort === 'rating') return b.rating - a.rating;
      // 'top': Top Pros first, then by rating
      if (Boolean(b.topPro) !== Boolean(a.topPro)) return Number(Boolean(b.topPro)) - Number(Boolean(a.topPro));
      return b.rating - a.rating;
    });

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? 'Sort';

  return (
    <div className="min-h-screen bg-white pt-[72px] page-enter">
      {/* Header */}
      <div className="max-w-[1200px] mx-auto px-6 pt-12 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / Professionals
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Find a Professional
        </h1>
        <p className="mt-3 text-lg text-[#8B7E74]">
          Browse trusted, verified local pros in Khulna — compare ratings, reviews and rates.
        </p>

        {offline && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-[#FFF5EE] text-[#FF6B35] text-xs rounded-[10px]">
            <WifiOff size={14} /> Showing demo data — backend not reachable
          </div>
        )}

        {/* Filter bar */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="text"
              placeholder="Search by name, skill or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>

          {/* Area */}
          <div className="relative">
            <button
              onClick={() => { setAreaMenuOpen(!areaMenuOpen); setSortMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm transition-colors ${area ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'bg-[#F3EDE5] hover:bg-[#FFF5EE]'}`}>
              <MapPin size={16} /> {area ?? 'Area'} <ChevronDown size={16} />
            </button>
            {areaMenuOpen && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setAreaMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-[50] w-56 max-h-72 overflow-y-auto bg-white rounded-xl shadow-lg border border-[rgba(26,26,26,0.08)] py-1.5">
                  {areas.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setArea(area === a ? null : a); setAreaMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${area === a ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'text-[#1A1A1A] hover:bg-[#F3EDE5]'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => { setSortMenuOpen(!sortMenuOpen); setAreaMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm bg-[#F3EDE5] hover:bg-[#FFF5EE] transition-colors">
              {sortLabel} <ChevronDown size={16} />
            </button>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-[50] w-48 bg-white rounded-xl shadow-lg border border-[rgba(26,26,26,0.08)] py-1.5">
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => { setSort(s.key); setSortMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sort === s.key ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'text-[#1A1A1A] hover:bg-[#F3EDE5]'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top Pro toggle */}
          <button
            onClick={() => setTopOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm transition-colors ${topOnly ? 'bg-[#FF6B35] text-white' : 'bg-[#F3EDE5] hover:bg-[#FFF5EE] text-[#1A1A1A]'}`}>
            <Award size={16} /> Top Pros
          </button>
        </div>

        {/* Active filters */}
        {(searchQuery || area || topOnly) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF5EE] text-[#FF6B35] text-sm rounded-full">
                “{searchQuery}”
                <button onClick={() => setSearchQuery('')} className="hover:opacity-70" aria-label="Clear search"><X size={14} /></button>
              </span>
            )}
            {area && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF5EE] text-[#FF6B35] text-sm rounded-full">
                Area: {area}
                <button onClick={() => setArea(null)} className="hover:opacity-70" aria-label="Clear area"><X size={14} /></button>
              </span>
            )}
            {topOnly && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF5EE] text-[#FF6B35] text-sm rounded-full">
                Top Pros only
                <button onClick={() => setTopOnly(false)} className="hover:opacity-70" aria-label="Clear top pros"><X size={14} /></button>
              </span>
            )}
            <button
              onClick={() => { setSearchQuery(''); setArea(null); setTopOnly(false); }}
              className="text-sm text-[#8B7E74] hover:text-[#FF6B35] transition-colors">
              Clear all
            </button>
          </div>
        )}

        <p className="mt-5 text-sm text-[#8B7E74]">
          {loading ? 'Loading professionals…' : `${filtered.length} professional${filtered.length === 1 ? '' : 's'} found`}
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
                <div className="aspect-[16/9] skeleton-shimmer" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-2/3 skeleton-shimmer rounded" />
                  <div className="h-4 w-1/2 skeleton-shimmer rounded" />
                  <div className="h-4 w-full skeleton-shimmer rounded" />
                  <div className="h-9 w-full skeleton-shimmer rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filtered.map((pro) => (
              <ProfessionalCard key={pro.id} provider={pro} className="h-full" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search size={64} className="mx-auto text-[#8B7E74] mb-4" />
            <h3 className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              No professionals match your search
            </h3>
            <p className="mt-2 text-sm text-[#8B7E74]">Try a different name, area, or clear the filters.</p>
            <button
              onClick={() => { setSearchQuery(''); setArea(null); setTopOnly(false); }}
              className="mt-4 text-[#FF6B35] text-sm font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
