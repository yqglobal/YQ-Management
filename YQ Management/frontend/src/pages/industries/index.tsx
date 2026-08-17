import Footer from "../../components/Footer";
import React, { useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion, useScroll, useTransform } from 'framer-motion';
import { QrCode, MonitorSmartphone, Bell, CheckCircle2, MessageSquare, ArrowRight, Activity, CalendarDays, MonitorPlay, Users } from 'lucide-react';

export default function IndustriesPage() {
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
        <title>Qmova | Industries</title>
        <meta name="description" content="Seamlessly merge scheduled appointments and spontaneous walk-ins into a single, autonomous queue—powered by native WhatsApp integration and algorithmic routing." />
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen"
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
            Tailored for <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Every Industry.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg md:text-xl"
          >
            Discover how Qmova's algorithmic queueing adapts to the unique needs of Healthcare, Retail, Government, and Logistics.
          </motion.p>
        </motion.div>
      </section>

      {/* Industries Grid */}
      <section className="py-32 px-gutter relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-32">
          
          {/* Healthcare */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
                <span className="material-symbols-outlined text-2xl">local_hospital</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-headline-md font-bold text-white">Healthcare & Clinics</h2>
              <p className="font-body-md text-zinc-400 leading-relaxed text-lg">
                Prioritize urgent care walk-ins without destroying your scheduled appointments. Keep sick patients out of crowded waiting rooms with personalized status pages and "wait in car" workflows.
              </p>
              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 pt-4">
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Wait-in-car notifications</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">HIPAA-compliant data handling</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Multi-doctor dynamic routing</span>
                </motion.li>
              </motion.ul>
            </div>
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-rose-500/20 blur-[100px] rounded-full"></div>
               <div className="h-80 w-full glass-ui rounded-3xl border border-white/10 relative z-10 p-8 flex flex-col justify-center bg-black/50">
                  <div className="bg-rose-900/20 border border-rose-500/20 rounded-xl p-4 mb-4">
                    <span className="text-rose-400 text-xs font-bold block mb-2">URGENT WALK-IN DETECTED</span>
                    <div className="text-white font-medium">Re-routing scheduled gaps...</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <span className="text-zinc-400 text-xs block mb-2">SCHEDULE</span>
                    <div className="text-white font-medium">Dr. Smith - Available in 4m</div>
                  </div>
               </div>
            </div>
          </div>

          {/* Retail */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-headline-md font-bold text-white">Retail & Services</h2>
              <p className="font-body-md text-zinc-400 leading-relaxed text-lg">
                Turn waiting time into shopping time. Let customers join the queue via QR code and browse the store while waiting for a fitting room, customer service, or checkout.
              </p>
              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 pt-4">
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">QR code quick-join</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Lobby TV displays for the sales floor</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Brand-forward booking pages</span>
                </motion.li>
              </motion.ul>
            </div>
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full"></div>
               <div className="h-80 w-full glass-ui rounded-3xl border border-white/10 relative z-10 p-8 flex flex-col justify-center items-center bg-black/50">
                  <div className="w-40 h-40 bg-white p-4 rounded-2xl shadow-2xl rotate-[-5deg]">
                    <QrCode className="w-full h-full text-black" strokeWidth={1} />
                  </div>
                  <div className="mt-6 bg-amber-500 text-black px-4 py-2 rounded-full font-bold text-sm">Scan to join Fitting Room Queue</div>
               </div>
            </div>
          </div>

          {/* Government */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-headline-md font-bold text-white">Government & Public Sector</h2>
              <p className="font-body-md text-zinc-400 leading-relaxed text-lg">
                Manage massive crowds with dignity. Implement AI-driven voice announcements and smart TV displays to keep citizens informed in large, chaotic waiting areas.
              </p>
              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 pt-4">
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Automated multi-lingual announcements</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Multi-desk routing (e.g. DMV)</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Accessibility-first status pages</span>
                </motion.li>
              </motion.ul>
            </div>
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
               <div className="h-80 w-full glass-ui rounded-3xl border border-white/10 relative z-10 p-8 flex flex-col justify-center bg-black/50">
                  <div className="bg-black border-2 border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-blue-900/50 p-3 border-b border-blue-500/30">
                      <span className="text-white font-bold text-xl">DMV Queue</span>
                    </div>
                    <div className="p-4 flex justify-between items-center bg-black">
                      <span className="text-4xl font-mono text-white font-bold">B-205</span>
                      <div className="text-right">
                        <span className="text-xs text-zinc-400 block">DESK</span>
                        <span className="text-2xl text-blue-400 font-bold">04</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-headline-md font-bold text-white">Logistics & Warehousing</h2>
              <p className="font-body-md text-zinc-400 leading-relaxed text-lg">
                Coordinate dock doors and delivery schedules. Drivers join the queue upon arrival and receive a WhatsApp message when their specific bay is ready.
              </p>
              <motion.ul variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="space-y-4 pt-4">
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">WhatsApp native ticketing for drivers</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Bay-specific routing</span>
                </motion.li>
                <motion.li variants={itemVariants} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-body-sm text-zinc-300">Real-time delay tracking</span>
                </motion.li>
              </motion.ul>
            </div>
            <div className="flex-1 w-full relative">
               <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full"></div>
               <div className="h-80 w-full glass-ui rounded-3xl border border-white/10 relative z-10 p-8 flex flex-col justify-center bg-black/50">
                  <div className="bg-[#1f2c34] p-4 rounded-xl border border-emerald-500/30 ml-auto w-64 shadow-xl">
                    <span className="text-white text-sm font-medium">Please proceed to Dock 12.</span>
                    <span className="text-zinc-500 text-[10px] block text-right mt-2">WhatsApp 10:45 AM</span>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
