import Footer from "../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

import { useAuth } from '../components/AuthContext';
import { Logo } from '../components/Logo';
import { motion } from 'framer-motion';
import { MessageSquare, CalendarDays, Ticket, MonitorSmartphone, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="dark bg-[#09090b] min-h-screen font-sans text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova | Empty your waiting room</title>
        <meta name="description" content="The easiest way to manage appointments and walk-ins without the waiting room chaos." />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: #09090b !important; }` }} />
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

      {/* Hero Section - The Customer Experience */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-24 pb-10 px-gutter overflow-hidden">

        {/* Dynamic Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent opacity-70 pointer-events-none"></div>
        <motion.div
          className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"
          animate={{ scale: [1, 1.1, 1], x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12 z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 space-y-6 lg:space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2 rounded-full bg-emerald-400">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </span>
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Whether you run a clinic or a salon, we have you covered</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Upgrade your customer flow. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 mt-2 block">Deliver a wait-free experience.</span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-zinc-400 max-w-lg leading-relaxed font-medium">
              Elevate your business with advanced digital customer flow solutions. Launch a custom booking page and manage walk-ins effortlessly. Easy to set up, simple to use, and a fraction of the cost.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Link href="/register" className="relative group w-full sm:w-auto h-[50px] lg:h-[54px] px-8 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-all shadow-[0_0_30px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                <span className="relative z-10 flex items-center gap-2">
                  Start Your Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link href="#features" className="relative group w-full sm:w-auto h-[50px] lg:h-[54px] px-8 rounded-full bg-white/[0.03] text-white font-semibold hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95">
                <span>Explore Features</span>
              </Link>
            </div>

            <div className="flex items-center gap-4 pt-2 opacity-70">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#09090b] flex items-center justify-center overflow-hidden">
                    <Image src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-zinc-400 leading-tight">
                <span className="text-white font-bold block">Trusted by modern businesses</span>
                to digitalize their customer flow
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-1 relative w-full aspect-square max-w-[600px] flex items-center justify-center group cursor-default"
          >
            {/* Dual Glow Balls */}
            <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-sky-500/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[70%] h-[70%] bg-purple-500/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out delay-75" />

            {/* Hover Image */}
            <Image
              src="/images/no-bg/maya-hero-section.png"
              alt="Hero Section Image"
              width={800}
              height={800}
              priority
              className="relative z-10 w-[120%] max-w-none h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-none scale-100 group-hover:scale-105 translate-y-0 group-hover:-translate-y-4 transition-all duration-700 ease-out"
            />

            {/* Floating Ticket Confirmed Card */}
            <div className="absolute -bottom-4 right-0 z-20 pointer-events-none translate-y-0 group-hover:-translate-y-2 transition-all duration-700 ease-out">
              <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-2xl inline-block max-w-[320px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg tracking-tight">Ticket Confirmed</p>
                    <p className="text-zinc-400 text-sm leading-tight mt-0.5">Maya joined the queue from her phone.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - How it Works */}
      <section id="features" className="py-24 px-gutter relative overflow-hidden bg-black/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-white">Everything you need to run a flawless front desk.</h2>
            <p className="text-lg text-zinc-400">
              No expensive pagers. No clunky tablets. Just simple, powerful tools that your customers and your staff will love.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {/* Feature 1 */}
            <Link href="/features#whatsapp" className="bg-[#0f1219] border border-white/5 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors group block cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">WhatsApp Chatbot</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your customers already use WhatsApp. Let them join the queue instantly via chat. Our bot handles wait times and 5-minute warnings automatically.
              </p>
            </Link>

            {/* Feature 2 */}
            <Link href="/features#routing" className="bg-[#0f1219] border border-white/5 rounded-2xl p-8 hover:border-purple-500/30 transition-colors group block cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CalendarDays className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom Booking Page</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Launch a beautiful booking page in seconds. No setup required. Just share your link and watch your calendar fill up with scheduled appointments.
              </p>
            </Link>

            {/* Feature 3 */}
            <Link href="/features#status" className="bg-[#0f1219] border border-white/5 rounded-2xl p-8 hover:border-amber-500/30 transition-colors group block cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Ticket className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Virtual Tickets</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Customers scan a QR code at your door, get a digital ticket on their phone, and wait wherever they want. We alert them when it&apos;s their turn.
              </p>
            </Link>

            {/* Feature 4 */}
            <Link href="/features#mobile" className="bg-[#0f1219] border border-white/5 rounded-2xl p-8 hover:border-sky-500/30 transition-colors group block cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MonitorSmartphone className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Web-Based Management</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Run your entire floor from any browser or iPad. No heavy software to install, no specialized hardware to buy. It just works.
              </p>
            </Link>
          </div>

          {/* The Business Experience - Visual Story */}
          <div className="flex flex-col gap-32 mt-32">

            {/* Feature Story 1: Web Dashboard */}
            <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -30 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
                className="flex-1 relative w-full aspect-[4/3] flex items-center justify-center group cursor-default"
              >
                <div className="absolute top-0 left-0 w-[80%] h-[80%] bg-sky-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out" />
                <div className="absolute bottom-0 right-0 w-[80%] h-[80%] bg-teal-400/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out delay-75" />
                <Image
                  src="/images/no-bg/maya-reception.png"
                  alt="Receptionist using Qmova Dashboard"
                  width={800}
                  height={600}
                  loading="lazy"
                  className="relative z-10 w-[90%] max-w-none h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.6)] pointer-events-none scale-100 group-hover:scale-105 translate-y-0 group-hover:-translate-y-3 transition-all duration-700 ease-out"
                />
              </motion.div>

              <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">Empower your receptionists.</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Qmova&apos;s web dashboard is so simple that your staff can learn it in 3 minutes. It takes the stress out of the front desk by automatically slotting walk-ins into the gaps between your scheduled appointments.
                </p>
                <div className="pt-4">
                  <Link href="/features#routing" className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-2 group">
                    Explore the dashboard
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Feature Story 2: WhatsApp Chatbot */}
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-6 lg:pl-12">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">Let AI handle the waiting.</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Give your customers the ultimate convenience. They can join the queue directly through WhatsApp, get real-time updates on their position, and receive a friendly 5-minute warning when it&apos;s their turn.
                </p>
                <div className="pt-4">
                  <Link href="/features#whatsapp" className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-2 group">
                    See the chatbot in action
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: 30 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
                className="flex-1 relative w-full aspect-[4/3] flex items-center justify-center group cursor-default"
              >
                <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out" />
                <div className="absolute bottom-0 left-0 w-[80%] h-[80%] bg-green-400/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out delay-75" />
                <Image
                  src="/images/no-bg/maya-whatsapp.png"
                  alt="WhatsApp Chatbot"
                  width={800}
                  height={600}
                  loading="lazy"
                  className="relative z-10 w-[90%] max-w-none h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.6)] pointer-events-none scale-100 group-hover:scale-105 translate-y-0 group-hover:-translate-y-3 transition-all duration-700 ease-out"
                />
              </motion.div>
            </div>

            {/* Feature Story 3: Custom Booking Calendar */}
            <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -30 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
                className="flex-1 relative w-full aspect-[4/3] flex items-center justify-center group cursor-default"
              >
                <div className="absolute top-10 left-0 w-[80%] h-[80%] bg-purple-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out" />
                <div className="absolute bottom-10 right-0 w-[80%] h-[80%] bg-pink-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out delay-75" />
                <Image
                  src="/images/no-bg/maya-callendar.png"
                  alt="Custom Booking Calendar"
                  width={800}
                  height={600}
                  loading="lazy"
                  className="relative z-10 w-[90%] max-w-none h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.6)] pointer-events-none scale-100 group-hover:scale-105 translate-y-0 group-hover:-translate-y-3 transition-all duration-700 ease-out"
                />
              </motion.div>

              <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">Effortless scheduling.</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Launch a beautiful, custom-branded booking page in seconds. No coding required. Just share your link, and clients can instantly lock in their appointments based on your real-time availability.
                </p>
                <div className="pt-4">
                  <Link href="/features#routing" className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-2 group">
                    Create your booking page
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Feature Story 4: No Hardware */}
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-6 lg:pl-12">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">Ditch the clunky hardware.</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Say goodbye to expensive pagers and specialized tablets. Qmova is entirely software-based. Customers use their own smartphones, and your staff can manage everything from any standard web browser.
                </p>
                <div className="pt-4">
                  <Link href="/features#mobile" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-2 group">
                    Modernize your business today
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: 30 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
                className="flex-1 relative w-full aspect-[4/3] flex items-center justify-center group cursor-default"
              >
                <div className="absolute top-0 right-10 w-[80%] h-[80%] bg-amber-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out" />
                <div className="absolute bottom-0 left-10 w-[80%] h-[80%] bg-orange-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-80 scale-100 group-hover:scale-125 transition-all duration-700 ease-out delay-75" />
                <Image
                  src="/images/no-bg/maya-nohardware.png"
                  alt="No hardware needed"
                  width={800}
                  height={600}
                  loading="lazy"
                  className="relative z-10 w-[90%] max-w-none h-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.6)] pointer-events-none scale-100 group-hover:scale-105 translate-y-0 group-hover:-translate-y-3 transition-all duration-700 ease-out"
                />
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-gutter relative overflow-hidden flex justify-center text-center">
        <div className="absolute inset-0 bg-sky-900/20"></div>
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#09090b] to-transparent"></div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white">Ready to clear the room?</h2>
          <p className="text-xl text-zinc-400">
            Join 500+ businesses running a better waiting experience.
          </p>
          <div className="flex justify-center">
            <Link href="/register" className="h-[60px] px-10 rounded-full bg-sky-600 text-white font-bold hover:bg-sky-500 transition-all shadow-[0_0_40px_rgba(2,132,199,0.4)] flex items-center justify-center gap-2 text-lg hover:scale-105 active:scale-95">
              Start Your Free Trial Now
            </Link>
          </div>
          <p className="text-sm text-zinc-500">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
