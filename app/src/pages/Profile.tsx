import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, CheckCircle, Clock, Heart, Shield,
  Award, CheckCircle2, ChevronRight, ArrowLeft, Loader2,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ReviewCard from '@/components/ReviewCard';
import { providers, reviews as staticReviews, type Provider, type Review } from '@/data/marketplaceData';
import {
  fetchProfessional, fetchReviews, createBooking, fetchBookingSlots,
  fetchFavorites, addFavorite, removeFavorite, type SlotInfo, ApiError,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

gsap.registerPlugin(ScrollTrigger);

const STATIC_RATING_DIST = [78, 32, 10, 5, 2];

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<Provider>(
    () => providers.find((p) => p.id === Number(id)) || providers[0]
  );
  const [reviews, setReviews] = useState<Review[]>(staticReviews);
  const [ratingDist, setRatingDist] = useState<number[]>(STATIC_RATING_DIST);
  const [live, setLive] = useState(false); // true when data came from the backend

  const [selectedDay, setSelectedDay] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load live data with fallback to bundled demo data
  useEffect(() => {
    let cancelled = false;
    const pid = Number(id) || 1;

    fetchProfessional(pid).then((p) => {
      if (cancelled) return;
      if (p) {
        setProvider(p);
        setLive(true);
      } else {
        setProvider(providers.find((sp) => sp.id === pid) || providers[0]);
        setLive(false);
      }
    });

    fetchReviews(pid).then((r) => {
      if (cancelled) return;
      if (r && r.reviews.length > 0) {
        setReviews(r.reviews);
        setRatingDist(r.distribution.map((d) => d.percent));
      } else if (r) {
        setReviews([]);
        setRatingDist(r.distribution.map((d) => d.percent));
      } else {
        setReviews(staticReviews);
        setRatingDist(STATIC_RATING_DIST);
      }
    });

    setSelectedServiceIdx(0);
    setSelectedSlot(null);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!profileRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.profile-animate').forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.6,
            ease: 'expo.out',
            delay: i * 0.1,
            scrollTrigger: { trigger: el, start: 'top 90%' },
          }
        );
      });
    }, profileRef);
    return () => ctx.revert();
  }, [id]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Next 7 real calendar days
  const week = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      // Build the ISO date from LOCAL parts — toISOString() converts to UTC,
      // which shifts the date by a day for +06:00 users and mismatches the chip.
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        label: dayNames[d.getDay()],
        date: d.getDate(),
        iso,
        isWeekday: d.getDay() >= 1 && d.getDay() <= 5,
      };
    });
  }, []);

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ];
  const demoBookedSlots = ['10:00 AM', '3:00 PM'];

  const to24h = (slot: string): string => {
    const [time, meridiem] = slot.split(' ');
    const [h, m] = time.split(':').map(Number);
    let hour = h % 12;
    if (meridiem === 'PM') hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // --- Real availability from the backend for the selected day ---
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  useEffect(() => {
    if (!live) { setSlotInfo(null); return; }
    let cancelled = false;
    fetchBookingSlots(Number(id) || provider.id, week[selectedDay].iso).then((info) => {
      if (!cancelled) setSlotInfo(info);
    });
    return () => { cancelled = true; };
  }, [live, id, provider.id, selectedDay, week]);

  const dayAvailable = live && slotInfo ? slotInfo.available : week[selectedDay].isWeekday;
  const isSlotBooked = (slot: string) => {
    if (live && slotInfo) return slotInfo.booked.includes(to24h(slot));
    return demoBookedSlots.includes(slot);
  };
  const isSlotInWindow = (slot: string) => {
    if (live && slotInfo && slotInfo.start && slotInfo.end) {
      const t = to24h(slot);
      return t >= slotInfo.start && t < slotInfo.end;
    }
    return true;
  };

  // Reflect the saved/favourite state for the logged-in user
  useEffect(() => {
    if (!user) { setSaved(false); return; }
    let cancelled = false;
    fetchFavorites().then((ids) => {
      if (!cancelled && ids) setSaved(ids.includes(provider.id));
    });
    return () => { cancelled = true; };
  }, [user, provider.id]);

  const toggleSaved = async () => {
    if (!user) {
      setToast('Please sign in to save favourites');
      return;
    }
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) await addFavorite(provider.id);
      else await removeFavorite(provider.id);
      setToast(next ? 'Saved to favourites' : 'Removed from favourites');
    } catch (err) {
      setSaved(!next); // revert on failure
      setToast(err instanceof ApiError ? err.message : 'Could not update favourites');
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) {
      setToast('Please select a time slot first');
      return;
    }
    if (!user) {
      setToast('Please sign in to request a booking');
      setTimeout(() => navigate('/login', { state: { from: `/profile/${id}` } }), 1200);
      return;
    }

    const svc = provider.services[selectedServiceIdx];
    if (!live || !svc?.id) {
      setToast('Demo mode: backend not connected, booking not saved');
      return;
    }

    setBooking(true);
    try {
      await createBooking({
        service_id: svc.id,
        professional_id: provider.id,
        booking_date: week[selectedDay].iso,
        booking_time: to24h(selectedSlot),
        notes: `Requested via profile page — ${svc.name}`,
        total_amount: svc.price,
      });
      setToast(`Booking request sent for ${svc.name} on ${week[selectedDay].iso} at ${selectedSlot}! Track it in My Bookings.`);
      // Mark the slot as taken immediately
      setSlotInfo((info) => info ? { ...info, booked: [...info.booked, to24h(selectedSlot)] } : info);
      setSelectedSlot(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setToast('Session expired — please sign in again');
        setTimeout(() => navigate('/login', { state: { from: `/profile/${id}` } }), 1200);
      } else {
        setToast(err instanceof ApiError ? err.message : 'Booking failed — try again');
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <div ref={profileRef} className="min-h-screen bg-white pt-[72px] page-enter">
      {/* Profile Header */}
      <div className="border-b border-[rgba(26,26,26,0.08)]">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-[#8B7E74] hover:text-[#FF6B35] transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-4">
            <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / <Link to="/professionals" className="hover:text-[#FF6B35]">Professionals</Link> / {provider.name}
          </p>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar */}
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white flex-shrink-0" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
              <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {provider.name}
                </h1>
                {provider.verified && (
                  <span className="w-6 h-6 bg-[#2E5CFF] rounded-full flex items-center justify-center">
                    <CheckCircle size={14} className="text-white" />
                  </span>
                )}
                {provider.topPro && (
                  <span className="px-3 py-1 bg-[#FF6B35] text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                    Top Pro
                  </span>
                )}
              </div>
              <p className="mt-2 text-lg text-[#8B7E74]">
                {provider.title} · Licensed & Insured
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={18} className={s <= Math.round(provider.rating) ? 'text-[#FACC15] fill-[#FACC15]' : 'text-[#E5E5E5]'} />
                  ))}
                  <span className="text-lg font-semibold text-[#1A1A1A] ml-1">{provider.rating}</span>
                  <span className="text-sm text-[#8B7E74]">({provider.reviewCount} reviews)</span>
                </div>
                <span className="text-[#8B7E74]">·</span>
                <span className="text-sm text-[#8B7E74]">{provider.yearsExp} years experience</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[#8B7E74]">
                <MapPin size={16} />
                <span className="text-sm">{provider.location} · Serves 15 mile radius</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {provider.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-[#FFF5EE] text-[#FF6B35] text-xs font-medium rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  if (!user) { setToast('Please sign in to send a message'); return; }
                  if (provider.userId) navigate(`/messages?to=${provider.userId}`);
                  else setToast('Messaging is unavailable for this provider in demo mode.');
                }}
                className="px-8 py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors"
              >
                Contact Me
              </button>
              <button
                onClick={toggleSaved}
                className="flex items-center justify-center gap-2 px-8 py-3 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors"
              >
                <Heart size={16} className={saved ? 'fill-[#FF6B35] text-[#FF6B35]' : ''} />
                {saved ? 'Saved' : 'Save to Favourites'}
              </button>
              <div className="flex items-center gap-1 text-[#22C55E] text-xs justify-center">
                <Clock size={14} />
                Usually responds in 10 min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Column */}
          <div className="flex-1 lg:w-[60%]">
            {/* About */}
            <div className="profile-animate">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                About
              </h2>
              <p className="text-[#2D2D2D] leading-relaxed">{provider.bio}</p>

              <div className="mt-6 space-y-3">
                {provider.credentials.map((cred, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#2D2D2D]">
                    <span className="text-[#22C55E]">
                      {i === 0 ? <Shield size={16} /> : i === 1 ? <Award size={16} /> : <CheckCircle2 size={16} />}
                    </span>
                    {cred}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="profile-animate mt-12 pt-12 border-t border-[rgba(26,26,26,0.08)]">
              <div className="flex flex-col md:flex-row md:items-start gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                    Reviews <span className="text-sm font-normal text-[#8B7E74]">({provider.reviewCount})</span>
                  </h2>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-5xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>{provider.rating}</span>
                    <div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} className={s <= Math.round(provider.rating) ? 'text-[#FACC15] fill-[#FACC15]' : 'text-[#E5E5E5]'} />
                        ))}
                      </div>
                      <p className="text-sm text-[#8B7E74]">Average rating</p>
                    </div>
                  </div>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                  {ratingDist.map((pct, i) => (
                    <div key={5 - i} className="flex items-center gap-2">
                      <span className="text-xs text-[#8B7E74] w-8">{5 - i}★</span>
                      <div className="flex-1 h-2 bg-[#F3EDE5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FACC15] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#8B7E74] w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="mt-8 text-sm text-[#8B7E74]">No reviews yet — be the first after a completed booking.</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:w-[40%] space-y-8">
            {/* Services & Rates */}
            <div className="profile-animate bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Services & Rates
              </h3>
              <div className="space-y-3">
                {provider.services.map((svc, idx) => (
                  <div
                    key={svc.name}
                    className={`p-4 border rounded-[10px] transition-colors ${
                      selectedServiceIdx === idx
                        ? 'border-[#FF6B35] bg-[#FFF5EE]/50'
                        : 'border-[rgba(26,26,26,0.06)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-semibold text-[#1A1A1A]">{svc.name}</h4>
                      <span className="text-base font-bold text-[#FF6B35]">From ৳{svc.price}<span className="text-sm font-normal text-[#8B7E74]">/{svc.priceUnit}</span></span>
                    </div>
                    <p className="mt-1 text-sm text-[#8B7E74]">{svc.description}</p>
                    <button
                      onClick={() => {
                        setSelectedServiceIdx(idx);
                        document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="mt-2 text-sm font-medium text-[#FF6B35] flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      {selectedServiceIdx === idx ? 'Selected' : 'Book This'} <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability & Booking */}
            <div id="booking-panel" className="profile-animate bg-[#FFF5EE] rounded-2xl p-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Check Availability
              </h3>
              {provider.services[selectedServiceIdx] && (
                <p className="text-sm text-[#8B7E74] mb-4">
                  Booking: <span className="font-medium text-[#1A1A1A]">{provider.services[selectedServiceIdx].name}</span>
                </p>
              )}

              {/* Day Strip */}
              <div className="flex justify-between gap-1">
                {week.map((day, i) => (
                  <button
                    key={day.iso}
                    onClick={() => { setSelectedDay(i); setSelectedSlot(null); }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                      selectedDay === i
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-white text-[#1A1A1A] hover:bg-[#FFF5EE]'
                    }`}
                  >
                    <span className="text-xs">{day.label}</span>
                    <span className="text-lg font-semibold">{day.date}</span>
                    {day.isWeekday ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedDay === i ? 'bg-white' : 'bg-[#22C55E]'}`} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5D5D5]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Time Slots */}
              <div className="mt-6">
                <p className="text-sm text-[#8B7E74] mb-3">
                  {dayAvailable ? 'Available slots' : 'No availability on this day'}
                </p>
                {dayAvailable && (
                  <div className="flex flex-wrap gap-2">
                    {timeSlots.filter(isSlotInWindow).map((slot) => {
                      const isBooked = isSlotBooked(slot);
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => !isBooked && setSelectedSlot(slot)}
                          disabled={isBooked}
                          className={`px-4 py-2 text-sm rounded-lg transition-all ${
                            isBooked
                              ? 'bg-[#F3EDE5] text-[#A39B92] line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#FF6B35] text-white'
                              : 'bg-white text-[#1A1A1A] hover:bg-[#FFF5EE]'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleBooking}
                disabled={booking || !dayAvailable}
                className="mt-6 w-full py-4 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ boxShadow: '0 8px 32px rgba(255, 107, 53, 0.25)' }}
              >
                {booking && <Loader2 size={16} className="animate-spin" />}
                {user ? 'Request Booking' : 'Sign In to Book'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-[88px] right-6 z-[45] max-w-[360px] bg-white rounded-2xl shadow-lg p-4 border-l-4 border-[#22C55E] toast-enter">
          <p className="text-sm text-[#1A1A1A]">{toast}</p>
        </div>
      )}
    </div>
  );
}
