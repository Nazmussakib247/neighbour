import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatBookingDate, formatBookingTime } from '@/lib/utils';
import {
  Loader2, WifiOff, X, Star, UserCog, CalendarDays, MapPin, Search,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  fetchClientBookings, updateBooking, createReview, updateAccount,
  type ClientBooking, ApiError,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

gsap.registerPlugin(ScrollTrigger);

const toDisplayStatus = (s: string) =>
  s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const statusColors: Record<string, string> = {
  Completed: 'bg-[#22C55E]/10 text-[#22C55E]',
  Pending: 'bg-[#FACC15]/15 text-[#A3870F]',
  Confirmed: 'bg-[#2E5CFF]/10 text-[#2E5CFF]',
  'In Progress': 'bg-[#2E5CFF]/10 text-[#2E5CFF]',
  Cancelled: 'bg-[#EF4444]/10 text-[#EF4444]',
};

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-[rgba(26,26,26,0.12)] rounded-[10px] focus:outline-none focus:border-[#FF6B35] bg-white';
const labelCls = 'block text-xs font-semibold text-[#8B7E74] uppercase tracking-wider mb-1.5';

/* ============================================
   DEMO DATA (backend offline)
   ============================================ */
const demoBookings: ClientBooking[] = [
  {
    id: 1, service: 'Same-Day Plumbing Repair', professional: 'Rafiqul I.', professionalId: 1,
    category: 'Plumbing', date: '2026-07-05', time: '10:00', notes: 'Kitchen sink leaking',
    amount: 1000, status: 'confirmed', paymentStatus: 'pending', reviewed: false,
  },
  {
    id: 2, service: 'Deep Home Cleaning', professional: 'Shirin A.', professionalId: 2,
    category: 'Home Cleaning', date: '2026-06-28', time: '14:00', notes: '2-bedroom deep clean',
    amount: 1400, status: 'completed', paymentStatus: 'paid', reviewed: false,
  },
  {
    id: 3, service: 'Professional Headshot Session', professional: 'Tania R.', professionalId: 3,
    category: 'Photography', date: '2026-06-20', time: '11:00', notes: 'LinkedIn headshots',
    amount: 2500, status: 'completed', paymentStatus: 'paid', reviewed: true,
  },
  {
    id: 4, service: 'Furniture Assembly & Mounting', professional: 'Jamal H.', professionalId: 4,
    category: 'Handyman', date: '2026-07-10', time: '16:00', notes: 'Wardrobe assembly',
    amount: 1200, status: 'pending', paymentStatus: 'pending', reviewed: false,
  },
];

/* ============================================
   MODAL SHELL
   ============================================ */
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div data-lenis-prevent className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(26,26,26,0.08)] sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3EDE5] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================
   REVIEW MODAL
   ============================================ */
