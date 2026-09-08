import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Home, HelpCircle } from 'lucide-react';

export default function Custom404() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Page Not Found | Qmova</title>
      </Head>

      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center relative overflow-hidden text-white font-sans">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center px-4 max-w-2xl text-center">
          {/* Glowing 404 text */}
          <div className="relative mb-8">
            <h1 className="text-[150px] md:text-[200px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-600 opacity-90">
              404
            </h1>
            <div className="absolute inset-0 blur-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 opacity-20 -z-10 animate-pulse"></div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Lost in the digital ether
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            The page you're looking for seems to have vanished. Let's get you back to familiar territory.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button 
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            
            <Link 
              href="/dashboard/service-desk" 
              className="flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 font-semibold"
            >
              <Home className="w-5 h-5" />
              Service Desk
            </Link>
          </div>
          
          <div className="mt-16 text-zinc-500 flex items-center justify-center gap-2 text-sm">
            <HelpCircle className="w-4 h-4" />
            <span>Need help? <Link href="/support" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Contact Support</Link></span>
          </div>
        </div>
      </div>
    </>
  );
}
