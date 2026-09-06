import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Mail, CheckCircle2, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { fetchApi } from '../../lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    setSuccessMsg('');
    try {
      await fetchApi('/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset' }),
      });
      setSuccessMsg('A new verification code has been sent to your email.');
    } catch (err: AnyFixMe) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setStep('otp');
    } catch (err: AnyFixMe) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // Move to password step locally; actual verification happens when submitting new password
    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, password })
      });
      setSuccessMsg('Password reset successfully. Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: AnyFixMe) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Head>
        <title>Forgot Password | Qmova</title>
      </Head>

      {/* Left Panel - Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-zinc-950 items-center justify-center border-r border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 max-w-md p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)] mb-8 mx-auto">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-6 leading-tight">
            Regain access.
          </h2>
          <p className="text-lg text-zinc-400">
            Securely reset your password and get back to managing your queues.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)] mb-8 mx-auto">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-zinc-400 mb-8">
            {step === 'email' && "Enter your email address to receive a 6-digit verification code."}
            {step === 'otp' && "We've sent a 6-digit code to your email. Enter it below."}
            {step === 'password' && "Create a new, strong password for your account."}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex flex-col gap-2">
              <p>{error}</p>
              {error.includes('No account found') && (
                <Link href="/register" className="text-indigo-400 font-medium hover:underline inline-block">
                  Create a new account instead?
                </Link>
              )}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {successMsg}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleRequestReset} className="space-y-5 animate-in fade-in duration-500">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-colors mt-8 disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {step === 'otp' && (
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
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center tracking-[0.5em] font-mono text-xl"
                    placeholder="000000"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-between mt-4">
                <button 
                  type="button" 
                  disabled={resending}
                  onClick={handleResendOtp}
                  className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 font-medium"
                >
                  {resending ? 'Sending...' : 'Resend OTP Code'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setStep('email'); setSuccessMsg(''); }}
                  className="text-sm text-zinc-400 hover:text-white font-medium"
                >
                  Change Email
                </button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || password.length < 8}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-70 mt-8"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
              <button 
                type="button" 
                onClick={() => setStep('otp')}
                className="w-full text-zinc-400 hover:text-white text-sm transition-colors mt-2"
              >
                Back to OTP
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-sm text-zinc-400">
            Remember your password?{' '}
            <Link href="/login" className="text-white hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
