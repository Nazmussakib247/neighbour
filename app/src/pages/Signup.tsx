import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, MapPin, Briefcase, CreditCard, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'professional' ? 'professional' : 'client';

  const [role, setRole] = useState<'client' | 'professional'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locationField, setLocationField] = useState('');
  const [title, setTitle] = useState('');
  const [idCard, setIdCard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (role === 'professional' && !title.trim()) {
      setError('Please enter your professional title');
      return;
    }
    if (role === 'professional' && !idCard.trim()) {
      setError('Please enter your ID card number');
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        full_name: fullName,
        email,
        password,
        role,
        location: locationField || undefined,
        title: role === 'professional' ? title : undefined,
        id_card_number: role === 'professional' ? idCard.trim() : undefined,
      });
      if (result.pending) {
        // Provider account created but awaiting admin approval — not logged in yet.
        setPendingMsg(result.message || 'Your provider account is pending admin approval.');
      } else {
        navigate(role === 'professional' ? '/dashboard' : '/', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Cannot reach the server. Is the backend (XAMPP) running?');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingMsg) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] pt-[72px] page-enter flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-8 md:p-10 my-16 text-center" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF5EE] flex items-center justify-center">
            <Clock size={28} className="text-[#FF6B35]" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
            Application submitted
          </h1>
          <p className="mt-3 text-sm text-[#8B7E74] leading-relaxed">{pendingMsg}</p>
          <div className="mt-6 flex items-start gap-2 p-3 bg-[#FFF5EE] rounded-[10px] text-sm text-left text-[#8B5A3C]">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#FF6B35]" />
            An admin will review your ID and details. You'll be able to sign in once your account is approved.
          </div>
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors"
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] pt-[72px] page-enter flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-8 md:p-10 my-16" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
        <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[#8B7E74]">Join the neighbourhood marketplace</p>

        {/* Role toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 p-1 bg-[#F3EDE5] rounded-[10px]">
          {(['client', 'professional'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2.5 text-sm font-medium rounded-lg transition-colors ${
                role === r ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-[#8B7E74]'
              }`}
            >
              {r === 'client' ? 'I need services' : 'I offer services'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-[10px] text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="relative">
            <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="text"
              required
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="password"
              required
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          <div className="relative">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
            <input
              type="text"
              placeholder="Location (e.g. Sonadanga, Khulna)"
              value={locationField}
              onChange={(e) => setLocationField(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          {role === 'professional' && (
            <>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
                <input
                  type="text"
                  required
                  placeholder="Professional title (e.g. Master Plumber)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
                />
              </div>
              <div className="relative">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]" />
                <input
                  type="text"
                  required
                  placeholder="ID card number (NID / Passport)"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
                />
              </div>
              <p className="-mt-2 flex items-start gap-1.5 text-xs text-[#8B7E74]">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                Providers need admin approval before their account goes live.
              </p>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {role === 'professional' ? 'Join as a Pro' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#8B7E74] text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-[#FF6B35] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
