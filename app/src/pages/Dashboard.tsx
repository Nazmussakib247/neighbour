import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatBookingDate, formatBookingTime } from '@/lib/utils';
import {
  Briefcase, CalendarCheck, Clock, DollarSign, Loader2, WifiOff,
  Plus, Pencil, Trash2, X, UserCog, Star, CalendarClock, Save,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { categories as staticCategories, providers as staticProviders } from '@/data/marketplaceData';
import {
  fetchMyServices, fetchMyBookings, createService, updateService, deleteService,
  updateBooking, updateMyProfile, fetchCategoryOptions, fetchMyProfile, uploadImage,
  fetchMyAvailability, updateMyAvailability,
  type MyService, type CategoryOption, type MyProfile, type AvailabilityDay, ApiError,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

gsap.registerPlugin(ScrollTrigger);

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
const toRawStatus = (s: string) => s.toLowerCase().replace(/ /g, '_');
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
   AVAILABILITY (weekly working hours)
   day_of_week: 0 = Sunday … 6 = Saturday (matches the booking API)
   ============================================ */
interface DayAvail { is_available: boolean; start: string; end: string }
type AvailMap = Record<number, DayAvail>;

const DAY_ORDER: { dow: number; label: string; short: string }[] = [
  { dow: 1, label: 'Monday', short: 'Mon' },
  { dow: 2, label: 'Tuesday', short: 'Tue' },
  { dow: 3, label: 'Wednesday', short: 'Wed' },
  { dow: 4, label: 'Thursday', short: 'Thu' },
  { dow: 5, label: 'Friday', short: 'Fri' },
  { dow: 6, label: 'Saturday', short: 'Sat' },
  { dow: 0, label: 'Sunday', short: 'Sun' },
];

// Friendly starting point: Mon–Fri 9–5, weekend off.
function makeDefaultAvail(): AvailMap {
  const map: AvailMap = {};
  for (let d = 0; d < 7; d++) {
    map[d] = { is_available: d >= 1 && d <= 5, start: '09:00', end: '17:00' };
  }
  return map;
}

/* ============================================
   DEMO DATA (backend offline)
   ============================================ */
const demoServices: MyService[] = staticProviders[0].services.map((s, i) => ({
  id: i + 1,
  title: s.name,
  description: s.description,
  price: s.price,
  priceUnit: s.priceUnit,
  categoryName: 'Plumbing',
  isFeatured: i === 0,
}));

interface BookingItem {
  id: number;
  service: string;
  client: string;
  date: string;
  time: string;
  notes: string;
  amount: number;
  status: string; // display form
}

const demoBookings: BookingItem[] = [
  { id: 1, service: 'Pipe Repair', client: 'Rakib Hasan', date: '2026-07-01', time: '10:00', notes: 'Kitchen sink leaking', amount: 1350, status: 'Pending' },
  { id: 2, service: 'Drain Cleaning', client: 'Ayesha Siddika', date: '2026-06-30', time: '15:00', notes: 'Bathroom drain blocked', amount: 800, status: 'Confirmed' },
  { id: 3, service: 'Water Heater Install', client: 'Fahim Chowdhury', date: '2026-06-28', time: '11:00', notes: 'New geyser installation', amount: 1800, status: 'Completed' },
  { id: 4, service: 'Emergency Call', client: 'Rima Khatun', date: '2026-06-25', time: '21:30', notes: 'Burst pipe', amount: 800, status: 'Completed' },
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
   SERVICE FORM MODAL (add & edit)
   ============================================ */
function ServiceFormModal({ live, existing, onClose, onSaved }: {
  live: boolean;
  existing: MyService | null;
  onClose: () => void;
  onSaved: (svc: MyService, isNew: boolean, demoOnly: boolean) => void;
}) {
  const [cats, setCats] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    category_id: '',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    price: existing ? String(existing.price) : '',
    price_unit: existing?.priceUnit ?? 'hr',
    is_featured: existing?.isFeatured ?? false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (live) {
      fetchCategoryOptions().then((c) => c && setCats(c));
    } else {
      setCats(staticCategories.map((c, i) => ({ id: i + 1, name: c.name })));
    }
  }, [live]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.price || (!existing && !form.category_id)) {
      setError('Please fill in category, title, and price.');
      return;
    }
    const built: MyService = {
      id: existing?.id ?? Date.now(),
      title: form.title,
      description: form.description,
      price: Number(form.price),
      priceUnit: form.price_unit,
      categoryName: cats.find((c) => String(c.id) === form.category_id)?.name ?? existing?.categoryName ?? '',
      isFeatured: form.is_featured,
    };
    if (!live) {
      onSaved(built, !existing, true);
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'service');
      }
      if (existing) {
        await updateService(existing.id, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          price_unit: form.price_unit,
          image: imageUrl,
          is_featured: form.is_featured,
        });
      } else {
        const { id } = await createService({
          category_id: Number(form.category_id),
          title: form.title,
          description: form.description,
          price: Number(form.price),
          price_unit: form.price_unit,
          image: imageUrl,
          is_featured: form.is_featured,
        });
        built.id = id;
      }
      onSaved(built, !existing, false);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={existing ? 'Edit Service' : 'Add Service'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!existing && (
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category…</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={form.title} placeholder="e.g. Bathroom Fittings Repair"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price (৳)</label>
            <input className={inputCls} type="number" min="0" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <select className={inputCls} value={form.price_unit}
              onChange={(e) => setForm({ ...form, price_unit: e.target.value })}>
              {['hr', 'session', 'visit', 'project', 'package'].map((u) => (
                <option key={u} value={u}>per {u}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Photo (JPG/PNG/WebP, max 2MB)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[#8B7E74] file:mr-3 file:px-4 file:py-2 file:rounded-[8px] file:border-0 file:bg-[#F3EDE5] file:text-sm file:font-medium file:text-[#1A1A1A] hover:file:bg-[#FFF5EE] file:cursor-pointer"
          />
          {imageFile && <p className="text-xs text-[#8B7E74] mt-1">{imageFile.name}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer">
          <input type="checkbox" checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
          Request homepage feature
        </label>

        {!live && (
          <p className="text-xs text-[#FF6B35] bg-[#FFF5EE] rounded-lg px-3 py-2">
            Backend offline — demo mode. Changes won't be persisted.
          </p>
        )}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={submitting}
          className="mt-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {existing ? 'Save Changes' : 'Create Service'}
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   PROFILE EDIT MODAL
   ============================================ */
function ProfileModal({ live, initial, onClose, onDone }: {
  live: boolean;
  initial: { full_name: string; title: string; bio: string; years: string; location: string; phone: string };
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.title) {
      setError('Name and title are required.');
      return;
    }
    if (!live) {
      onDone('Demo mode — profile not saved (backend is offline).');
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      if (avatarFile) {
        await uploadImage(avatarFile, 'avatar'); // saved to the account server-side
      }
      await updateMyProfile({
        full_name: form.full_name,
        title: form.title,
        bio: form.bio,
        years_experience: Number(form.years) || 0,
        location: form.location,
        phone: form.phone,
      });
      onDone('Profile updated successfully.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Full Name</label>
            <input className={inputCls} value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} placeholder="e.g. Master Plumber"
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Bio</label>
          <textarea className={inputCls} rows={4} value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Profile Photo (JPG/PNG/WebP, max 2MB)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[#8B7E74] file:mr-3 file:px-4 file:py-2 file:rounded-[8px] file:border-0 file:bg-[#F3EDE5] file:text-sm file:font-medium file:text-[#1A1A1A] hover:file:bg-[#FFF5EE] file:cursor-pointer"
          />
          {avatarFile && <p className="text-xs text-[#8B7E74] mt-1">{avatarFile.name}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Years Exp.</label>
            <input className={inputCls} type="number" min="0" value={form.years}
              onChange={(e) => setForm({ ...form, years: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.phone} placeholder="01711-000000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} placeholder="Sonadanga, Khulna"
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
          Save Profile
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   STAT CARD
   ============================================ */
function StatCard({ icon: Icon, iconColor, bgColor, value, label }: {
  icon: React.ElementType; iconColor: string; bgColor: string; value: string; label: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <p className="mt-4 text-2xl font-bold text-[#1A1A1A] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
      <p className="text-sm text-[#8B7E74]">{label}</p>
    </div>
  );
}

/* ============================================
   PROFESSIONAL DASHBOARD PAGE
   ============================================ */
export default function Dashboard() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [liveData, setLiveData] = useState(false);
  const [services, setServices] = useState<MyService[]>(demoServices);
  const [bookings, setBookings] = useState<BookingItem[]>(demoBookings);
  const [modal, setModal] = useState<'service' | 'profile' | null>(null);
  const [editing, setEditing] = useState<MyService | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MyService | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [availability, setAvailability] = useState<AvailMap>(makeDefaultAvail);
  const [savingAvail, setSavingAvail] = useState(false);

  // --- Route guard: professionals only ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/dashboard' } });
    } else if (user.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user.role !== 'professional') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // --- Toast auto-hide ---
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Merge availability rows from the API into the 7-day map ---
  const applyAvailability = (avail: AvailabilityDay[] | null) => {
    if (!avail) return; // offline — keep current/default
    if (avail.length === 0) { setAvailability(makeDefaultAvail()); return; }
    const next: AvailMap = {};
    for (let d = 0; d < 7; d++) next[d] = { is_available: false, start: '09:00', end: '17:00' };
    for (const a of avail) {
      next[a.day_of_week] = { is_available: a.is_available, start: a.start_time, end: a.end_time };
    }
    setAvailability(next);
  };

  // --- Load own data ---
  const loadData = useCallback(async () => {
    const [svcs, bks, prof, avail] = await Promise.all([
      fetchMyServices(), fetchMyBookings(), fetchMyProfile(), fetchMyAvailability(),
    ]);
    if (svcs === null && bks === null) {
      setLiveData(false);
      return false;
    }
    if (svcs) setServices(svcs);
    if (prof) setProfile(prof);
    applyAvailability(avail);
    if (bks) {
      setBookings(bks.map((b) => ({
        id: b.id,
        service: b.service,
        client: b.client,
        date: b.date,
        time: b.time,
        notes: b.notes,
        amount: b.amount,
        status: toDisplayStatus(b.status),
      })));
    }
    setLiveData(true);
    return true;
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'professional') return;
    loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.pro-animate').forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0,
            duration: 0.5,
            ease: 'expo.out',
            delay: i * 0.08,
            scrollTrigger: { trigger: el, start: 'top 95%' },
          }
        );
      });
      // Safety net: never leave a section stuck invisible if its trigger
      // doesn't fire (e.g. positions mis-measured after data loads).
      gsap.delayedCall(2, () => {
        gsap.utils.toArray<HTMLElement>('.pro-animate').forEach((el) => {
          if (Number(gsap.getProperty(el, 'opacity')) === 0) gsap.set(el, { opacity: 1, y: 0 });
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // --- Booking status change ---
  const changeBookingStatus = async (id: number, newStatus: string) => {
    const prev = bookings;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
    if (!liveData) {
      setToast('Demo mode — status changed locally only.');
      return;
    }
    setSavingId(id);
    try {
      await updateBooking(id, { status: toRawStatus(newStatus) });
      setToast(`Booking #${id} marked as ${newStatus}.`);
    } catch (err) {
      setBookings(prev);
      setToast(err instanceof ApiError ? err.message : 'Failed to update booking.');
    } finally {
      setSavingId(null);
    }
  };

  // --- Service saved from modal ---
  const handleServiceSaved = (svc: MyService, isNew: boolean, demoOnly: boolean) => {
    setServices((s) => (isNew ? [svc, ...s] : s.map((x) => (x.id === svc.id ? svc : x))));
    setToast(demoOnly
      ? 'Demo mode — service changed locally only.'
      : isNew ? `Service "${svc.title}" created.` : `Service "${svc.title}" updated.`);
  };

  // --- Delete service ---
  const handleDelete = async (svc: MyService) => {
    setConfirmDelete(null);
    setServices((s) => s.filter((x) => x.id !== svc.id));
    if (!liveData) {
      setToast('Demo mode — service removed locally only.');
      return;
    }
    try {
      await deleteService(svc.id);
      setToast(`Service "${svc.title}" deleted.`);
    } catch (err) {
      setServices((s) => [svc, ...s]);
      setToast(err instanceof ApiError ? err.message : 'Failed to delete service.');
    }
  };

  // --- Availability editing ---
  const setDay = (dow: number, patch: Partial<DayAvail>) =>
    setAvailability((a) => ({ ...a, [dow]: { ...a[dow], ...patch } }));

  const saveAvailability = async () => {
    // Guard against inverted time ranges before saving.
    const bad = DAY_ORDER.find(({ dow }) => availability[dow].is_available && availability[dow].start >= availability[dow].end);
    if (bad) {
      setToast(`${bad.label}: start time must be before end time.`);
      return;
    }
    if (!liveData) {
      setToast('Demo mode — availability not saved (backend is offline).');
      return;
    }
    setSavingAvail(true);
    try {
      const days: AvailabilityDay[] = DAY_ORDER.map(({ dow }) => ({
        day_of_week: dow,
        is_available: availability[dow].is_available,
        start_time: availability[dow].start,
        end_time: availability[dow].end,
      }));
      await updateMyAvailability(days);
      setToast('Availability updated — clients can now book you during these hours.');
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Failed to save availability.');
    } finally {
      setSavingAvail(false);
    }
  };

  // --- Derived stats ---
  const earnings = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
  const availableDays = DAY_ORDER.filter(({ dow }) => availability[dow].is_available).length;

  // Block rendering until the auth check completes
  if (authLoading || !user || user.role !== 'professional') {
    return (
      <div className="min-h-screen bg-[#FEFEFE] pt-[72px] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#FF6B35]" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="min-h-screen bg-[#FEFEFE] pt-[72px] page-enter">
      {/* Header */}
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-6 border-b border-[rgba(26,26,26,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7E74] mb-2">
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / Pro Dashboard
        </p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              Welcome, {user.full_name.split(' ')[0]}
            </h1>
            <p className="text-sm text-[#8B7E74] mt-1 flex items-center gap-2">
              Manage your services and bookings
              {!liveData && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF5EE] text-[#FF6B35] text-xs rounded-full">
                  <WifiOff size={11} /> demo data
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(null); setModal('service'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors">
              <Plus size={16} /> Add Service
            </button>
            <button
              onClick={() => setModal('profile')}
              className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
              <UserCog size={16} /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pro-animate">
            <StatCard icon={Briefcase} iconColor="#FF6B35" bgColor="rgba(255,107,53,0.1)"
              value={String(services.length)} label="Active Services" />
          </div>
          <div className="pro-animate">
            <StatCard icon={CalendarCheck} iconColor="#2E5CFF" bgColor="rgba(46,92,255,0.1)"
              value={String(bookings.length)} label="Total Bookings" />
          </div>
          <div className="pro-animate">
            <StatCard icon={Clock} iconColor="#FACC15" bgColor="rgba(250,204,21,0.1)"
              value={String(pendingCount)} label="Pending Requests" />
          </div>
          <div className="pro-animate">
            <StatCard icon={DollarSign} iconColor="#22C55E" bgColor="rgba(34,197,94,0.1)"
              value={`৳${earnings.toLocaleString()}`} label="Earnings (Completed)" />
          </div>
        </div>

        {/* Bookings */}
        <div className="pro-animate mt-8 bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[rgba(26,26,26,0.06)]">
            <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Bookings
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F3EDE5]">
                  {['Client', 'Service', 'Date', 'Notes', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B7E74]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8B7E74]">
                      No bookings yet — they'll appear here when clients book your services.
                    </td>
                  </tr>
                )}
                {bookings.map((b, i) => (
                  <tr key={b.id}
                    className={`border-b border-[rgba(26,26,26,0.04)] hover:bg-[#FFF5EE] transition-colors ${i % 2 === 1 ? 'bg-[#FEFEFE]' : 'bg-white'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#F3EDE5] flex items-center justify-center text-xs font-semibold">
                          {b.client.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A]">{b.client}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#2D2D2D]">{b.service}</td>
                    <td className="px-5 py-4 text-xs text-[#8B7E74]">{formatBookingDate(b.date)}{b.time ? ` · ${formatBookingTime(b.time)}` : ''}</td>
                    <td className="px-5 py-4 text-xs text-[#8B7E74] max-w-[200px] truncate">{b.notes || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#1A1A1A] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                      ৳{b.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={b.status}
                          disabled={savingId === b.id}
                          onChange={(e) => changeBookingStatus(b.id, e.target.value)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:outline-none appearance-none pr-6 ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}
                          style={{
                            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238B7E74' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>\")",
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {savingId === b.id && <Loader2 size={13} className="animate-spin text-[#8B7E74]" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Services */}
        <div className="pro-animate mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              My Services
            </h3>
            <button
              onClick={() => { setEditing(null); setModal('service'); }}
              className="text-sm text-[#FF6B35] hover:underline flex items-center gap-1">
              <Plus size={14} /> Add new
            </button>
          </div>
          {services.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-10 text-center text-sm text-[#8B7E74]">
              You haven't added any services yet. Click "Add Service" to create your first one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc) => (
                <div key={svc.id} className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-5 flex flex-col" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#8B7E74]">{svc.categoryName}</p>
                      <h4 className="text-base font-semibold text-[#1A1A1A] mt-0.5">{svc.title}</h4>
                    </div>
                    {svc.isFeatured && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FFF5EE] text-[#FF6B35] text-[11px] font-medium rounded-full flex-shrink-0">
                        <Star size={11} /> Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#8B7E74] leading-relaxed line-clamp-2 flex-1">
                    {svc.description || 'No description'}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-base font-bold text-[#1A1A1A] tabular-nums">
                      ৳{svc.price.toLocaleString()}<span className="text-xs font-normal text-[#8B7E74]">/{svc.priceUnit}</span>
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditing(svc); setModal('service'); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(26,26,26,0.1)] hover:bg-[#F3EDE5] transition-colors"
                        aria-label="Edit service">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(svc)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[rgba(26,26,26,0.1)] text-[#EF4444] hover:bg-[#FFF5EE] transition-colors"
                        aria-label="Delete service">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability / Working Hours */}
        <div className="pro-animate mt-8 bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[rgba(26,26,26,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[rgba(255,107,53,0.1)] flex items-center justify-center flex-shrink-0">
                <CalendarClock size={18} className="text-[#FF6B35]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Availability &amp; Working Hours
                </h3>
                <p className="text-xs text-[#8B7E74]">
                  Set the days and hours you accept bookings — {availableDays} day{availableDays === 1 ? '' : 's'} active.
                </p>
              </div>
            </div>
            <button
              onClick={saveAvailability}
              disabled={savingAvail}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 whitespace-nowrap">
              {savingAvail ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Hours
            </button>
          </div>

          <div className="divide-y divide-[rgba(26,26,26,0.04)]">
            {DAY_ORDER.map(({ dow, label }) => {
              const day = availability[dow];
              return (
                <div key={dow} className={`flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-3.5 transition-colors ${day.is_available ? 'hover:bg-[#FBF8F4]' : 'bg-[#FCFBFA]'}`}>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setDay(dow, { is_available: !day.is_available })}
                    role="switch"
                    aria-checked={day.is_available}
                    aria-label={`Toggle ${label}`}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${day.is_available ? 'bg-[#FF6B35]' : 'bg-[#D9D2C9]'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${day.is_available ? 'translate-x-5' : ''}`} />
                  </button>

                  {/* Day name */}
                  <span className={`w-24 text-sm font-medium ${day.is_available ? 'text-[#1A1A1A]' : 'text-[#A39B92]'}`}>
                    {label}
                  </span>

                  {/* Times / closed */}
                  {day.is_available ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={day.start}
                        onChange={(e) => setDay(dow, { start: e.target.value })}
                        className="px-3 py-2 text-sm border border-[rgba(26,26,26,0.12)] rounded-[10px] focus:outline-none focus:border-[#FF6B35] bg-white tabular-nums"
                      />
                      <span className="text-[#8B7E74] text-sm">to</span>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) => setDay(dow, { end: e.target.value })}
                        className="px-3 py-2 text-sm border border-[rgba(26,26,26,0.12)] rounded-[10px] focus:outline-none focus:border-[#FF6B35] bg-white tabular-nums"
                      />
                    </div>
                  ) : (
                    <span className="ml-auto text-sm text-[#A39B92] italic pr-1">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-16" />
      </div>

      {/* Modals */}
      {modal === 'service' && (
        <ServiceFormModal
          live={liveData}
          existing={editing}
          onClose={() => { setModal(null); setEditing(null); }}
          onSaved={handleServiceSaved}
        />
      )}
      {modal === 'profile' && (
        <ProfileModal
          live={liveData}
          initial={{
            full_name: profile?.full_name ?? user.full_name,
            title: profile?.title ?? '',
            bio: profile?.bio ?? '',
            years: profile ? String(profile.years_experience) : '',
            location: profile?.location ?? user.location ?? '',
            phone: profile?.phone ?? '',
          }}
          onClose={() => setModal(null)}
          onDone={(msg) => { setToast(msg); loadData(); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Delete Service" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-[#1A1A1A]">
            Are you sure you want to delete <strong>{confirmDelete.title}</strong>? Clients will no longer be able to book it.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => handleDelete(confirmDelete)}
              className="flex-1 px-6 py-3 bg-[#EF4444] text-white text-sm font-medium rounded-[10px] hover:bg-[#DC2626] transition-colors">
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-6 py-3 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
              Cancel
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
