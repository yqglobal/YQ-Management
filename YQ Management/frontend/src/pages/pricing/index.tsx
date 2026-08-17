import Footer from "../../components/Footer";
import React, { useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const { user } = useAuth();
  
  // Parallax scroll effects
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityFade = useTransform(scrollY, [0, 300], [1, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

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
          <Link className="hover:text-white transition-colors" href="/industries">Industries</Link>
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
      <section className="relative min-h-[500px] flex flex-col items-center justify-center pt-32 px-gutter overflow-hidden">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />

        <motion.div 
          style={{ y: heroY, opacity: opacityFade }}
          className="max-w-4xl mx-auto text-center z-10 space-y-8 flex flex-col items-center"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-[64px] font-headline-lg font-extrabold tracking-[-0.04em] leading-[1.1] text-white relative z-10 drop-shadow-2xl"
          >
            Transparent <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Pricing.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg md:text-xl"
          >
            Choose the plan that fits your business. No hidden fees. Start transforming your waiting room today.
          </motion.p>
        </motion.div>
      </section>

      {/* Pricing Grid */}
      <section className="py-20 px-gutter relative overflow-hidden">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          
          {/* Standard Plan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-[1px] rounded-[2rem] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
            <div className="relative h-full bg-[#0a0a0a] rounded-[2rem] p-10 flex flex-col border border-white/5 group-hover:border-white/10 transition-colors">
              <div className="mb-8">
                <span className="text-zinc-400 font-label-caps text-xs tracking-widest font-bold">STANDARD</span>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-headline-md font-bold text-white">$49</span>
                  <span className="text-zinc-500 font-body-sm pb-1">/ month</span>
                </div>
                <p className="mt-4 text-zinc-400 font-body-sm">
                  Perfect for single-location clinics, salons, and retail stores looking to eliminate physical lines.
                </p>
              </div>

              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 flex-1 mb-8">
                {[
                  "Smart Walk-in Injection",
                  "Personalized Status Pages",
                  "QR Code Quick Join",
                  "Up to 500 visitors/month",
                  "Standard Email Support",
                ].map((feature, i) => (
                  <motion.li key={i} variants={itemVariants} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 font-body-sm">{feature}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <Link href="/register?plan=standard" className="w-full h-12 rounded-xl border border-white/10 text-white font-body-sm font-semibold flex items-center justify-center hover:bg-white/5 transition-colors">
                Start Standard Trial
              </Link>
            </div>
          </motion.div>

          {/* Premium Plan */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative p-[1px] rounded-[2rem] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-sky-500 to-sky-900/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="relative h-full bg-[#0a0a0a] rounded-[2rem] p-10 flex flex-col border border-white/5 shadow-[0_0_40px_rgba(2,132,199,0.15)]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400"></div>
              
              <div className="mb-8">
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full font-label-caps text-[10px] tracking-widest font-bold inline-block mb-4">RECOMMENDED</span>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-headline-md font-bold text-white">$149</span>
                  <span className="text-zinc-500 font-body-sm pb-1">/ month</span>
                </div>
                <p className="mt-4 text-zinc-400 font-body-sm">
                  Advanced features for multi-location enterprises, hospitals, and high-volume environments.
                </p>
              </div>

              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 flex-1 mb-8">
                {[
                  "Everything in Standard",
                  "WhatsApp Native Chatbot",
                  "AI Voice Announcements (TV)",
                  "Personalized Booking Pages",
                  "Unlimited Visitors",
                  "Multi-Queue Routing",
                  "24/7 Priority Support",
                ].map((feature, i) => (
                  <motion.li key={i} variants={itemVariants} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />
                    <span className="text-white font-body-sm font-medium">{feature}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <Link href="/register?plan=premium" className="w-full h-12 rounded-xl bg-sky-600 text-white font-body-sm font-semibold flex items-center justify-center hover:bg-sky-500 transition-colors shadow-[0_0_20px_rgba(2,132,199,0.3)]">
                Start Premium Trial
              </Link>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
