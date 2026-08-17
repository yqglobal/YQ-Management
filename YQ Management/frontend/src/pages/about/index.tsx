import Footer from "../../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion } from 'framer-motion';

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="dark bg-[#09090b] min-h-screen font-body-md text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova | About Us</title>
        <meta name="description" content="Eliminating waiting room anxiety through algorithmic queue management." />
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-rose-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen" />
        
        <div className="max-w-4xl mx-auto text-center z-10 space-y-6 flex flex-col items-center relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-headline-lg font-extrabold tracking-tight text-white drop-shadow-2xl"
          >
            We are ending <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-rose-400 via-sky-400 to-rose-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Waiting Room Anxiety.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg"
          >
            Qmova was founded on a simple principle: people's time is valuable, and waiting in an uncomfortable room without knowing when you'll be seen is fundamentally broken.
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-gutter relative">
        <div className="max-w-4xl mx-auto glass-ui bg-[#0a0a0a]/80 p-10 md:p-16 rounded-[2rem] border border-white/5 space-y-8 text-zinc-300 font-body-md leading-relaxed text-lg shadow-2xl relative z-10">
          <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
          <p>
            In healthcare clinics, retail stores, and government offices around the world, the "waiting room" has remained largely unchanged for decades. You walk in, take a paper ticket or write your name on a clipboard, and sit.
          </p>
          <p>
            You don't know how many people are ahead of you. You don't know if the person who walked in after you is going to be seen first. You can't leave to get a coffee for fear of missing your name being called.
          </p>
          <p className="text-white font-medium text-xl border-l-4 border-rose-500 pl-4 py-2 my-8 bg-white/5 rounded-r-lg">
            This opacity creates anxiety, frustration, and ultimately, a poor customer experience.
          </p>
          <p>
            At Qmova, we believe that transparency is the antidote to waiting room anxiety. By combining algorithmic queue routing, native WhatsApp integration, and beautiful status pages, we give the power back to the customer. We let them know exactly where they stand, and give businesses the tools to manage chaos gracefully.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-gutter relative border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">visibility</span>
              </div>
              <h3 className="text-xl font-bold text-white">Transparency First</h3>
              <p className="text-zinc-400">We believe everyone deserves to know exactly where they stand and how long they have to wait. No black boxes.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">favorite</span>
              </div>
              <h3 className="text-xl font-bold text-white">Radical Empathy</h3>
              <p className="text-zinc-400">Waiting is stressful. We design our software to be calming, accessible, and empathetic to the end-user's experience.</p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h3 className="text-xl font-bold text-white">Algorithmic Efficiency</h3>
              <p className="text-zinc-400">We use advanced routing algorithms to ensure businesses operate at peak efficiency without sacrificing human touch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 px-gutter relative border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Meet the Team</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-16">We are a small, dedicated team of engineers and designers passionate about solving real-world operational problems.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Placeholder Team Members */}
            {[
              { name: 'Alex Rivera', role: 'CEO & Co-Founder', initial: 'A' },
              { name: 'Sarah Chen', role: 'CTO & Co-Founder', initial: 'S' },
              { name: 'Marcus Johnson', role: 'Head of Product', initial: 'M' },
              { name: 'Elena Rodriguez', role: 'Lead Designer', initial: 'E' },
            ].map((member, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border-4 border-[#0f1219] shadow-xl flex items-center justify-center text-4xl font-bold text-zinc-500 mb-4">
                  {member.initial}
                </div>
                <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                <p className="text-sky-400 text-sm font-medium">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
