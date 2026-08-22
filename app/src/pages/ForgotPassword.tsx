import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { apiForgotPassword, apiResetPassword, ApiError } from '@/lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestToken = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiForgotPassword(email);
      setInfo(res.message);
      if (res.devToken) {
        setDevToken(res.devToken);
        setToken(res.devToken);
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  const doReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await apiResetPassword(token.trim(), newPassword);
      setInfo('Password reset! Redirecting to sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  const inputWrap = 'relative';
  const inputCls = 'w-full pl-11 pr-4 py-3 bg-[#F3EDE5] rounded-[10px] text-sm outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all';
  const iconCls = 'absolute left-4 top-1/2 -translate-y-1/2 text-[#A39B92]';

  return (
    <div className="min-h-screen bg-[#FAF6F0] pt-[72px] page-enter flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[rgba(26,26,26,0.06)] p-8 md:p-10 my-16" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
        <h1 className="text-3xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-heading)' }}>
          Reset password
        </h1>
        <p className="mt-2 text-sm text-[#8B7E74]">
          {step === 1
            ? "Enter your account email and we'll generate a reset code."
            : 'Enter the reset code and your new password.'}
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-[10px] text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-green-50 border border-green-100 rounded-[10px] text-sm text-green-700">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            {info}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={requestToken} className="mt-6 space-y-4">
            <div className={inputWrap}>
              <Mail size={18} className={iconCls} />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Generate Reset Code
            </button>
          </form>
        ) : (
          <form onSubmit={doReset} className="mt-6 space-y-4">
            {devToken && (
              <div className="flex items-start gap-2 p-3 bg-[#FFF5EE] rounded-[10px] text-xs text-[#8B7E74]">
                <Info size={14} className="mt-0.5 flex-shrink-0 text-[#FF6B35]" />
                <span>
                  Demo note: in production this code would be emailed to you.
                  It has been pre-filled below for demonstration.
                </span>
              </div>
            )}
            <div className={inputWrap}>
              <KeyRound size={18} className={iconCls} />
              <input
                type="text"
                required
                placeholder="Reset code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
            <div className={inputWrap}>
              <Lock size={18} className={iconCls} />
              <input
                type="password"
                required
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-[10px] hover:bg-[#FF6B35] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Set New Password
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-[#8B7E74] text-center">
          Remembered it?{' '}
          <Link to="/login" className="text-[#FF6B35] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
