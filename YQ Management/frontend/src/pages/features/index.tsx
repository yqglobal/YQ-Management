import Footer from "../../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion } from 'framer-motion';
import { Activity, CalendarDays, MessageSquare, MonitorSmartphone, Bell, Scan } from 'lucide-react';

export default function FeaturesPage() {
  const { user } = useAuth();
  
  return (
    <div className="dark bg-[#09090b] min-h-screen font-body-md text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova | Features</title>
        <meta name="description" content="Explore the comprehensive feature set of the Qmova waiting room management platform." />
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
      <section className="relative pt-40 pb-32 px-gutter overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen" />
        
        <div className="max-w-4xl mx-auto text-center z-10 space-y-6 flex flex-col items-center relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-headline-lg font-extrabold tracking-tight text-white drop-shadow-2xl"
          >
            Everything you need <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">to manage the floor.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg"
          >
            A deep dive into the powerful tools and capabilities that make Qmova the most advanced waiting room management platform on the market.
          </motion.p>
        </div>
      </section>

      {/* Feature 1: Smart Routing */}
      <section className="py-24 px-gutter border-t border-white/5 relative overflow-hidden bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold text-white">Algorithmic Queue Routing</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              We discarded the traditional first-in-first-out list. Our routing engine automatically fits walk-in customers into schedule gaps without delaying booked appointments. It calculates micro-gaps to maintain perfect flow across your entire floor.
            </p>
            <ul className="space-y-3 pt-4 text-zinc-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Intelligent gap detection</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Priority merging for VIPs</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Load balancing across multiple desks</li>
            </ul>
          </div>
          <div className="flex-1 w-full bg-[#0f1219] rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center shadow-2xl min-h-[400px]">
            <div className="w-full max-w-sm space-y-4">
              <div className="h-16 w-full bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                <div className="w-2 h-2 rounded-full bg-zinc-500 mr-2"></div>
                <span className="font-data-mono text-[11px] text-zinc-400 uppercase">Appt 09:00</span>
              </div>
              {/* Expanding injection block */}
              <div className="h-24 w-full bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl flex flex-col justify-center items-center relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-gradient"></div>
                <span className="font-label-caps text-emerald-400 text-[10px] tracking-wider mb-1">WALK-IN INJECTED</span>
                <span className="font-data-mono font-bold text-white text-sm">Gap: +12m</span>
              </div>
              <div className="h-16 w-full bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                <div className="w-2 h-2 rounded-full bg-zinc-500 mr-2"></div>
                <span className="font-data-mono text-[11px] text-zinc-400 uppercase">Appt 09:30</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: WhatsApp */}
      <section className="py-24 px-gutter border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="flex-1 w-full bg-[#0f1219] rounded-3xl border border-white/10 p-8 flex items-center justify-center shadow-2xl min-h-[400px]">
             <motion.div 
               whileHover={{ rotateY: 15, rotateX: 10, scale: 1.05 }}
               transition={{ type: "spring", stiffness: 300 }}
               className="w-64 bg-[#0b141a] border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_rgba(16,185,129,0.2)] preserve-3d flex flex-col gap-3"
             >
               <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none border border-emerald-500/20">
                 <span className="text-xs text-white">Reply with 1 to join queue for Consultations.</span>
               </div>
               <div className="bg-emerald-600/40 p-3 rounded-lg rounded-tr-none border border-emerald-500/30 self-end">
                 <span className="text-xs text-white">1</span>
               </div>
               <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none border border-emerald-500/20">
                 <span className="text-xs text-white">You are in the queue. Ticket A-104.</span>
               </div>
               <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none border border-emerald-500/20">
                 <span className="text-xs text-white">Your turn is approaching in 5 minutes! Please head to the lobby.</span>
               </div>
             </motion.div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold text-white">WhatsApp Chatbot Engine</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Stop forcing your customers to download proprietary apps. Qmova leverages native WhatsApp integration to allow customers to join queues, check status, and receive alerts via the messaging app they already have installed.
            </p>
            <ul className="space-y-3 pt-4 text-zinc-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> 5-minute automated warning pings</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Two-way delay reporting</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> QR code to WhatsApp bridging</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 3: Status Pages */}
      <section className="py-24 px-gutter border-t border-white/5 relative overflow-hidden bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold text-white">Personalized Status Tracking</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Every customer gets a unique, secure URL acting as their personal status dashboard. It updates in real-time via WebSockets, so they can grab a coffee next door without the fear of losing their place in line.
            </p>
            <ul className="space-y-3 pt-4 text-zinc-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> Live ETA updates</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> Position in queue display</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> Pre-arrival digital forms</li>
            </ul>
          </div>
          <div className="flex-1 w-full bg-[#0f1219] rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center shadow-2xl min-h-[400px]">
            <div className="w-64 bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
              <h3 className="text-white text-lg font-bold mb-6">Your Status</h3>
              <div className="w-32 h-32 rounded-full bg-zinc-800 border-8 border-amber-500 flex flex-col items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="text-4xl text-amber-400 font-bold">12</span>
                <span className="text-xs text-zinc-400 font-bold mt-1">MINS ETA</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-lg p-3 text-center">
                <span className="text-zinc-400 text-sm">Position: </span>
                <span className="text-white font-bold">3rd</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Mobile Management */}
      <section className="py-24 px-gutter border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="flex-1 w-full bg-[#0f1219] rounded-3xl border border-white/10 p-8 flex items-center justify-center shadow-2xl min-h-[400px]">
             <div className="w-64 h-[400px] bg-black border-4 border-zinc-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden relative">
               <div className="absolute top-2 inset-x-12 h-4 bg-zinc-800 rounded-full z-20"></div>
               <div className="h-20 bg-sky-900/50 flex flex-col justify-end px-4 pb-2">
                 <span className="text-white font-bold">Service Desk</span>
               </div>
               <div className="flex bg-zinc-900 border-b border-zinc-800 p-1 gap-1">
                 <div className="flex-1 bg-sky-500 text-white text-center text-xs py-2 rounded-lg font-bold">Pool (4)</div>
                 <div className="flex-1 text-zinc-400 text-center text-xs py-2 font-bold">Pipeline</div>
               </div>
               <div className="p-4 space-y-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="bg-zinc-900 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">A{i}</div>
                       <div className="h-2 w-16 bg-white/20 rounded"></div>
                     </div>
                     <div className="h-6 w-12 bg-white/10 rounded-md"></div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Scan className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold text-white">Mobile Management & Scanner</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Equip your floor staff with the tools they need, right in their pockets. Qmova's dashboard is fully responsive, featuring a built-in QR scanner that utilizes the smartphone camera to instantly check-in visitors.
            </p>
            <ul className="space-y-3 pt-4 text-zinc-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Native smartphone camera scanning</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Tabbed mobile service desk</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Instant queue dispatch</li>
            </ul>
          </div>
        </div>
      </section>
      
      {/* Feature 5: AI Announcements */}
      <section className="py-24 px-gutter border-t border-white/5 relative overflow-hidden bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold text-white">AI Voice Announcements</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Turn any smart TV or tablet into a digital lobby display. When a customer's turn arrives, Qmova automatically generates a natural-sounding voice announcement, calling them to the correct room.
            </p>
            <ul className="space-y-3 pt-4 text-zinc-300">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Multiple voice profiles & accents</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Multi-language support</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Flashing visual cues on screen</li>
            </ul>
          </div>
          <div className="flex-1 w-full bg-[#0f1219] rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center shadow-2xl min-h-[400px]">
            <div className="w-full max-w-md bg-black rounded-xl border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col relative">
               <div className="h-4 bg-zinc-900 border-b border-white/10"></div>
               <div className="flex-1 p-6 flex items-center justify-between">
                 <div>
                   <span className="text-xs text-zinc-500 font-label-caps block mb-2">NOW SERVING</span>
                   <span className="text-5xl font-data-mono-lg text-white font-bold text-rose-400">C-204</span>
                 </div>
                 <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                     <span className="text-[10px] text-rose-400 font-bold tracking-widest">AUDIO ON</span>
                   </div>
                   <span className="text-2xl font-body-md text-zinc-300 font-medium">Room 4</span>
                 </div>
               </div>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-marquee"></div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-gutter border-t border-white/5 relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">Ready to upgrade your waiting room?</h2>
          <p className="text-zinc-400 text-lg">Join thousands of businesses streamlining their operations with Qmova.</p>
          <div className="flex justify-center">
            <Link href="/register" className="px-8 py-4 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform shadow-lg">
              Start your free trial
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
