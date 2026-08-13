import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { User, Menu, X } from 'lucide-react';
import Footer from './Footer';
import SEO from './SEO';
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface MarketingLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function MarketingLayout({ children, title, description }: MarketingLayoutProps) {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className={`min-h-screen bg-black text-zinc-50 ${geistSans.className} font-sans flex flex-col`}>
      <SEO title={title} description={description} />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(99,102,241,0.5)] tracking-tighter">
                Q
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">Qmova</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/industries" className="hover:text-white transition-colors">Industries</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {!loading && user ? (
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                >
                  Dashboard
                </Link>
                <Link href="/dashboard/settings" className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                  <User className="w-5 h-5 text-zinc-400" />
                </Link>
              </div>
            ) : (
              !loading && (
                <>
                  <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
                    Log in
                  </Link>
                  <Link 
                    href="/register" 
                    className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )
            )}
          </div>
          
          <button 
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-zinc-900 border-b border-white/10 p-6 flex flex-col gap-4 shadow-xl">
            <Link href="/features" className="text-zinc-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="/industries" className="text-zinc-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Industries</Link>
            <Link href="/pricing" className="text-zinc-300 font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/about" className="text-zinc-300 font-medium" onClick={() => setMobileMenuOpen(false)}>About</Link>
            <hr className="border-white/10 my-2" />
            {!loading && user ? (
              <Link href="/dashboard" className="text-indigo-400 font-medium" onClick={() => setMobileMenuOpen(false)}>Go to Dashboard</Link>
            ) : (
              !loading && (
                <div className="flex flex-col gap-3 mt-2">
                  <Link href="/login" className="text-center py-3 rounded-lg border border-white/20 text-zinc-300 font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/register" className="text-center py-3 rounded-lg bg-indigo-600 text-white font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </div>
              )
            )}
          </div>
        )}
      </nav>

      <main className="flex-1 mt-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}
