import Footer from "../../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
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
          <Logo width={180} height={28} href="/" forceTheme="dark" />
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
          
          {/* Starter Tier */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#0f1219] border border-white/10 rounded-3xl p-8 flex flex-col h-full"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
            <p className="text-sm text-zinc-400 mb-6">Perfect for small clinics and independent retailers.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">$49</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <Link href="/register" className="w-full block py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-center transition-colors mb-8">
              Start Free Trial
            </Link>
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-4">What's included:</p>
              <ul className="space-y-4">
                {[
                  'Up to 500 visits per month',
                  '1 Location',
                  'Basic algorithmic routing',
                  'Standard status pages',
                  'Email support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Professional Tier (Highlighted) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-[#151b2b] border-2 border-sky-500 rounded-3xl p-8 flex flex-col h-full relative transform md:-translate-y-4 shadow-2xl shadow-sky-900/20"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Professional</h3>
            <p className="text-sm text-sky-200/70 mb-6">For growing businesses needing advanced capabilities.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">$149</span>
              <span className="text-sky-200/50">/month</span>
            </div>
            <Link href="/register" className="w-full block py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-center transition-colors mb-8 shadow-lg shadow-sky-500/25">
              Start Free Trial
            </Link>
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-4">Everything in Starter, plus:</p>
              <ul className="space-y-4">
                {[
                  'Unlimited visits',
                  'Up to 5 Locations',
                  'WhatsApp native ticketing',
                  'AI Voice Announcements',
                  'Custom branding',
                  'Priority support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span className="text-sm text-zinc-200">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Enterprise Tier */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-[#0f1219] border border-white/10 rounded-3xl p-8 flex flex-col h-full"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
            <p className="text-sm text-zinc-400 mb-6">Custom solutions for large-scale operations.</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">Custom</span>
            </div>
            <Link href="/register" className="w-full block py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-center transition-colors mb-8">
              Contact Sales
            </Link>
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-4">Everything in Pro, plus:</p>
              <ul className="space-y-4">
                {[
                  'Unlimited Locations',
                  'Dedicated account manager',
                  'Custom API integrations',
                  'SLA guarantees',
                  'On-premise deployment options',
                  '24/7 phone support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

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
