import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../lib/api';
import { Building2, Users, Loader2, ArrowRight, Check, AlertCircle, Mail, MessageSquare } from 'lucide-react';
import { useShareInvite } from '../hooks/useShareInvite';
import { Logo } from '../components/Logo';

type JoinStatus = 'loading' | 'ready' | 'joining' | 'success' | 'error';

export default function JoinPage() {
  const router = useRouter();
  const { user, loading: authLoading, refetch } = useAuth();
  const [status, setStatus] = useState<JoinStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');

  useEffect(() => {
    const code = (router.query.code || router.query.inviteCode) as string;
    if (code) {
      const trimmed = code.trim().toUpperCase();
      setInviteCode(trimmed);
      localStorage.setItem('qmova_invite_code', trimmed);
      document.cookie = `qmova_invite_code=${trimmed}; path=/; max-age=86400; SameSite=Lax`;
    }
  }, [router.query]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus('ready');
      return;
    }

    if (user.workspaceId && !inviteCode) {
      router.replace('/dashboard');
      return;
    }

    if (inviteCode) {
      handleJoin();
    } else {
      setStatus('ready');
    }
  }, [user, authLoading, inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode) return;
    setStatus('joining');
    setError(null);

    try {
      const res = await fetchApi('/workspace/join', {
        method: 'POST',
        body: JSON.stringify({ code: inviteCode }),
      });
      setWorkspaceName(res.workspace?.name || 'the workspace');
      setStatus('success');
      localStorage.removeItem('qmova_invite_code');
      document.cookie = 'qmova_invite_code=; path=/; max-age=0; SameSite=Lax';
      await refetch();
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Invalid or expired invitation code');
    }
  };

  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative">
        <div className="noise-overlay"></div>
        <Loader2 className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin z-10" />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative">
        <div className="noise-overlay"></div>
        <div className="text-center z-10 glass-ui p-12 rounded-2xl relative">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to {workspaceName}!</h1>
          <p className="text-zinc-400 font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <Head><title>Join Workspace | Qmova</title></Head>
        <div className="noise-overlay"></div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-blob"></div>

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-8">
              <Logo width={150} height={24} href="/" forceTheme="dark" />
            </div>
            <h1 className="text-3xl font-bold mb-3 glow-text">Join Workspace</h1>
            <p className="text-zinc-400 font-medium">Sign in or create an account to join</p>
          </div>
          <div className="glass-ui rounded-2xl p-8 relative">
            <p className="text-sm text-zinc-400 mb-6 text-center font-medium">You need an account to join this workspace.</p>
            <div className="space-y-4">
              <button onClick={() => router.push(`/login?inviteCode=${inviteCode}`)} className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors shadow-[0_0_20px_rgba(2,132,199,0.3)]">
                Sign In
              </button>
              <button onClick={() => router.push(`/register?inviteCode=${inviteCode}`)} className="w-full h-11 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors">
                Create Account
              </button>
            </div>
            {inviteCode && (
              <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Invitation Code</p>
                <p className="font-mono font-bold text-sky-400 text-lg tracking-widest">{inviteCode}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      <Head><title>Join Workspace | Qmova</title></Head>
      <div className="noise-overlay"></div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-600 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-blob"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-8">
            <Logo width={150} height={24} href="/" forceTheme="dark" />
          </div>
          <h1 className="text-3xl font-bold mb-3 glow-text">Join Workspace</h1>
          <p className="text-zinc-400 font-medium">Enter the invitation code to join</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">{error}</p>
              <button 
                onClick={handleJoin}
                disabled={status === 'joining'}
                className="mt-3 text-sm font-medium underline hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="glass-ui rounded-2xl p-8 relative">
          <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Invitation Code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono tracking-wider text-center text-lg"
                placeholder="ABC123XY"
                maxLength={12}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'joining' || !inviteCode}
              className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition-colors shadow-[0_0_20px_rgba(2,132,199,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'joining' && <Loader2 className="w-5 h-5 animate-spin" />}
              {status === 'joining' ? 'Joining...' : 'Join Workspace'}
              {status !== 'joining' && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}