import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      const dest = user.role === 'admin' ? '/admin'
        : user.role === 'professional' && from === '/' ? '/dashboard'
        : from;
      navigate(dest, { replace: true });
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

  return (
    <div className="min-h-screen bg-[#FAF6F0] pt-[72px] page-enter flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-8 md:p-10 my-16" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
        <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-[#8B7E74]">Sign in to book services and manage your account</p>

        {error && (
          <div className="mt-6 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-[10px] text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="mt-3 text-right">
          <Link to="/forgot" className="text-sm text-[#8B7E74] hover:text-[#FF6B35] transition-colors">
            Forgot password?
          </Link>
        </p>

        <p className="mt-6 text-sm text-[#8B7E74] text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#FF6B35] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
