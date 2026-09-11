import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Landmark, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { logAction } from '@/lib/audit';

export default function RegisterPage() {
  const { signUp, session, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session && profile) navigate(returnTo ?? '/', { replace: true });
  }, [session, profile, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      toast('Account created successfully!', 'success');
      await logAction('register', 'auth', null, `New user registered: ${email}`);
      navigate(returnTo ?? '/', { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-stone-800 rounded-2xl mb-4">
            <Landmark size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">Create Account</h1>
          <p className="text-sm text-stone-500 mt-1">Join the Heritage Museum community</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label-text">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Your full name"
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter password"
                className="input-field pl-10"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-amber-700 hover:text-amber-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