function ReviewModal({ live, booking, onClose, onDone }: {
  live: boolean;
  booking: ClientBooking;
  onClose: () => void;
  onDone: (bookingId: number, msg: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!live) {
      onDone(booking.id, 'Demo mode — review not saved (backend is offline).');
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        booking_id: booking.id,
        rating,
        comment,
        service_tag: booking.category,
      });
      onDone(booking.id, 'Thanks! Your review has been published.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Review — ${booking.service}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Your Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className="p-1"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={28}
                  fill={(hovered || rating) >= n ? '#FACC15' : 'none'}
                  stroke={(hovered || rating) >= n ? '#FACC15' : '#C9C0B6'}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Comment (optional)</label>
          <textarea
            className={inputCls}
            rows={4}
            value={comment}
            placeholder={`How was your experience with ${booking.professional}?`}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {!live && (
          <p className="text-xs text-[#FF6B35] bg-[#FFF5EE] rounded-lg px-3 py-2">
            Backend offline — demo mode. The review won't be persisted.
          </p>
        )}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={submitting}
          className="mt-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Submit Review
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   ACCOUNT MODAL
   ============================================ */
function AccountModal({ live, onClose, onDone }: {
  live: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    phone: '',
    location: user?.location ?? '',
    current_password: '',
    new_password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name) {
      setError('Name is required.');
      return;
    }
    if (form.new_password && form.new_password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (form.new_password && !form.current_password) {
      setError('Enter your current password to set a new one.');
      return;
    }
    if (!live) {
      onDone('Demo mode — account not saved (backend is offline).');
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateAccount({
        full_name: form.full_name,
        phone: form.phone || undefined,
        location: form.location || undefined,
        current_password: form.current_password || undefined,
        new_password: form.new_password || undefined,
      });
      updateUser(updated);
      onDone('Account updated successfully.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="My Account" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.phone} placeholder="01711-000000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} placeholder="e.g. Nirala, Khulna"
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-[rgba(26,26,26,0.08)] pt-4">
          <p className="text-xs font-semibold text-[#8B7E74] uppercase tracking-wider mb-3">
            Change password (optional)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Current</label>
              <input className={inputCls} type="password" value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>New</label>
              <input className={inputCls} type="password" value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
            </div>
          </div>
        </div>

        {!live && (
          <p className="text-xs text-[#FF6B35] bg-[#FFF5EE] rounded-lg px-3 py-2">
            Backend offline — demo mode. Changes won't be persisted.
          </p>
        )}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={submitting}
          className="mt-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Save Changes
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   MY BOOKINGS PAGE (client)
   ============================================ */
export default function MyBookings() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [liveData, setLiveData] = useState(false);
  const [bookings, setBookings] = useState<ClientBooking[]>(demoBookings);
  const [reviewing, setReviewing] = useState<ClientBooking | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<ClientBooking | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // --- Route guard: clients only (admins/pros have their own dashboards) ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/bookings' } });
    } else if (user.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user.role === 'professional') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // --- Toast auto-hide ---
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Load own bookings ---
  const loadBookings = useCallback(async () => {
    const bks = await fetchClientBookings();
    if (bks === null) {
      setLiveData(false);
      return;
    }
    setBookings(bks);
    setLiveData(true);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'client') return;
    loadBookings();
  }, [user, loadBookings]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mb-animate').forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0,
            duration: 0.5,
            ease: 'expo.out',
            delay: i * 0.06,
            scrollTrigger: { trigger: el, start: 'top 92%' },
          }
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [bookings.length]);

  // --- Cancel booking ---
  const handleCancel = async (booking: ClientBooking) => {
    setConfirmCancel(null);
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)));
    if (!liveData) {
      setToast('Demo mode — booking cancelled locally only.');
      return;
    }
    setSavingId(booking.id);
    try {
      await updateBooking(booking.id, { status: 'cancelled' });
      setToast(`Booking "${booking.service}" cancelled.`);
    } catch (err) {
      setBookings(prev);
      setToast(err instanceof ApiError ? err.message : 'Failed to cancel booking.');
    } finally {
      setSavingId(null);
    }
  };

  // --- Review saved ---
  const handleReviewed = (bookingId: number, msg: string) => {
    setBookings((bs) => bs.map((b) => (b.id === bookingId ? { ...b, reviewed: true } : b)));
    setToast(msg);
  };

  const canCancel = (b: ClientBooking) => ['pending', 'confirmed'].includes(b.status);
  const canReview = (b: ClientBooking) => b.status === 'completed' && !b.reviewed;

  // Block rendering until the auth check completes
  if (authLoading || !user || user.role !== 'client') {
    return (
      <div className="min-h-screen bg-[#FEFEFE] pt-[72px] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="min-h-screen bg-[#FEFEFE] pt-[72px] page-enter">
      {/* Header */}
      <div className="max-w-[1000px] mx-auto px-6 pt-8 pb-6 border-b border-[rgba(26,26,26,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / My Bookings
        </p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Bookings
            </h1>
            <p className="text-sm text-[#8B7E74] mt-1 flex items-center gap-2">
              Track, cancel, and review your bookings
              {!liveData && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF5EE] text-[#FF6B35] text-xs rounded-full">
                  <WifiOff size={11} /> demo data
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/services"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors">
              <Search size={16} /> Find Services
            </Link>
            <button
              onClick={() => setAccountOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
              <UserCog size={16} /> My Account
            </button>
          </div>
        </div>
      </div>

      {/* Booking cards */}
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-12 text-center">
            <CalendarDays size={40} className="mx-auto text-[#C9C0B6]" />
            <p className="mt-4 text-[#1A1A1A] font-medium">No bookings yet</p>
            <p className="mt-1 text-sm text-[#8B7E74]">
              Browse services in Khulna and book your first professional.
            </p>
            <Link
              to="/services"
              className="inline-block mt-5 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors">
              Explore Services
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((b) => {
              const display = toDisplayStatus(b.status);
              return (
                <div key={b.id} className="mb-animate bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[display] || 'bg-gray-100 text-gray-600'}`}>
                          {display}
                        </span>
                        <span className="text-xs text-[#8B7E74]">{b.category}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#1A1A1A] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {b.service}
                      </h3>
                      <div className="mt-1 flex items-center gap-4 flex-wrap text-sm text-[#8B7E74]">
                        <Link to={`/profile/${b.professionalId}`} className="text-[#FF6B35] hover:underline">
                          {b.professional}
                        </Link>
                        <span className="flex items-center gap-1">
                          <CalendarDays size={13} /> {formatBookingDate(b.date)}{b.time ? ` · ${formatBookingTime(b.time)}` : ''}
                        </span>
                        {b.notes && (
                          <span className="flex items-center gap-1 max-w-[280px] truncate">
                            <MapPin size={13} /> {b.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + actions */}
                    <div className="flex items-center gap-3 md:flex-col md:items-end">
                      <span className="text-lg font-bold text-[#1A1A1A] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                        ৳{b.amount.toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        {canReview(b) && (
                          <button
                            onClick={() => setReviewing(b)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1A1A] text-white text-xs font-medium rounded-[8px] hover:bg-[#FF6B35] transition-colors">
                            <Star size={13} /> Leave Review
                          </button>
                        )}
                        {b.reviewed && b.status === 'completed' && (
                          <span className="flex items-center gap-1.5 px-3.5 py-2 bg-[#22C55E]/10 text-[#22C55E] text-xs font-medium rounded-[8px]">
                            <Star size={13} fill="#22C55E" /> Reviewed
                          </span>
                        )}
                        {canCancel(b) && (
                          <button
                            onClick={() => setConfirmCancel(b)}
                            disabled={savingId === b.id}
                            className="px-3.5 py-2 border border-[#EF4444]/30 text-[#EF4444] text-xs font-medium rounded-[8px] hover:bg-[#FFF5EE] transition-colors disabled:opacity-60">
                            {savingId === b.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16" />
      </div>

      {/* Modals */}
      {reviewing && (
        <ReviewModal
          live={liveData}
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onDone={handleReviewed}
        />
      )}
      {accountOpen && (
        <AccountModal
          live={liveData}
          onClose={() => setAccountOpen(false)}
          onDone={setToast}
        />
      )}
      {confirmCancel && (
        <Modal title="Cancel Booking" onClose={() => setConfirmCancel(null)}>
          <p className="text-sm text-[#1A1A1A]">
            Cancel <strong>{confirmCancel.service}</strong> with {confirmCancel.professional} on {formatBookingDate(confirmCancel.date)}?
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => handleCancel(confirmCancel)}
              className="flex-1 px-6 py-3 bg-[#EF4444] text-white text-sm font-medium rounded-[10px] hover:bg-[#DC2626] transition-colors">
              Yes, Cancel It
            </button>
            <button
              onClick={() => setConfirmCancel(null)}
              className="px-6 py-3 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
              Keep Booking
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[90] max-w-[400px] bg-white rounded-2xl shadow-lg p-4 border-l-4 border-[#FF6B35]">
          <p className="text-sm text-[#1A1A1A]">{toast}</p>
        </div>
      )}
    </div>
  );
}
