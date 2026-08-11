import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Smartphone, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  User,
  CalendarDays,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Geist, Geist_Mono } from "next/font/google";
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../lib/api';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Animation variants
const fadeInUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/public/plans')
      .then(res => setPlans(res || []))
      .catch(err => console.error('Failed to load plans', err));
  }, []);

  return (
    <div className={`min-h-screen bg-black text-zinc-50 ${geistSans.className} overflow-hidden`}>
      <Head>
        <title>Qmova | Intelligent Visit Management Platform</title>
        <meta name="description" content="Premium B2B SaaS Visit Lifecycle and People Management Platform" />
      </Head>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(99,102,241,0.5)] tracking-tighter">
              Q
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">Qmova</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Lifecycle</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                >
                  Dashboard
                </Link>
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
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
                    Start Free Trial
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] opacity-30 pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-zinc-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Visit-Centric Architecture Live
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Intelligent Operations.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Seamless Visits.
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            The premium people management platform that bridges physical locations with digital experiences. Unify walk-ins and appointments into one frictionless lifecycle.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-lg font-medium hover:scale-105 transition-transform"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white text-lg font-medium transition-colors backdrop-blur-sm"
            >
              View Admin Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-zinc-950 px-6 relative border-y border-white/5">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Complete Visit Lifecycle</h2>
            <p className="text-zinc-400">Three simple steps to manage your customers from arrival to departure.</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CalendarDays className="w-8 h-8 text-indigo-400" />,
                title: "1. Pre-Book or Walk-In",
                desc: "Customers seamlessly book an appointment online or walk in and scan a QR code. Both flow into a single, unified operations board."
              },
              {
                icon: <Smartphone className="w-8 h-8 text-purple-400" />,
                title: "2. Real-Time Tracking",
                desc: "Customers receive a digital status card tracking their visit, staff assignment, and dynamic wait-time ETAs."
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-pink-400" />,
                title: "3. Service Delivery",
                desc: "Staff are instantly notified when visitors arrive. Customers receive WhatsApp alerts the moment they are called."
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-colors group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-32 px-6">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Enterprise-Grade Operations.</h2>
            <p className="text-xl text-zinc-400 max-w-2xl">A complete suite designed to handle staff, locations, services, and visits with uncompromising security.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Feature 1 */}
            <motion.div variants={fadeInUp} className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <Zap className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Real-Time WebSockets</h3>
                  <p className="text-zinc-400">No more polling. Our backend utilizes high-performance WebSockets to instantly push state changes to admin dashboards and digital signage screens.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeInUp} className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <Clock className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Conflict-Free Scheduling</h3>
                  <p className="text-zinc-400">Strict guards ensure appointments never overlap, maximizing staff utilization.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeInUp} className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <ShieldCheck className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Strict Tenant Isolation</h3>
                  <p className="text-zinc-400">Repository-level security interceptors guarantee your data is completely isolated.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div variants={fadeInUp} className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <TrendingUp className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">AI-Powered Wait Times & Caching</h3>
                  <p className="text-zinc-400">Our engine calculates real-time throughput based on staff completion rates. Public endpoints are heavily cached via Redis for instant load times.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-zinc-950 relative border-t border-white/5">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Simple, transparent pricing</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">Scale your locations and staff effortlessly. Upgrade or downgrade at any time.</p>
            
            <div className="inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
              <button 
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingInterval === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingInterval === 'yearly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
              >
                Annually <span className="ml-1 text-emerald-400 text-xs font-bold">-10%</span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const price = billingInterval === 'yearly' && plan.billingInterval === 'monthly'
                ? Math.floor(plan.price * 12 * 0.9)
                : plan.price;
              
              const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');

              return (
                <motion.div 
                  key={plan.id} 
                  variants={fadeInUp}
                  whileHover={{ y: -10 }}
                  className={`rounded-3xl border ${isPopular ? 'border-indigo-500/50 bg-gradient-to-b from-indigo-900/20 to-black relative' : 'border-white/10 bg-black/50'} p-8 flex flex-col backdrop-blur-sm transition-all duration-300`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm mb-6 h-10">{plan.description}</p>
                  <div className="mb-8">
                    <span className="text-5xl font-black">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
                    <span className="text-zinc-500 ml-2">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                  
                  <Link 
                    href="/register" 
                    className={`w-full py-4 rounded-xl font-bold text-center transition-all mb-8 ${isPopular ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    {plan.price === 0 ? 'Start Free Trial' : 'Get Started'}
                  </Link>

                  <div className="space-y-4 flex-1">
                    <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">What's included:</p>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span className="text-zinc-300 text-sm">Up to {plan.limits?.maxLocations || (index + 1) * 2} Locations</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span className="text-zinc-300 text-sm">Up to {plan.limits?.maxDailyVisits || (index + 1) * 500} Daily Visits</span>
                    </div>
                    {plan.features?.whatsappNotifications && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">WhatsApp Notifications</span>
                      </div>
                    )}
                    {plan.features?.textToSpeech && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">Digital Signage Integration</span>
                      </div>
                    )}
                    {plan.features?.customBranding && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">Custom Branding & Logo</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            
            {plans.length === 0 && (
              <div className="col-span-3 text-center text-zinc-500 py-12">
                Loading pricing plans...
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/10"></div>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to elevate your customer experience?</h2>
          <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">Join modern businesses using Qmova to manage physical footfall with digital precision.</p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-lg font-medium hover:scale-105 transition-transform shadow-xl shadow-white/10"
          >
            Start your free trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs tracking-tighter">
              Q
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">Qmova</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/login" className="hover:text-white transition-colors">Admin Login</Link>
            <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          <p className="text-sm text-zinc-600">© 2026 Qmova Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
