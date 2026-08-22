import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, DollarSign, Wallet, TrendingUp, TrendingDown,
  Settings, Plus, Download, Bell, ChevronRight, Loader2, WifiOff,
  X, Check, CreditCard, ShieldCheck, RefreshCw, LogOut, Megaphone,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { adminStats, categories as staticCategories, providers as staticProviders } from '@/data/marketplaceData';
import {
  fetchAdminStats, fetchAdminBookings, updateBooking, createService,
  adminCreateUser, fetchCategoryOptions, fetchProfessionalOptions,
  fetchUsers, setUserActive, setUserApproval,
  type CategoryOption, type ProfessionalOption, type AdminUser, type ApprovalStatus, ApiError,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatBookingDate } from '@/lib/utils';

type StatsShape = typeof adminStats;

const DONUT_COLORS = ['#FF6B35', '#2E5CFF', '#22C55E', '#FACC15', '#8B7E74', '#F7C59F', '#FFE4D1'];

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
const toRawStatus = (s: string) => s.toLowerCase().replace(/ /g, '_');
const toDisplayStatus = (s: string) =>
  s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

gsap.registerPlugin(ScrollTrigger);

/* ============================================
   STAT CARD
   ============================================ */
function StatCard({ icon: Icon, iconColor, bgColor, value, label, trend, trendUp }: {
  icon: React.ElementType; iconColor: string; bgColor: string;
  value: string; label: string; trend?: string; trendUp?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-5 transition-all duration-300"
      style={{
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-[#1A1A1A] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
      <p className="text-sm text-[#8B7E74]">{label}</p>
    </div>
  );
}

/* ============================================
   REVENUE CHART (SVG) — Week / Month / Year tabs
   ============================================ */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function RevenueChart({ stats }: { stats: StatsShape }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [range, setRange] = useState<'Week' | 'Month' | 'Year'>('Month');

  const series: Record<'Week' | 'Month' | 'Year', { data: number[]; labels: string[] }> = {
    Week: {
      data: stats.revenueWeek ?? [],
      labels: stats.revenueWeekLabels ?? [],
    },
    Month: { data: stats.revenueData, labels: MONTH_LABELS },
    Year: {
      data: stats.revenueYear ?? [],
      labels: stats.revenueYearLabels ?? [],
    },
  };

  const { data, labels } = series[range].data.length >= 2 ? series[range] : series.Month;
  const maxVal = Math.max(...data, 1);
  const width = 500;
  const height = 200;
  const padding = 20;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: height - padding - (val / maxVal) * (height - padding * 2),
    val,
    label: labels[i] ?? '',
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const labelStep = data.length > 8 ? 2 : 1;

  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Sales Overview
        </h3>
        <div className="flex gap-1">
          {(['Week', 'Month', 'Year'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setRange(tab); setHoveredIndex(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === tab ? 'bg-[#1A1A1A] text-white' : 'text-[#8B7E74] hover:bg-[#F3EDE5]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 300 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={height - padding - pct * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - pct * (height - padding * 2)}
            stroke="rgba(26,26,26,0.04)"
            strokeWidth="1"
          />
        ))}

        {/* Area */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#FF6B35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="cursor-pointer"
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={hoveredIndex === i ? '#FF6B35' : 'white'}
              stroke="#FF6B35"
              strokeWidth="2"
              style={{ transition: 'all 0.2s ease' }}
            />
            {hoveredIndex === i && (
              <>
                <rect x={Math.min(Math.max(p.x - 35, 0), width - 70)} y={Math.max(p.y - 30, 0)} width={70} height={22} rx={4} fill="#1A1A1A" />
                <text x={Math.min(Math.max(p.x, 35), width - 35)} y={Math.max(p.y - 15, 15)} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                  ৳{p.val.toLocaleString()}
                </text>
              </>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {points.filter((_, i) => i % labelStep === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 2} textAnchor="middle" fill="#8B7E74" fontSize="10">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ============================================
   BAR CHART
   ============================================ */
function BarChart({ stats }: { stats: StatsShape }) {
  const data = stats.userGrowth;
  const maxVal = Math.max(...data, 1);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-6">
      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
        User Growth
      </h3>

      <div className="flex items-end gap-2 h-[200px]">
        {data.map((val, i) => {
          const height = (val / maxVal) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end cursor-pointer"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredBar === i && (
                <span className="text-xs font-semibold text-[#1A1A1A] mb-1">{val}</span>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-200"
                style={{
                  height: `${height}%`,
                  backgroundColor: hoveredBar === i ? '#1E4ECC' : '#2E5CFF',
                }}
              />
              <span className="text-[10px] text-[#8B7E74] mt-1">{MONTH_LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================
   DONUT CHART
   ============================================ */
function DonutChart({ stats }: { stats: StatsShape }) {
  const data = stats.categoryDistribution;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);

  let currentAngle = 0;
  const segments = data.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...d, startAngle, angle };
  });

  const size = 200;
  const center = size / 2;
  const radius = 80;
  const innerRadius = 50;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  }

  function innerPolarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + innerRadius * Math.cos(rad),
      y: center + innerRadius * Math.sin(rad),
    };
  }

  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-6">
      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
        Services by Category
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-8">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => {
            const start = polarToCartesian(seg.startAngle);
            const end = polarToCartesian(seg.startAngle + seg.angle);
            const innerStart = innerPolarToCartesian(seg.startAngle);
            const innerEnd = innerPolarToCartesian(seg.startAngle + seg.angle);
            const largeArc = seg.angle > 180 ? 1 : 0;

            const path = [
              `M ${start.x} ${start.y}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
              `L ${innerEnd.x} ${innerEnd.y}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
              'Z',
            ].join(' ');

            return (
              <path
                key={i}
                d={path}
                fill={seg.color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                style={{
                  opacity: hoveredSeg !== null && hoveredSeg !== i ? 0.6 : 1,
                  transform: hoveredSeg === i ? 'scale(1.03)' : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                }}
                onMouseEnter={() => setHoveredSeg(i)}
                onMouseLeave={() => setHoveredSeg(null)}
              />
            );
          })}

          {/* Center text */}
          <text x={center} y={center - 5} textAnchor="middle" fill="#1A1A1A" fontSize="20" fontWeight="700" style={{ fontFamily: 'var(--font-mono)' }}>
            {total.toLocaleString()}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" fill="#8B7E74" fontSize="10">
            Total
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {data.map((cat, i) => (
            <div
              key={cat.name}
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHoveredSeg(i)}
              onMouseLeave={() => setHoveredSeg(null)}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-sm text-[#1A1A1A]">{cat.name}</span>
              <span className="text-sm font-semibold text-[#1A1A1A] ml-auto">
                {((cat.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  return (
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
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-[rgba(26,26,26,0.12)] rounded-[10px] focus:outline-none focus:border-[#FF6B35] bg-white';
const labelCls = 'block text-xs font-semibold text-[#8B7E74] uppercase tracking-wider mb-1.5';

const localIso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ============================================
   EXPORT REPORT MODAL (date-range picker)
   ============================================ */
function ExportReportModal({ onClose, onExport }: {
  onClose: () => void;
  onExport: (range: { from: string; to: string } | null) => void | Promise<void>;
}) {
  const [from, setFrom] = useState(localIso(29));
  const [to, setTo] = useState(localIso(0));
  const [allTime, setAllTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const applyPreset = (days: number) => {
    setAllTime(false);
    setError('');
    setFrom(localIso(days - 1));
    setTo(localIso(0));
  };
  const applyThisMonth = () => {
    setAllTime(false);
    setError('');
    const d = new Date();
    setFrom(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    setTo(localIso(0));
  };

  const submit = async () => {
    if (!allTime) {
      if (!from || !to) { setError('Please choose both a start and end date.'); return; }
      if (from > to) { setError('“From” date must be on or before the “To” date.'); return; }
    }
    setBusy(true);
    try {
      await onExport(allTime ? null : { from, to });
      onClose();
    } catch {
      setError('Could not generate the report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Export Report" onClose={onClose}>
      <p className="text-sm text-[#8B7E74] mb-4">
        Pick a date range for the booking report, or export the full history.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        <button type="button" onClick={() => applyPreset(7)} className="px-3 py-1.5 text-xs rounded-full border border-[rgba(26,26,26,0.12)] hover:bg-[#F3EDE5] transition-colors">Last 7 days</button>
        <button type="button" onClick={() => applyPreset(30)} className="px-3 py-1.5 text-xs rounded-full border border-[rgba(26,26,26,0.12)] hover:bg-[#F3EDE5] transition-colors">Last 30 days</button>
        <button type="button" onClick={applyThisMonth} className="px-3 py-1.5 text-xs rounded-full border border-[rgba(26,26,26,0.12)] hover:bg-[#F3EDE5] transition-colors">This month</button>
        <button
          type="button"
          onClick={() => { setAllTime(true); setError(''); }}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${allTime ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[rgba(26,26,26,0.12)] hover:bg-[#F3EDE5]'}`}>
          All time
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>From</label>
          <input
            type="date"
            className={`${inputCls} disabled:opacity-50`}
            value={from}
            max={to}
            disabled={allTime}
            onChange={(e) => { setAllTime(false); setError(''); setFrom(e.target.value); }}
          />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input
            type="date"
            className={`${inputCls} disabled:opacity-50`}
            value={to}
            min={from}
            disabled={allTime}
            onChange={(e) => { setAllTime(false); setError(''); setTo(e.target.value); }}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[#EF4444]">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-5 w-full py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Preparing…</> : <><Download size={16} /> Download CSV</>}
      </button>
    </Modal>
  );
}

/* ============================================
   ADD SERVICE MODAL
   ============================================ */
function AddServiceModal({ live, onClose, onDone }: {
  live: boolean; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [pros, setPros] = useState<ProfessionalOption[]>([]);
  const [cats, setCats] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    professional_id: '', category_id: '', title: '', description: '',
    price: '', price_unit: 'hr', is_featured: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (live) {
      fetchProfessionalOptions().then((p) => p && setPros(p));
      fetchCategoryOptions().then((c) => c && setCats(c));
    } else {
      setPros(staticProviders.map((p) => ({ id: p.id, name: p.name, title: p.title })));
      setCats(staticCategories.map((c, i) => ({ id: i + 1, name: c.name })));
    }
  }, [live]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.professional_id || !form.category_id || !form.title || !form.price) {
      setError('Please fill in professional, category, title, and price.');
      return;
    }
    if (!live) {
      onDone('Demo mode — service not saved (backend is offline).');
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await createService({
        professional_id: Number(form.professional_id),
        category_id: Number(form.category_id),
        title: form.title,
        description: form.description,
        price: Number(form.price),
        price_unit: form.price_unit,
        is_featured: form.is_featured,
      });
      onDone(`Service "${form.title}" created successfully.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Service" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Professional</label>
          <select className={inputCls} value={form.professional_id}
            onChange={(e) => setForm({ ...form, professional_id: e.target.value })}>
            <option value="">Select professional…</option>
            {pros.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.title}</option>
            ))}
          </select>
        </div>
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
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={form.title} placeholder="e.g. AC Servicing & Repair"
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
        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] cursor-pointer">
          <input type="checkbox" checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
          Featured on homepage
        </label>

        {!live && (
          <p className="text-xs text-[#FF6B35] bg-[#FFF5EE] rounded-lg px-3 py-2">
            Backend offline — demo mode. The service won't be persisted.
          </p>
        )}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={submitting}
          className="mt-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Create Service
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   ADD PROFESSIONAL MODAL
   ============================================ */
function AddProfessionalModal({ live, onClose, onDone }: {
  live: boolean; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', title: '', phone: '', location: '', id_card_number: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!live) {
      onDone('Demo mode — professional not saved (backend is offline).');
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await adminCreateUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: 'professional',
        title: form.title || 'Professional',
        phone: form.phone || undefined,
        location: form.location || undefined,
        id_card_number: form.id_card_number || undefined,
      });
      onDone(`Professional "${form.full_name}" created (auto-approved). They can now log in.`);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create professional.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Professional" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={form.full_name} placeholder="e.g. Kamal Uddin"
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input className={inputCls} type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Professional Title</label>
            <input className={inputCls} value={form.title} placeholder="e.g. Electrician"
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>ID Card Number</label>
            <input className={inputCls} value={form.id_card_number} placeholder="NID / Passport"
              onChange={(e) => setForm({ ...form, id_card_number: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phone</label>
            <input className={inputCls} value={form.phone} placeholder="01711-000000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} placeholder="e.g. Sonadanga, Khulna"
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>

        {!live && (
          <p className="text-xs text-[#FF6B35] bg-[#FFF5EE] rounded-lg px-3 py-2">
            Backend offline — demo mode. The professional won't be persisted.
          </p>
        )}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={submitting}
          className="mt-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Create Professional
        </button>
      </form>
    </Modal>
  );
}

/* ============================================
   ANNOUNCEMENT MODAL (site-wide banner)
   ============================================ */
export const ANNOUNCEMENT_KEY = 'neighbour_announcement';

function AnnouncementModal({ onClose, onDone }: {
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const [text, setText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ANNOUNCEMENT_KEY);
      return saved ? (JSON.parse(saved).text as string) : '';
    } catch { return ''; }
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify({ text: text.trim(), ts: Date.now() }));
    onDone('Announcement published — it now shows as a banner across the site.');
    onClose();
  };

  const clear = () => {
    localStorage.removeItem(ANNOUNCEMENT_KEY);
    onDone('Announcement removed.');
    onClose();
  };

  return (
    <Modal title="Site Announcement" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Message</label>
          <textarea className={inputCls} rows={3} value={text}
            placeholder="e.g. Eid offer — 20% off all cleaning services in Khulna this week!"
            onChange={(e) => setText(e.target.value)} />
          <p className="text-xs text-[#8B7E74] mt-1.5">
            Shown as a banner at the top of every page for all visitors of this browser.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors">
            Publish
          </button>
          <button type="button" onClick={clear}
            className="px-6 py-3 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
            Remove
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================
   USER MANAGEMENT TABLE
   ============================================ */
const demoUsers: AdminUser[] = [
  { id: 8, name: 'Imran Kabir', email: 'imran.kabir@gmail.com', phone: '01711-000106', idCardNumber: '1990-1122334455', role: 'professional', location: 'Boyra, Khulna', active: true, approvalStatus: 'pending', proTitle: 'AC & Refrigeration Technician', createdAt: '2026-06-28' },
  { id: 1, name: 'Admin User', email: 'admin@neighbour.com', phone: '01711-000100', idCardNumber: '', role: 'admin', location: 'Khulna, Bangladesh', active: true, approvalStatus: 'approved', proTitle: null, createdAt: '2026-01-10' },
  { id: 2, name: 'Rafiqul Islam', email: 'rafiqul.islam@gmail.com', phone: '01711-000101', idCardNumber: '1988-2233445566', role: 'professional', location: 'Sonadanga, Khulna', active: true, approvalStatus: 'approved', proTitle: 'Master Plumber', createdAt: '2026-01-15' },
  { id: 3, name: 'Shirin Akter', email: 'shirin.akter@gmail.com', phone: '01711-000102', idCardNumber: '1992-3344556677', role: 'professional', location: 'Khalishpur, Khulna', active: true, approvalStatus: 'approved', proTitle: 'Professional Cleaner', createdAt: '2026-02-02' },
  { id: 4, name: 'Tania Rahman', email: 'tania.rahman@gmail.com', phone: '01711-000103', idCardNumber: '1995-4455667788', role: 'professional', location: 'Shibbari, Khulna', active: true, approvalStatus: 'approved', proTitle: 'Portrait Photographer', createdAt: '2026-02-20' },
  { id: 5, name: 'Farhana Yasmin', email: 'farhana@example.com', phone: '01711-000200', idCardNumber: '', role: 'client', location: 'Nirala, Khulna', active: true, approvalStatus: 'approved', proTitle: null, createdAt: '2026-03-05' },
];

const roleColors: Record<string, string> = {
  admin: 'bg-[#FF6B35]/10 text-[#FF6B35]',
  professional: 'bg-[#2E5CFF]/10 text-[#2E5CFF]',
  client: 'bg-[#22C55E]/10 text-[#22C55E]',
};

function UsersTable({ users, currentUserId, savingId, onToggle }: {
  users: AdminUser[];
  currentUserId: number;
  savingId: number | null;
  onToggle: (u: AdminUser) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-[rgba(26,26,26,0.06)]">
        <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          User Management
        </h3>
        <span className="text-xs text-[#8B7E74]">{users.length} users</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F3EDE5]">
              {['User', 'Role', 'Location', 'Joined', 'Status', 'Action'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B7E74]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}
                className={`border-b border-[rgba(26,26,26,0.04)] hover:bg-[#FFF5EE] transition-colors ${i % 2 === 1 ? 'bg-[#FEFEFE]' : 'bg-white'}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F3EDE5] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{u.name}</p>
                      <p className="text-xs text-[#8B7E74] truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full capitalize ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                  {u.proTitle && <p className="text-xs text-[#8B7E74] mt-1">{u.proTitle}</p>}
                  {u.idCardNumber && <p className="text-[11px] text-[#A39B92] mt-0.5">ID: {u.idCardNumber}</p>}
                </td>
                <td className="px-5 py-4 text-sm text-[#2D2D2D]">{u.location || '—'}</td>
                <td className="px-5 py-4 text-xs text-[#8B7E74]">{u.createdAt}</td>
                <td className="px-5 py-4">
                  {u.approvalStatus === 'pending' ? (
                    <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-[#FACC15]/15 text-[#A3870F]">Pending</span>
                  ) : u.approvalStatus === 'rejected' ? (
                    <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-[#EF4444]/10 text-[#EF4444]">Rejected</span>
                  ) : (
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${u.active ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-[#8B7E74]">You</span>
                  ) : (
                    <button
                      onClick={() => onToggle(u)}
                      disabled={savingId === u.id}
                      className={`px-3 py-1.5 text-xs font-medium rounded-[8px] border transition-colors disabled:opacity-60 ${
                        u.active
                          ? 'border-[#EF4444]/30 text-[#EF4444] hover:bg-[#FFF5EE]'
                          : 'border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/5'
                      }`}>
                      {savingId === u.id ? '…' : u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================
   SALES & COMMISSION BREAKDOWN
   ============================================ */
const money = (n: number) => `৳${Math.round(n).toLocaleString()}`;

function SalesBreakdown({ stats }: { stats: StatsShape }) {
  const [view, setView] = useState<'service' | 'category'>('service');

  const rows =
    view === 'service'
      ? (stats.salesByService ?? []).map((r) => ({
          name: r.service, sub: r.category, bookings: r.bookings, gross: r.gross, commission: r.commission,
        }))
      : (stats.salesByCategory ?? []).map((r) => ({
          name: r.name, sub: '', bookings: r.bookings, gross: r.gross, commission: r.commission,
        }));

  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalComm = rows.reduce((s, r) => s + r.commission, 0);
  const rate = Math.round((stats.commissionRate ?? 0.15) * 100);

  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[rgba(26,26,26,0.06)]">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Sales &amp; Revenue by {view === 'service' ? 'Service' : 'Category'}
          </h3>
          <p className="text-xs text-[#8B7E74] mt-0.5">Platform revenue is {rate}% of each paid service.</p>
        </div>
        <div className="flex gap-1 p-1 bg-[#F3EDE5] rounded-[10px] self-start">
          {(['service', 'category'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                view === v ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-[#8B7E74]'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F3EDE5]">
              {[view === 'service' ? 'Service' : 'Category', 'Bookings', 'Sales', `Revenue (${rate}%)`].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B7E74] ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#8B7E74]">
                  No paid bookings yet — sales will appear here once services are paid for.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.name + i} className={`border-b border-[rgba(26,26,26,0.04)] hover:bg-[#FFF5EE] transition-colors ${i % 2 === 1 ? 'bg-[#FEFEFE]' : 'bg-white'}`}>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-[#1A1A1A]">{r.name}</p>
                  {r.sub && <p className="text-xs text-[#8B7E74]">{r.sub}</p>}
                </td>
                <td className="px-5 py-4 text-sm text-[#2D2D2D] text-right tabular-nums">{r.bookings}</td>
                <td className="px-5 py-4 text-sm text-[#1A1A1A] text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{money(r.gross)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-[#22C55E] text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{money(r.commission)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[rgba(26,26,26,0.08)] bg-[#FAF6F0]">
                <td className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A]">Total</td>
                <td className="px-5 py-3.5" />
                <td className="px-5 py-3.5 text-sm font-bold text-[#1A1A1A] text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{money(totalGross)}</td>
                <td className="px-5 py-3.5 text-sm font-bold text-[#22C55E] text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{money(totalComm)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ============================================
   PENDING PROVIDER APPROVALS
   ============================================ */
function PendingApprovals({ users, savingId, onDecision }: {
  users: AdminUser[];
  savingId: number | null;
  onDecision: (u: AdminUser, status: ApprovalStatus) => void;
}) {
  const pending = users.filter((u) => u.approvalStatus === 'pending');

  return (
    <div className="bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-[rgba(26,26,26,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[rgba(250,204,21,0.15)] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-[#A3870F]" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Pending Provider Approvals
          </h3>
        </div>
        {pending.length > 0 && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FACC15]/15 text-[#A3870F]">
            {pending.length} waiting
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#8B7E74]">
          No providers waiting for approval. New sign-ups will show up here.
        </div>
      ) : (
        <div className="divide-y divide-[rgba(26,26,26,0.04)]">
          {pending.map((u) => (
            <div key={u.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-5 py-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full bg-[#F3EDE5] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {u.name}
                    {u.proTitle && <span className="text-[#8B7E74] font-normal"> · {u.proTitle}</span>}
                  </p>
                  <p className="text-xs text-[#8B7E74] truncate">{u.email}{u.location ? ` · ${u.location}` : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#8B7E74] md:w-56">
                <CreditCard size={14} className="flex-shrink-0" />
                <span className="truncate">ID: {u.idCardNumber || '— not provided —'}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onDecision(u, 'approved')}
                  disabled={savingId === u.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] bg-[#22C55E] text-white hover:bg-[#16A34A] transition-colors disabled:opacity-60">
                  {savingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                </button>
                <button
                  onClick={() => onDecision(u, 'rejected')}
                  disabled={savingId === u.id}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#FFF5EE] transition-colors disabled:opacity-60">
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================
   ADMIN PAGE
   ============================================ */
type BookingRow = StatsShape['recentBookings'][number] & { paymentStatus?: string };

export default function Admin() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [stats, setStats] = useState<StatsShape>(adminStats);
  const [bookings, setBookings] = useState<BookingRow[]>(adminStats.recentBookings);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [liveData, setLiveData] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState<'service' | 'professional' | 'announcement' | 'export' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>(demoUsers);
  const [userSavingId, setUserSavingId] = useState<number | null>(null);
  const [approvalSavingId, setApprovalSavingId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  // --- Route guard: admins only ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin' } });
    } else if (user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // --- Toast auto-hide ---
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Live stats from backend (falls back to demo data) ---
  const loadStats = useCallback(async () => {
    const s = await fetchAdminStats();
    if (!s) {
      setLiveData(false);
      return false;
    }
    const mappedBookings = s.recentBookings.length
      ? s.recentBookings.map((b) => ({
          id: b.id,
          customer: b.customer,
          service: b.service,
          professional: b.professional,
          date: String(b.date),
          amount: Number(b.amount),
          status: toDisplayStatus(b.status),
        }))
      : adminStats.recentBookings;
    setStats({
      ...adminStats,
      totalUsers: s.totalUsers,
      activeServices: s.activeServices,
      avgRating: s.avgRating,
      pendingProviders: s.pendingProviders ?? 0,
      grossSales: s.grossSales ?? 0,
      revenue: s.revenue,
      commissionRate: s.commissionRate ?? adminStats.commissionRate,
      trends: s.trends ?? adminStats.trends,
      // Show real breakdowns from the DB (empty is valid — no fake data when live).
      salesByService: s.salesByService ?? [],
      salesByCategory: s.salesByCategory ?? [],
      userGrowth: s.userGrowth.some((v) => v > 0) ? s.userGrowth : adminStats.userGrowth,
      revenueData: s.revenueData.some((v) => v > 0) ? s.revenueData : adminStats.revenueData,
      revenueWeek: s.revenueWeek?.some((v) => v > 0) ? s.revenueWeek : adminStats.revenueWeek,
      revenueWeekLabels: s.revenueWeek?.some((v) => v > 0) ? (s.revenueWeekLabels ?? []) : adminStats.revenueWeekLabels,
      revenueYear: s.revenueYear?.some((v) => v > 0) ? s.revenueYear : adminStats.revenueYear,
      revenueYearLabels: s.revenueYear?.some((v) => v > 0) ? (s.revenueYearLabels ?? []) : adminStats.revenueYearLabels,
      categoryDistribution: s.categoryDistribution.length
        ? s.categoryDistribution.map((c, i) => ({
            name: c.name,
            value: Number(c.value),
            color: DONUT_COLORS[i % DONUT_COLORS.length],
          }))
        : adminStats.categoryDistribution,
      recentBookings: mappedBookings,
    });
    setBookings(mappedBookings);
    const u = await fetchUsers();
    if (u) setUsers(u);
    setLiveData(true);
    return true;
  }, []);

  // --- Toggle user active state ---
  const toggleUser = async (target: AdminUser) => {
    const next = !target.active;
    setUsers((us) => us.map((x) => (x.id === target.id ? { ...x, active: next } : x)));
    if (!liveData) {
      setToast('Demo mode — user status changed locally only.');
      return;
    }
    setUserSavingId(target.id);
    try {
      await setUserActive(target.id, next);
      setToast(`${target.name} ${next ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      setUsers((us) => us.map((x) => (x.id === target.id ? { ...x, active: !next } : x)));
      setToast(err instanceof ApiError ? err.message : 'Failed to update user.');
    } finally {
      setUserSavingId(null);
    }
  };

  // --- Approve / reject a pending provider ---
  const handleApproval = async (target: AdminUser, status: ApprovalStatus) => {
    const apply = () =>
      setUsers((us) => us.map((x) =>
        x.id === target.id
          ? { ...x, approvalStatus: status, active: status === 'approved' ? true : x.active }
          : x));

    if (!liveData) {
      apply();
      setToast('Demo mode — approval saved locally only.');
      return;
    }
    setApprovalSavingId(target.id);
    try {
      await setUserApproval(target.id, status);
      apply();
      setToast(`${target.name} ${status === 'approved' ? 'approved — they can now log in' : 'rejected'}.`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Failed to update approval.');
    } finally {
      setApprovalSavingId(null);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    loadStats().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [user, loadStats]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.admin-animate').forEach((el, i) => {
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
        gsap.utils.toArray<HTMLElement>('.admin-animate').forEach((el) => {
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

  // --- View all bookings ---
  const toggleAllBookings = async () => {
    if (showAllBookings) {
      setBookings(stats.recentBookings);
      setShowAllBookings(false);
      return;
    }
    if (liveData) {
      const all = await fetchAdminBookings(50);
      if (all) {
        setBookings(all.map((b) => ({
          id: b.id,
          customer: b.customer,
          service: b.service,
          professional: b.professional,
          date: b.date,
          amount: b.amount,
          status: toDisplayStatus(b.status),
          paymentStatus: b.paymentStatus,
        })));
      }
    }
    setShowAllBookings(true);
  };

  // --- CSV export / report (optionally limited to a date range) ---
  const exportReport = async (range: { from: string; to: string } | null = null) => {
    const rate = stats.commissionRate ?? 0.15;
    const pct = Math.round(rate * 100);

    // Gather booking rows. When live, fetch a wide set so the range is meaningful
    // (the on-screen table only holds the recent ones).
    let rows = bookings;
    if (liveData) {
      const all = await fetchAdminBookings(1000);
      if (all) {
        rows = all.map((b) => ({
          id: b.id,
          customer: b.customer,
          service: b.service,
          professional: b.professional,
          date: b.date,
          amount: b.amount,
          status: toDisplayStatus(b.status),
          paymentStatus: b.paymentStatus,
        }));
      }
    }

    // ISO date strings sort lexicographically, so range compare is a plain string compare.
    const inRange = (d: string) => !range || (d >= range.from && d <= range.to);
    const filtered = rows.filter((b) => inRange(b.date));

    const rangeGross = filtered.reduce((s, b) => s + (b.amount || 0), 0);
    const completedGross = filtered
      .filter((b) => b.status === 'Completed')
      .reduce((s, b) => s + (b.amount || 0), 0);
    const rangeRevenue = Math.round(completedGross * rate);
    const rangeLabel = range ? `${range.from} to ${range.to}` : 'All time';

    const now = new Date();
    const genIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const lines: string[] = [];
    lines.push('Neighbour — Khulna Marketplace Report');
    lines.push(`Generated,${genIso}`);
    lines.push(`Report range,${rangeLabel}`);
    lines.push('');
    lines.push('Platform snapshot (all-time),Value');
    lines.push(`Total Users,${stats.totalUsers}`);
    lines.push(`Active Services,${stats.activeServices}`);
    lines.push(`Average Rating,${stats.avgRating}`);
    lines.push(`Gross Sales (BDT),${Math.round(stats.grossSales ?? 0)}`);
    lines.push(`Platform Revenue ${pct}% (BDT),${Math.round(stats.revenue)}`);
    lines.push('');
    lines.push(`Bookings in range (${rangeLabel}),Value`);
    lines.push(`Bookings,${filtered.length}`);
    lines.push(`Gross in range (BDT),${Math.round(rangeGross)}`);
    lines.push(`Completed revenue ${pct}% (BDT),${rangeRevenue}`);
    lines.push('');
    lines.push(`Service,Bookings,Sales (BDT),Revenue ${pct}% (BDT)`);
    (stats.salesByService ?? []).forEach((r) =>
      lines.push(`"${r.service}",${r.bookings},${Math.round(r.gross)},${Math.round(r.commission)}`)
    );
    lines.push('');
    lines.push('Category,Services');
    stats.categoryDistribution.forEach((c) => lines.push(`${c.name},${c.value}`));
    lines.push('');
    lines.push('Booking ID,Customer,Service,Professional,Date,Amount (BDT),Status');
    filtered.forEach((b) =>
      lines.push(`${b.id},"${b.customer}","${b.service}","${b.professional}",${b.date},${b.amount},${b.status}`)
    );

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = range ? `${range.from}_to_${range.to}` : 'all-time';
    a.download = `neighbour-report-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Report (${rangeLabel}) downloaded as CSV.`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const statusColors: Record<string, string> = {
    Completed: 'bg-[#22C55E]/10 text-[#22C55E]',
    Pending: 'bg-[#FACC15]/15 text-[#A3870F]',
    Confirmed: 'bg-[#2E5CFF]/10 text-[#2E5CFF]',
    'In Progress': 'bg-[#2E5CFF]/10 text-[#2E5CFF]',
    Cancelled: 'bg-[#EF4444]/10 text-[#EF4444]',
  };

  // Turn a real MoM trend into StatCard props (omitted → no badge shown).
  const fmtTrend = (t?: { pct: number; up: boolean }) =>
    t ? { trend: `${t.up ? '+' : ''}${t.pct}%`, trendUp: t.up } : {};

  // Block rendering until the auth check completes
  if (authLoading || !user || user.role !== 'admin') {
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
          <Link to="/" className="hover:text-[#FF6B35]">Home</Link> / Dashboard / Overview
        </p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              Dashboard
            </h1>
            <p className="text-sm text-[#8B7E74] mt-1 flex items-center gap-2">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {!liveData && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF5EE] text-[#FF6B35] text-xs rounded-full">
                  <WifiOff size={11} /> demo data
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal('service')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors">
              <Plus size={16} /> Add Service
            </button>
            <button
              onClick={() => setModal('export')}
              className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(26,26,26,0.12)] text-sm font-medium rounded-[10px] hover:bg-[#F3EDE5] transition-colors">
              <Download size={16} /> Export
            </button>
            <div className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-[10px] border border-[rgba(26,26,26,0.12)] hover:bg-[#F3EDE5] transition-colors">
                <Settings size={18} />
              </button>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setSettingsOpen(false)} />
                  <div className="absolute right-0 top-12 z-[60] w-52 bg-white rounded-xl shadow-lg border border-[rgba(26,26,26,0.08)] py-1.5">
                    <button
                      onClick={async () => {
                        setSettingsOpen(false);
                        const ok = await loadStats();
                        setToast(ok ? 'Data refreshed from server.' : 'Backend offline — showing demo data.');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors">
                      <RefreshCw size={15} /> Refresh data
                    </button>
                    <button
                      onClick={() => { setSettingsOpen(false); setModal('announcement'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F3EDE5] transition-colors">
                      <Megaphone size={15} /> Announcement
                    </button>
                    <div className="my-1 border-t border-[rgba(26,26,26,0.06)]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FFF5EE] transition-colors">
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Stats Cards — all values & trends come from live data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="admin-animate">
            <StatCard
              icon={Users}
              iconColor="#2E5CFF"
              bgColor="rgba(46, 92, 255, 0.1)"
              value={stats.totalUsers.toLocaleString()}
              label="Total Users"
              {...fmtTrend(stats.trends?.users)}
            />
          </div>
          <div className="admin-animate">
            <StatCard
              icon={DollarSign}
              iconColor="#2E5CFF"
              bgColor="rgba(46, 92, 255, 0.1)"
              value={money(stats.grossSales ?? 0)}
              label="Total Sales"
              {...fmtTrend(stats.trends?.sales)}
            />
          </div>
          <div className="admin-animate">
            <StatCard
              icon={Wallet}
              iconColor="#22C55E"
              bgColor="rgba(34, 197, 94, 0.1)"
              value={money(stats.revenue)}
              label={`Revenue (${Math.round((stats.commissionRate ?? 0.15) * 100)}% cut)`}
              {...fmtTrend(stats.trends?.revenue)}
            />
          </div>
          <div className="admin-animate">
            <StatCard
              icon={Briefcase}
              iconColor="#FF6B35"
              bgColor="rgba(255, 107, 53, 0.1)"
              value={stats.activeServices.toLocaleString()}
              label="Active Services"
              {...fmtTrend(stats.trends?.services)}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="admin-animate">
            <RevenueChart stats={stats} />
          </div>
          <div className="admin-animate">
            <BarChart stats={stats} />
          </div>
        </div>

        {/* Sales & revenue breakdown (per service / per category) */}
        <div className="admin-animate mt-8">
          <SalesBreakdown stats={stats} />
        </div>

        {/* Bookings Table */}
        <div className="admin-animate mt-8 bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[rgba(26,26,26,0.06)]">
            <h3 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
              {showAllBookings ? 'All Bookings' : 'Recent Bookings'}
            </h3>
            <button
              onClick={toggleAllBookings}
              className="text-sm text-[#FF6B35] hover:underline flex items-center gap-1">
              {showAllBookings ? 'Show recent' : 'View all'} <ChevronRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F3EDE5]">
                  {['Customer', 'Service', 'Professional', 'Date', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B7E74]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, i) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-[rgba(26,26,26,0.04)] hover:bg-[#FFF5EE] transition-colors ${
                      i % 2 === 1 ? 'bg-[#FEFEFE]' : 'bg-white'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#F3EDE5] flex items-center justify-center text-xs font-semibold">
                          {booking.customer.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A]">{booking.customer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#2D2D2D]">{booking.service}</td>
                    <td className="px-5 py-4 text-sm text-[#2D2D2D]">{booking.professional}</td>
                    <td className="px-5 py-4 text-xs text-[#8B7E74]">{formatBookingDate(booking.date)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#1A1A1A] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                      ৳{booking.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={booking.status}
                          disabled={savingId === booking.id}
                          onChange={(e) => changeBookingStatus(booking.id, e.target.value)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border-0 cursor-pointer focus:outline-none appearance-none pr-6 ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}
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
                        {savingId === booking.id && <Loader2 size={13} className="animate-spin text-[#8B7E74]" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending provider approvals */}
        <div className="admin-animate mt-8">
          <PendingApprovals
            users={users}
            savingId={approvalSavingId}
            onDecision={handleApproval}
          />
        </div>

        {/* User Management */}
        <div className="admin-animate mt-8">
          <UsersTable
            users={users}
            currentUserId={user.id}
            savingId={userSavingId}
            onToggle={toggleUser}
          />
        </div>

        {/* Category Distribution */}
        <div className="admin-animate mt-8">
          <DonutChart stats={stats} />
        </div>

        {/* Bottom padding for FAB */}
        <div className="h-24" />
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 items-end mb-2">
            {[
              { icon: Briefcase, label: 'Add Service', action: () => setModal('service') },
              { icon: Users, label: 'Add Professional', action: () => setModal('professional') },
              { icon: Bell, label: 'Announcement', action: () => setModal('announcement') },
              { icon: Download, label: 'Generate Report', action: () => setModal('export') },
            ].map((item, i) => (
              <button
                key={item.label}
                className="flex items-center gap-2 bg-white rounded-full shadow-md px-4 py-2 text-sm hover:shadow-lg transition-all"
                style={{
                  animation: `fabItemIn 0.3s ${i * 0.05}s cubic-bezier(0.16, 1, 0.3, 1) both`,
                }}
                onClick={() => { setFabOpen(false); item.action(); }}
              >
                <span className="text-[#8B7E74]">{item.label}</span>
                <span className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <item.icon size={18} className="text-[#1A1A1A]" />
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 bg-[#FF6B35] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ boxShadow: '0 8px 32px rgba(255, 107, 53, 0.4)' }}
        >
          <Plus size={24} className={`transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Modals */}
      {modal === 'service' && (
        <AddServiceModal live={liveData} onClose={() => setModal(null)} onDone={setToast} />
      )}
      {modal === 'professional' && (
        <AddProfessionalModal live={liveData} onClose={() => setModal(null)} onDone={setToast} />
      )}
      {modal === 'announcement' && (
        <AnnouncementModal onClose={() => setModal(null)} onDone={setToast} />
      )}
      {modal === 'export' && (
        <ExportReportModal onClose={() => setModal(null)} onExport={exportReport} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[90] max-w-[400px] bg-white rounded-2xl shadow-lg p-4 border-l-4 border-[#FF6B35]">
          <p className="text-sm text-[#1A1A1A]">{toast}</p>
        </div>
      )}

      <style>{`
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateY(20px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
