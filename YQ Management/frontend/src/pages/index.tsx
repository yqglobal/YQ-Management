import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MarketingLayout from '../components/MarketingLayout';
import { 
  ArrowRight, 
  Smartphone, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  User,
  CalendarDays,
  ShieldCheck,
  Zap,
  Building2,
  Stethoscope,
  ShoppingBag,
  Tv
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { fetchApi } from '../lib/api';

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
    <MarketingLayout title="Qmova | Manage Queues & Appointments Effortlessly">

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 overflow-hidden">
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
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-zinc-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Elevate Your Customer Experience
          </motion.div>
          
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-white">
            Say Goodbye to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Crowded Waiting Rooms.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Manage walk-ins and appointments in one place. Keep your customers updated via WhatsApp, organize your staff, and deliver a premium experience from arrival to departure.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-full bg-white text-black text-lg font-medium hover:scale-105 transition-transform"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/book-demo" 
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white text-lg font-medium transition-colors backdrop-blur-sm"
            >
              Book a Demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Target Audience Section */}
      <section className="py-16 px-6 relative border-t border-white/5 bg-black/40">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Built for modern businesses</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={fadeInUp} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <Stethoscope className="w-10 h-10 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Clinics & Healthcare</h3>
              <p className="text-zinc-400 text-sm">Respect patient privacy and reduce waiting room anxiety with private digital queues.</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <ShoppingBag className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Retail & Salons</h3>
              <p className="text-zinc-400 text-sm">Let customers shop around or relax instead of standing in frustrating lines.</p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              <Building2 className="w-10 h-10 text-pink-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Offices & Government</h3>
              <p className="text-zinc-400 text-sm">Streamline front-desk operations, reduce complaints, and serve visitors efficiently.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* The Customer Journey */}
      <section id="how-it-works" className="py-24 bg-zinc-950 px-6 relative border-y border-white/5">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">The Perfect Customer Journey</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Three simple steps to give your customers the modern, stress-free experience they expect.</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <CalendarDays className="w-8 h-8 text-indigo-400" />,
                title: "1. Join the Queue",
                desc: "Customers easily book ahead online or scan a QR code at your door to join a virtual queue—no physical waiting required."
              },
              {
                icon: <Smartphone className="w-8 h-8 text-purple-400" />,
                title: "2. Real-Time Updates",
                desc: "Customers can relax anywhere. They receive a live digital ticket and WhatsApp notifications letting them know exactly when it's their turn."
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-pink-400" />,
                title: "3. Smooth Service",
                desc: "Your staff calls the next customer with a single click. The customer walks right in, resulting in zero friction and a five-star experience."
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
                <h3 className="text-xl font-semibold mb-3 text-white">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Why Businesses Choose Qmova */}
      <section id="features" className="py-32 px-6">
        <motion.div 
          className="max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">Why Businesses Choose Qmova.</h2>
            <p className="text-xl text-zinc-400 max-w-2xl">A complete, easy-to-use platform designed to handle your staff, locations, services, and visits so you can focus on growing your business.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Feature 1 */}
            <motion.div variants={fadeInUp} className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <Tv className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Live TV & Digital Signage</h3>
                  <p className="text-zinc-400">Turn any smart TV or tablet into a beautiful, real-time waiting list that calls out names and guides customers to the right counter instantly.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeInUp} className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <User className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Smart Staff Organization</h3>
                  <p className="text-zinc-400">Automatically route customers to the right staff member based on the service they need, preventing bottlenecks.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeInUp} className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <ShieldCheck className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Enterprise-Grade Privacy</h3>
                  <p className="text-zinc-400">Your customer data is strictly isolated and protected, ensuring full compliance with privacy laws like POPIA and GDPR.</p>
                </div>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div variants={fadeInUp} className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <Clock className="w-10 h-10 text-zinc-300" />
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Accurate Wait Time Estimates</h3>
                  <p className="text-zinc-400">Give your customers the gift of time. Our system calculates live estimated wait times so your visitors know exactly how long they have.</p>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">Simple, transparent pricing</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">Scale your locations and staff effortlessly. Upgrade or downgrade at any time as your business grows.</p>
            
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
                  <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                  <p className="text-zinc-400 text-sm mb-6 h-10">{plan.description}</p>
                  <div className="mb-8">
                    <span className="text-5xl font-black text-white">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
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
                      <span className="text-zinc-300 text-sm">Up to {plan.limits?.maxLocations || (index + 1) * 2} Physical Locations</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span className="text-zinc-300 text-sm">Up to {plan.limits?.maxDailyVisits || (index + 1) * 500} Customers per day</span>
                    </div>
                    {plan.features?.whatsappNotifications && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">Automated WhatsApp Alerts</span>
                      </div>
                    )}
                    {plan.features?.textToSpeech && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">TV Display & Voice Calling</span>
                      </div>
                    )}
                    {plan.features?.customBranding && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                        <span className="text-zinc-300 text-sm">Add your own Business Logo</span>
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
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Ready to elevate your customer experience?</h2>
          <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">Join modern businesses using Qmova to manage physical footfall with digital precision and delight their customers.</p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-lg font-medium hover:scale-105 transition-transform shadow-xl shadow-white/10"
          >
            Start your free trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

    </MarketingLayout>
  );
}
