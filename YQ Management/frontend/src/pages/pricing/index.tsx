import Footer from "../../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { GetServerSideProps } from 'next';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: {
    whatsappNotifications?: boolean;
    whatsappChat?: boolean;
    whatsappChatbot?: boolean;
  };
  limits: {
    maxQueues?: number;
    maxTokens?: number;
  };
}

interface PricingProps {
  plans: Plan[];
}

export default function PricingPage({ plans }: PricingProps) {
  const { user } = useAuth();
  
  return (
    <div className="dark bg-[#09090b] min-h-screen font-body-md text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova | Pricing</title>
        <meta name="description" content="Transparent pricing for the ultimate waiting room management platform." />
        <style dangerouslySetInnerHTML={{__html: `body { background-color: #09090b !important; }`}} />
      </Head>
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-ui h-header-h flex items-center justify-between px-gutter border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="flex items-center gap-2">
          <Logo width={140} height={22} href="/" forceTheme="dark" />
        </div>
        <div className="hidden md:flex gap-8 font-body-sm text-zinc-400 font-medium tracking-wide">
          <Link className="hover:text-white transition-colors" href="/features">Features</Link>
          <Link className="hover:text-white transition-colors" href="/pricing">Pricing</Link>
          <Link className="hover:text-white transition-colors" href="/about">About Us</Link>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          {user ? (
            <Link href="/dashboard" className="bg-white text-black font-body-sm font-semibold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-zinc-400 font-body-sm font-semibold hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="bg-white text-black font-body-sm font-semibold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-gutter overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen" />
        
        <div className="max-w-4xl mx-auto text-center z-10 space-y-6 flex flex-col items-center relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-headline-lg font-extrabold tracking-tight text-white drop-shadow-2xl"
          >
            Simple, Transparent Pricing
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg"
          >
            Start for free, upgrade when you need to. No hidden fees or surprise charges.
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-32 px-gutter relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const isPopular = plan.name.toLowerCase().includes('standard');
            return (
              <motion.div 
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
                className={`bg-[#0f1219] border ${isPopular ? 'border-sky-500 shadow-2xl shadow-sky-900/20 md:-translate-y-4' : 'border-white/10'} rounded-3xl p-8 flex flex-col h-full relative`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-400 mb-6">{plan.description || "Everything you need to get started."}</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">
                    {plan.price === 0 ? "Free" : `${plan.currency === 'ZAR' ? 'R' : '$'}${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-zinc-500">/{plan.interval || 'month'}</span>}
                </div>
                <Link href="/register" className={`w-full block py-3 px-6 rounded-xl ${isPopular ? 'bg-sky-500 hover:bg-sky-400 font-bold shadow-lg shadow-sky-500/25' : 'bg-white/10 hover:bg-white/20 font-medium'} text-white text-center transition-colors mb-8`}>
                  Start Free Trial
                </Link>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-4">What's included:</p>
                  <ul className="space-y-4">
                    {/* Render Limits */}
                    {Object.entries(plan.limits || {}).map(([key, value]) => {
                      if (!value) return null;
                      
                      let label = '';
                      if (key === 'maxTokens') label = `Up to ${value} visits per month`;
                      else if (key === 'maxQueues') label = `Up to ${value} Queues`;
                      else if (key === 'maxLocations') label = `Up to ${value} Locations`;
                      else if (key === 'maxStaff') label = `Up to ${value} Staff Members`;
                      else label = `${key}: ${value}`;

                      return (
                        <li key={key} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                          <span className="text-sm text-zinc-300">{label}</span>
                        </li>
                      );
                    })}

                    {/* Render Features */}
                    {Object.entries(plan.features || {}).map(([key, value]) => {
                      if (!value) return null;

                      const featureNames: Record<string, string> = {
                        textToSpeech: 'AI Voice Announcements',
                        whatsappNotifications: 'WhatsApp Notifications',
                        customBranding: 'Custom Branding',
                        apiAccess: 'API Access',
                        multiLocation: 'Multi-Location Support',
                        advancedAnalytics: 'Advanced Analytics',
                        appointmentsModule: 'Appointments Module',
                        whatsappChat: 'WhatsApp Live Chat',
                        whatsappChatbot: 'Automated WhatsApp Chatbot'
                      };

                      const label = featureNames[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                      return (
                        <li key={key} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                          <span className="text-sm text-zinc-300">{label}</span>
                        </li>
                      );
                    })}
                    
                    {/* Default Features */}
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                      <span className="text-sm text-zinc-300">Standard Status Pages</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 px-gutter border-t border-white/5 relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: 'Can I change my plan later?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate any differences.' },
              { q: 'Are there any setup fees?', a: 'No, there are no hidden setup fees. You only pay the flat monthly rate for the plan you choose.' },
              { q: 'Do you offer annual discounts?', a: 'Yes! If you choose to be billed annually, you will receive a 20% discount on all plans.' },
              { q: 'What happens if I exceed my visit limit on Starter?', a: 'We will notify you when you reach 80% and 100% of your limit. Your queues will continue to function, but we will ask you to upgrade to Professional for the next billing cycle.' }
            ].map((faq, i) => (
              <div key={i} className="bg-[#0f1219] border border-white/5 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-2">{faq.q}</h4>
                <p className="text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let plans: Plan[] = [];
  
  try {
    const res = await fetch(`${baseUrl}/public/plans`);
    if (res.ok) {
      plans = await res.json();
      
      // Sort plans by price
      plans.sort((a, b) => a.price - b.price);
    }
  } catch (error) {
    console.error('Failed to fetch public plans:', error);
  }

  // Fallback plans if backend fails
  if (plans.length === 0) {
    plans = [
      {
        id: '1', name: 'Starter (14 Days Trial)', description: 'Perfect for small retail or single service point environments.',
        price: 0, currency: 'ZAR', interval: 'monthly',
        features: { whatsappNotifications: false, whatsappChat: false, whatsappChatbot: false },
        limits: { maxQueues: 1, maxTokens: 100 }
      },
      {
        id: '2', name: 'Standard Plan', description: 'Ideal for busy clinics, restaurants, and customer service centers.',
        price: 499, currency: 'ZAR', interval: 'monthly',
        features: { whatsappNotifications: true, whatsappChat: true, whatsappChatbot: true },
        limits: { maxQueues: 5, maxTokens: 1000 }
      },
      {
        id: '3', name: 'Premium Plan', description: 'Comprehensive solution for healthcare networks and large retail chains.',
        price: 1499, currency: 'ZAR', interval: 'monthly',
        features: { whatsappNotifications: true, whatsappChat: true, whatsappChatbot: true },
        limits: { maxQueues: 20, maxTokens: 10000 }
      }
    ];
  }

  return {
    props: {
      plans,
    },
  };
};
