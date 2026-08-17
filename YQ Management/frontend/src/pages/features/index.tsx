import Footer from "../components/Footer";
import React, { useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { Logo } from '../components/Logo';
import { motion, useScroll, useTransform } from 'framer-motion';
import { QrCode, MonitorSmartphone, Bell, CheckCircle2, MessageSquare, ArrowRight, Activity, CalendarDays, MonitorPlay, Users } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  
  // Parallax scroll effects
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -50]);
  const opacityFade = useTransform(scrollY, [300, 700], [1, 0]);

  return (
    <div className="dark bg-[#09090b] min-h-screen font-body-md text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova | The End of the Waiting Room</title>
        <meta name="description" content="Seamlessly merge scheduled appointments and spontaneous walk-ins into a single, autonomous queue—powered by native WhatsApp integration and algorithmic routing." />
        <style dangerouslySetInnerHTML={{__html: `body { background-color: #09090b !important; }`}} />
      </Head>
      
      {/* <div className="noise-overlay pointer-events-none z-50"></div> */}

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

      {/* Features Hero Section */}
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
            Powerful Features for a <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Seamless Experience.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg md:text-xl"
          >
            Explore the tools and capabilities that make Qmova the most advanced waiting room management platform.
          </motion.p>
        </motion.div>
      </section>

      {/* Core Platform Features */}
      <section className="py-32 px-gutter relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-20 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-headline-lg font-extrabold tracking-[-0.04em] mb-6 text-white">Core Platform Features</h2>
            <p className="font-body-lg text-zinc-400 text-lg md:text-xl">
              We discarded the traditional list-based queue for a dynamic, algorithmic model designed to handle real-world chaos seamlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Feature 1: Smart Appointments & Visit Management */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 relative group overflow-hidden rounded-[2rem] bg-[#0f1219] border border-white/5 hover:border-sky-500/30 transition-all p-10 min-h-[400px] flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -mr-40 -mt-40 transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"></div>
              
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mb-6 text-sky-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-headline-sm font-bold text-white mb-4">Smart Appointments & Visit Management</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Automatically fits walk-in customers into schedule gaps without delaying booked appointments. Our engine calculates micro-gaps to maintain flow.
                </p>
              </div>

              {/* Visualization */}
              <div className="mt-12 relative w-full h-32 flex items-center gap-2 z-10">
                <div className="h-16 w-[30%] bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 mr-2"></div>
                  <span className="font-data-mono text-[11px] text-zinc-400 uppercase">Appt 09:00</span>
                </div>
                
                {/* Expanding injection block */}
                <div className="h-24 flex-1 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl flex flex-col justify-center items-center relative overflow-hidden group-hover:bg-emerald-500/20 transition-all shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-gradient"></div>
                  <span className="font-label-caps text-emerald-400 text-[10px] tracking-wider mb-1">WALK-IN INJECTED</span>
                  <span className="font-data-mono font-bold text-white text-sm">Gap: +12m</span>
                </div>

                <div className="h-16 w-[30%] bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 mr-2"></div>
                  <span className="font-data-mono text-[11px] text-zinc-400 uppercase">Appt 09:30</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Personalized appointment booking page */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="relative group overflow-hidden rounded-[2rem] bg-[#0f1219] border border-white/5 hover:border-purple-500/30 transition-all p-10 min-h-[400px] flex flex-col"
            >
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] -ml-20 -mb-20 transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"></div>
              
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-headline-sm font-bold text-white mb-4">Personalized Booking Page</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Brand-forward booking experiences. Let customers schedule their visits on a page that feels entirely yours, with custom logos and colors.
                </p>
              </div>

              {/* Visualization */}
              <div className="mt-8 relative h-32 flex justify-center items-center z-10">
                <div className="w-48 h-32 bg-zinc-900 border border-white/10 rounded-t-xl overflow-hidden shadow-2xl flex flex-col items-center pt-4 transform transition-transform group-hover:-translate-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 mb-2 border border-purple-500/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-400">domain</span>
                  </div>
                  <div className="h-2 w-24 bg-white/20 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-purple-500/20 rounded border border-purple-500/30 flex items-center justify-center"><span className="text-[10px] text-purple-300">9:00</span></div>
                    <div className="h-8 w-16 bg-white/5 rounded border border-white/10 flex items-center justify-center"><span className="text-[10px] text-zinc-400">9:30</span></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: WhatsApp Chatbot */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.3 }}
              className="relative group overflow-hidden rounded-[2rem] bg-[#0f1219] border border-white/5 hover:border-emerald-500/30 transition-all p-10 min-h-[400px] flex flex-col"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"></div>
              
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-headline-sm font-bold text-white mb-4">WhatsApp Chatbot & Notifications</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Native WhatsApp integration. No apps to download. Customers join queues, receive live updates, and interact via the app they already use.
                </p>
              </div>

              {/* Visualization */}
              <div className="mt-8 relative h-32 flex justify-center items-center z-10 perspective-1000">
                <motion.div 
                  whileHover={{ rotateY: 15, rotateX: 10, scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-48 bg-[#0b141a] border border-white/10 rounded-2xl p-3 shadow-[0_20px_40px_rgba(16,185,129,0.2)] preserve-3d flex flex-col gap-2"
                >
                  <div className="bg-[#202c33] p-2 rounded-lg rounded-tl-none border border-emerald-500/20">
                    <span className="text-[10px] text-white">Reply with 1 to join queue for Consultations.</span>
                  </div>
                  <div className="bg-emerald-600/40 p-2 rounded-lg rounded-tr-none border border-emerald-500/30 self-end">
                    <span className="text-[10px] text-white">1</span>
                  </div>
                  <div className="bg-[#202c33] p-2 rounded-lg rounded-tl-none border border-emerald-500/20">
                    <span className="text-[10px] text-white">You are in the queue. Ticket A-104.</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature 4: Personalized Status Display Page */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.4 }}
              className="relative group overflow-hidden rounded-[2rem] bg-[#0f1219] border border-white/5 hover:border-amber-500/30 transition-all p-10 min-h-[400px] flex flex-col"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[80px] transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"></div>
              
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
                  <MonitorSmartphone className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-headline-sm font-bold text-white mb-4">Personalized Status Page</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Real-time transparency. Give every customer a personalized tracking link so they can wait anywhere, anxiety-free.
                </p>
              </div>

              {/* Visualization */}
              <div className="mt-8 relative h-32 flex justify-center items-center z-10">
                <div className="w-40 bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col items-center transform transition-transform group-hover:scale-105">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border-4 border-amber-500/50 flex flex-col items-center justify-center mb-2">
                    <span className="text-xs text-amber-400 font-bold">4</span>
                    <span className="text-[8px] text-zinc-400">MINS</span>
                  </div>
                  <div className="h-2 w-16 bg-white/20 rounded mb-1"></div>
                  <div className="h-1.5 w-10 bg-white/10 rounded"></div>
                </div>
              </div>
            </motion.div>

            {/* Feature 5: AI Announcement Mechanism */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.5 }}
              className="relative group overflow-hidden rounded-[2rem] bg-[#0f1219] border border-white/5 hover:border-rose-500/30 transition-all p-10 min-h-[400px] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[80px] -ml-20 -mb-20 transition-opacity opacity-50 group-hover:opacity-100 pointer-events-none"></div>
              
              <div className="relative z-10 flex-1">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6 text-rose-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-headline-sm font-bold text-white mb-4">AI Announcement Mechanism</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Turn any screen into a smart lobby display. Featuring automated voice announcements to keep your waiting room informed and calm.
                </p>
              </div>

              {/* TV Screen Visualization */}
              <div className="mt-8 relative h-32 w-full z-10">
                <div className="absolute inset-0 bg-black rounded-xl border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col group-hover:border-rose-900/50 transition-colors">
                  <div className="h-4 bg-zinc-900 border-b border-white/10"></div>
                  <div className="flex-1 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-label-caps block mb-1">NOW SERVING</span>
                      <span className="text-3xl font-data-mono-lg text-white font-bold group-hover:text-rose-400 transition-colors">C-204</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-[8px] text-rose-400 font-bold tracking-widest">AUDIO ON</span>
                      </div>
                      <span className="text-xl font-body-md text-zinc-300 font-medium">Room 4</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent animate-marquee"></div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Rich Media WhatsApp Native Section */}
      <section className="py-24 px-gutter border-t border-white/5 bg-transparent relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 relative z-10">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 glass-ui">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">sms</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-headline-md font-extrabold tracking-[-0.04em] text-white">Rich-media ticketing natively in WhatsApp.</h2>
            <p className="font-body-md text-zinc-400 leading-relaxed">
              Stop forcing users to download apps or keep browser tabs open. Qmova delivers real-time position updates, estimated wait times, and two-way communication directly through the channels they already use.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-body-sm text-zinc-300">Automated "5-minute warning" pings</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-body-sm text-zinc-300">Bi-directional delay reporting</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-body-sm text-zinc-300">Rich-media digital tickets (QR included)</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 flex justify-center w-full" style={{ perspective: "1000px" }}>
            {/* Mobile Phone Mockup */}
            <motion.div 
              initial={{ opacity: 0, y: 50, rotateY: 0, rotateX: 0 }}
              whileInView={{ opacity: 1, y: 0, rotateY: -15, rotateX: 5 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="w-[300px] h-[600px] rounded-[40px] glass-ui border-[4px] border-white/10 relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(16,185,129,0.3)] z-10"
            >
              <div className="absolute top-0 inset-x-0 h-6 bg-black/50 backdrop-blur-xl z-20 w-40 mx-auto rounded-b-xl border-x border-b border-white/5"></div>
              
              <div className="w-full h-full bg-[#0b141a]/90 backdrop-blur-sm flex flex-col">
                <div className="h-20 glass-ui flex items-end pb-3 px-4 gap-3 z-10 border-b border-white/5 rounded-none">
                  <ArrowRight className="text-white w-5 h-5 rotate-180" />
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[20px]">domain</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-body-md text-white font-medium leading-none">Qmova Clinic</h4>
                    <span className="font-body-sm text-zinc-400 text-[12px]">Verified Business</span>
                  </div>
                </div>
                
                <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fillRule=\'evenodd\'%3E%3Cg fill=\'%2310b981\' fillOpacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/5 backdrop-blur-md rounded-lg p-3 max-w-[85%] border border-white/10 shadow-lg mt-4 relative z-10"
                  >
                    <div className="bg-emerald-900/30 rounded p-4 mb-2 flex flex-col items-center border border-emerald-500/20">
                      <span className="font-label-caps text-emerald-400 mb-1">DIGITAL TICKET</span>
                      <span className="font-data-mono-lg text-white font-bold text-2xl">B-29</span>
                    </div>
                    <p className="font-body-sm text-white/90">You are in the queue. There are 4 people ahead of you.</p>
                    <span className="font-body-sm text-zinc-500 text-[10px] block text-right mt-1">10:42 AM</span>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 }}
                    className="bg-white/5 backdrop-blur-md rounded-lg p-3 max-w-[85%] border border-white/10 shadow-lg relative z-10"
                  >
                    <p className="font-body-sm text-white/90">⚠️ Heads up! It's almost your turn. Please head to waiting area 2.</p>
                    <span className="font-body-sm text-zinc-500 text-[10px] block text-right mt-1">11:05 AM</span>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.9 }}
                    className="bg-emerald-600/40 backdrop-blur-md rounded-lg p-3 max-w-[85%] self-end ml-auto border border-emerald-500/30 shadow-lg relative z-10"
                  >
                    <p className="font-body-sm text-white">On my way!</p>
                    <span className="font-body-sm text-emerald-200/50 text-[10px] block text-right mt-1">11:06 AM</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-gutter relative overflow-hidden flex justify-center">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto text-center glass-ui p-12 md:p-20 rounded-[3rem] border border-white/10 group hover:border-sky-500/30 transition-all bg-[#0a0d14]/80 backdrop-blur-3xl"
        >
          <h2 className="text-4xl md:text-6xl font-headline-lg font-extrabold tracking-[-0.04em] text-white mb-6 leading-tight">Stop Making Your Customers Wait.</h2>
          <p className="font-body-lg text-zinc-400 mb-10 max-w-xl mx-auto text-lg md:text-xl">
            Deploy Qmova today and transform your chaotic waiting room into a seamless, autonomous experience.
          </p>
          <Link href="/register" className="h-[60px] px-10 rounded-full bg-white text-zinc-950 font-body-lg font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center w-fit gap-3 mx-auto transform hover:scale-105 active:scale-95 group/btn">
            Deploy Qmova Now
            <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
          <p className="font-label-caps text-zinc-500 mt-8 tracking-widest text-[11px]">REQUIRES NO HARDWARE INSTALLATION</p>
        </motion.div>
      </section>


      {/* Footer */}
      <Footer />
    </div>
  );
}
