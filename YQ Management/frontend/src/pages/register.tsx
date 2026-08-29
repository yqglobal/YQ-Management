import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Lock, Mail, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchApi, AuthStorage, getBackendUrl } from '../lib/api';
import TermsModal from '../components/TermsModal';
import { Logo } from '../components/Logo';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [invitePreview, setInvitePreview] = useState<null | { workspaceName: string; role: string; code: string }>(null);

  React.useEffect(() => {
    const code = (router.query.inviteCode || router.query.code || (typeof window !== 'undefined' ? localStorage.getItem('qmova_invite_code') : null)) as string;
    if (typeof code === 'string' && code.trim()) {
      const trimmed = code.trim().toUpperCase();
      localStorage.setItem('qmova_invite_code', trimmed);
      document.cookie = `qmova_invite_code=${trimmed}; path=/; max-age=86400; SameSite=Lax`;
      fetchApi(`/workspace/invite-preview/${trimmed}`)
        .then((res: any) => {
          if (res?.valid) {
            setInvitePreview({ workspaceName: res.workspaceName, role: res.role, code: res.code });
            if (res.email && !email) {
              setEmail(res.email);
            }
          }
        })
    }

    if (router.query.error) {
      const err = router.query.error as string;
      if (err === 'ALREADY_LINKED_GOOGLE') {
        setError('Account with this email already exists via Google.');
      } else if (err === 'EMAIL_PWD_ACCOUNT') {
        setError('Account with this email already exists.');
      } else {
        setError(err);
      }
      
      // Clean up the URL
      const { error: _error, ...restQuery } = router.query;
      router.replace({ pathname: router.pathname, query: restQuery }, undefined, { shallow: true });
    }
  }, [router.query]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
      });

      if (data?.requiresOtp) {
        setStep('otp');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    setResendSuccess('');
    try {
      await fetchApi('/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'signup' }),
      });
      setResendSuccess('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/auth/verify-signup', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });

      if (data?.access_token) {
        AuthStorage.set(data.access_token);
      }
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex relative overflow-x-hidden">
      <Head>
        <title>Sign Up | Qmova</title>
      </Head>
      
      <div className="noise-overlay"></div>

      {/* Left Panel - Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#09090b] items-center justify-center border-r border-white/5 z-10">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/djp3znbwz/image/upload/v1706692997/grid-pattern-dark.png')] bg-repeat opacity-[0.03] pointer-events-none mix-blend-screen" style={{ backgroundSize: '40px 40px' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#09090b_70%)] pointer-events-none"></div>

        {/* Dynamic Aurora Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/30 via-transparent to-transparent opacity-70 pointer-events-none"></div>
        <motion.div 
          className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-[20%] left-[10%] w-[600px] h-[600px] bg-sky-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"
          animate={{ scale: [1, 1.1, 1], x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-md p-12">
          <div className="mb-12">
            <Logo width={150} height={24} href="/" forceTheme="dark" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-white glow-text">
            Start orchestrating your spaces <span className="gradient-text">today.</span>
          </h2>
          <p className="text-lg text-zinc-400 font-medium mb-12">
            Join hundreds of businesses delivering seamless waiting experiences to their customers.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-zinc-300 font-medium">14-day free trial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-zinc-300 font-medium">No credit card required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-10">
        <div className="w-full max-w-md glass-ui p-8 rounded-2xl relative">
          <div className="lg:hidden mb-8 flex justify-center">
             <Logo width={150} height={24} href="/" forceTheme="dark" />
          </div>
          
          {invitePreview && (
            <div className="mb-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-3 animate-in fade-in duration-300">
              <div className="w-9 h-9 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center font-black shrink-0">
                ★
              </div>
              <div className="text-left">
                <p className="text-xs text-sky-300 uppercase tracking-wider font-bold">Team Invitation Active</p>
                <p className="text-sm text-zinc-300">You are registering to join <strong className="text-white">{invitePreview.workspaceName}</strong> as <strong className="text-sky-400 uppercase">{invitePreview.role}</strong>.</p>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-2">
            {step === 'details' ? 'Create your account' : 'Verify your email'}
          </h1>
          <p className="text-zinc-400 mb-8 font-medium">
            {step === 'details' ? "Let's get you set up. It only takes a minute." : "We've sent a 6-digit code to your email. Enter it below to continue."}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-lg px-4 pl-10 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-lg px-4 pl-10 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-lg px-4 pl-10 pr-12 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 focus:ring-sky-500 accent-sky-500 cursor-pointer"
                  />
                  <div className="text-sm text-zinc-400">
                    I accept the{' '}
                    <button type="button" onClick={() => setModalType('terms')} className="text-sky-400 hover:underline">
                      Terms of Service
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 focus:ring-sky-500 accent-sky-500 cursor-pointer"
                  />
                  <div className="text-sm text-zinc-400">
                    I accept the{' '}
                    <button type="button" onClick={() => setModalType('privacy')} className="text-sky-400 hover:underline">
                      Privacy Policy
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !termsAccepted || !privacyAccepted}
                className="w-full h-11 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors shadow-[0_0_20px_rgba(2,132,199,0.3)] disabled:opacity-70 mt-8"
              >
                {loading ? 'Creating Account...' : 'Continue'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">6-Digit Code</label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 pl-10 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-center tracking-[0.5em] font-mono text-xl"
                    placeholder="000000"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || otp.length !== 6}
                className="w-full h-11 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors shadow-[0_0_20px_rgba(2,132,199,0.3)] disabled:opacity-70"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              {resendSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center">
                  {resendSuccess}
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <button 
                  type="button" 
                  disabled={resending}
                  onClick={handleResendOtp}
                  className="text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50 font-medium"
                >
                  {resending ? 'Sending...' : 'Resend OTP Code'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setStep('details'); setResendSuccess(''); }}
                  className="text-sm text-zinc-400 hover:text-white font-medium"
                >
                  Back to Details
                </button>
              </div>
            </form>
          )}

          {step === 'details' && (
            <>
              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#121214] text-zinc-500">Or sign up with</span>
                </div>
              </div>

              <div className="mt-8">
                <a 
                  href={`${getBackendUrl()}/auth/google?intent=signup`}
                  className="w-full h-11 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors font-medium text-zinc-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign up with Google
                </a>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:text-sky-400 hover:underline font-medium transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <TermsModal 
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || 'terms'}
        onAccept={() => {
          if (modalType === 'terms') setTermsAccepted(true);
          if (modalType === 'privacy') setPrivacyAccepted(true);
        }}
      />
    </div>
  );
}
