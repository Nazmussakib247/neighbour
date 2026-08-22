import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, ChevronDown, X, WifiOff } from 'lucide-react';
import ServiceCard from '@/components/ServiceCard';
import CategoryChip from '@/components/CategoryChip';
import { services as staticServices, categories as staticCategories, type Service, type Category } from '@/data/marketplaceData';
import { fetchServices, fetchCategories } from '@/lib/api';

const PRICE_RANGES = [
  { label: 'Under ৳300', min: 0, max: 299 },
  { label: '৳300–৳500', min: 300, max: 500 },
  { label: '৳500–৳1000', min: 500, max: 1000 },
  { label: '৳1000+', min: 1000, max: Infinity },
];

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number | null>(null); // index into PRICE_RANGES
  const [minRating, setMinRating] = useState<number | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>(staticServices);
  const [cats, setCats] = useState<Category[]>(staticCategories);
  const [offline, setOffline] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Load from backend; fall back to bundled demo data if it's unreachable
  useEffect(() => {
    let cancelled = false;
    fetchServices().then((data) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setAllServices(data);
        setOffline(false);
      } else {
        setAllServices(staticServices);
        setOffline(true);
      }
      setLoading(false);
    });
    // Real per-category active-service counts (falls back to demo counts offline)
    fetchCategories().then((data) => {
      if (cancelled) return;
      if (data && data.length > 0) setCats(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep search box in sync with the ?q= URL param (e.g. header search)
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearchQuery(q);
    setCurrentPage(1);
  }, [searchParams]);

  const selectedCategoryName = selectedCategory
    ? cats.find((c) => c.id === selectedCategory)?.name ?? null
    : null;

  // Khulna areas derived from the loaded services
  const areas = [...new Set(allServices.map((s) => s.location.split(',')[0].trim()).filter(Boolean))].sort();

  const filteredServices = allServices.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.provider.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q);
    const matchesCategory =
      !selectedCategoryName || s.category.toLowerCase() === selectedCategoryName.toLowerCase();
    const matchesPrice =
      priceRange === null ||
      (s.price >= PRICE_RANGES[priceRange].min && s.price <= PRICE_RANGES[priceRange].max);
    const matchesRating = minRating === null || s.rating >= minRating;
    const matchesArea = area === null || s.location.split(',')[0].trim() === area;
    return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesArea;
  });

  // Removable filter chips
  const filterChips: { key: string; label: string; clear: () => void }[] = [
    ...(selectedCategoryName
      ? [{ key: 'cat', label: `Category: ${selectedCategoryName}`, clear: () => setSelectedCategory(null) }]
      : []),
    ...(priceRange !== null
      ? [{ key: 'price', label: PRICE_RANGES[priceRange].label, clear: () => setPriceRange(null) }]
      : []),
    ...(minRating !== null
      ? [{ key: 'rating', label: `${minRating}★ & up`, clear: () => setMinRating(null) }]
      : []),
    ...(area !== null
      ? [{ key: 'area', label: `Area: ${area}`, clear: () => setArea(null) }]
      : []),
  ];

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setPriceRange(null);
    setMinRating(null);
    setArea(null);
    setCurrentPage(1);
  };

  const itemsPerPage = 9;
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
    setCatMenuOpen(false);
    setCurrentPage(1);
  };

  const updateSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white pt-[72px] page-enter">
      {/* Header */}
      <div ref={topRef} className="max-w-[1200px] mx-auto px-6 pt-12 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / Services
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          All Services
        </h1>
        <p className="mt-3 text-lg text-[#8B7E74]">
          Browse services from trusted local professionals
        </p>

        {offline && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-[#FFF5EE] text-[#FF6B35] text-xs rounded-[10px]">
            <WifiOff size={14} /> Showing demo data — backend not reachable
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => updateSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => { setCatMenuOpen(!catMenuOpen); setAreaMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm transition-colors ${selectedCategory ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'bg-[#F3EDE5] hover:bg-[#FFF5EE]'}`}>
              {selectedCategoryName ?? 'Category'} <ChevronDown size={16} />
            </button>
            {catMenuOpen && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setCatMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-[50] w-56 max-h-72 overflow-y-auto bg-white rounded-xl shadow-lg border border-[rgba(26,26,26,0.08)] py-1.5">
                  {cats.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === cat.id ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'text-[#1A1A1A] hover:bg-[#F3EDE5]'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setAreaMenuOpen(!areaMenuOpen); setCatMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm transition-colors ${area ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'bg-[#F3EDE5] hover:bg-[#FFF5EE]'}`}>
              <MapPin size={16} /> {area ?? 'Area'}
            </button>
            {areaMenuOpen && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setAreaMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-[50] w-56 max-h-72 overflow-y-auto bg-white rounded-xl shadow-lg border border-[rgba(26,26,26,0.08)] py-1.5">
                  {areas.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setArea(area === a ? null : a); setAreaMenuOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${area === a ? 'bg-[#FFF5EE] text-[#FF6B35]' : 'text-[#1A1A1A] hover:bg-[#F3EDE5]'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white rounded-[10px] text-sm hover:bg-[#FF6B35] transition-colors"
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {/* Active Filters */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FFF5EE] text-[#FF6B35] text-sm rounded-full"
              >
                {chip.label}
                <button onClick={() => { chip.clear(); setCurrentPage(1); }} className="hover:opacity-70">
                  <X size={14} />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-sm text-[#8B7E74] hover:text-[#FF6B35] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Category Bar */}
      <div className="max-w-[1200px] mx-auto px-6 mb-8">
        <div className="flex flex-wrap gap-2">
          {cats.filter((c) => c.count > 0).slice(0, 8).map((cat) => (
            <CategoryChip
              key={cat.id}
              category={cat}
              active={selectedCategory === cat.id}
              onClick={() => handleCategoryClick(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="flex gap-8">
          {/* Services Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
                    <div className="aspect-[16/10] skeleton-shimmer" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 w-20 skeleton-shimmer rounded" />
                      <div className="h-5 w-full skeleton-shimmer rounded" />
                      <div className="h-4 w-3/4 skeleton-shimmer rounded" />
                      <div className="h-4 w-1/2 skeleton-shimmer rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedServices.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm text-[#8B7E74] hover:text-[#1A1A1A] disabled:opacity-30 transition-colors"
                    >
                      ← Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentPage(i + 1); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                          currentPage === i + 1
                            ? 'bg-[#FF6B35] text-white'
                            : 'bg-[#F3EDE5] text-[#1A1A1A] hover:bg-[#FFF5EE]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm text-[#8B7E74] hover:text-[#1A1A1A] disabled:opacity-30 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Search size={64} className="mx-auto text-[#8B7E74] mb-4" />
                <h3 className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  No services match your filters
                </h3>
                <p className="mt-2 text-sm text-[#8B7E74]">Try adjusting your search or filters</p>
                <button
                  onClick={() => { updateSearch(''); clearAllFilters(); }}
                  className="mt-4 text-[#FF6B35] text-sm font-medium hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Sidebar (Desktop) */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-[120px]">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Popular Categories
              </h3>
              <div className="flex flex-col gap-1">
                {cats.filter((c) => c.count > 0).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#FFF5EE] text-[#FF6B35]'
                        : 'hover:bg-[#F3EDE5] text-[#1A1A1A]'
                    }`}
                  >
                    <span className="text-[#FF6B35]">{cat.count}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div
            className="absolute right-0 top-0 bottom-0 w-[400px] max-w-[90vw] bg-white shadow-xl p-8 overflow-y-auto"
            style={{ animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Price Range</h4>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((range, i) => (
                    <button
                      key={range.label}
                      onClick={() => { setPriceRange(priceRange === i ? null : i); setCurrentPage(1); }}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                        priceRange === i
                          ? 'bg-[#FF6B35] text-white'
                          : 'bg-[#F3EDE5] hover:bg-[#FFF5EE]'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Rating</h4>
                <div className="flex flex-col gap-2">
                  {[5, 4, 3].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => { setMinRating(minRating === stars ? null : stars); setCurrentPage(1); }}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        minRating === stars ? 'text-[#FF6B35] font-semibold' : 'hover:text-[#FF6B35]'
                      }`}
                    >
                      <span>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
                      <span className={minRating === stars ? 'text-[#FF6B35]' : 'text-[#8B7E74]'}>& Up</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Area</h4>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <button
                      key={a}
                      onClick={() => { setArea(area === a ? null : a); setCurrentPage(1); }}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                        area === a ? 'bg-[#FF6B35] text-white' : 'bg-[#F3EDE5] hover:bg-[#FFF5EE]'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-2">
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-[10px] text-sm font-medium hover:bg-[#FF6B35] transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={clearAllFilters}
                className="px-5 py-3 border border-[rgba(26,26,26,0.12)] rounded-[10px] text-sm font-medium hover:bg-[#F3EDE5] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
