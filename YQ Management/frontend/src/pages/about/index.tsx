import Footer from "../../components/Footer";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../components/AuthContext';
import { Logo } from '../../components/Logo';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function AboutPage() {
  const { user } = useAuth();
  
  // Parallax scroll effects
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityFade = useTransform(scrollY, [0, 300], [1, 0]);

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
      <section className="relative min-h-[600px] flex flex-col items-center justify-center pt-32 px-gutter overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-rose-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen"></div>

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
            We are ending <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-rose-400 via-sky-400 to-rose-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Waiting Room Anxiety.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="font-body-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed text-lg md:text-xl"
          >
            Qmova was founded on a simple principle: people's time is valuable, and waiting in an uncomfortable room without knowing when you'll be seen is fundamentally broken.
          </motion.p>
        </motion.div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-gutter relative overflow-hidden">
        <div className="max-w-3xl mx-auto z-10 relative">
          <div className="glass-ui bg-[#0a0a0a]/80 p-10 md:p-16 rounded-[2rem] border border-white/5 space-y-8 text-zinc-300 font-body-md leading-relaxed text-lg shadow-2xl">
            <p>
              In healthcare clinics, retail stores, and government offices around the world, the "waiting room" has remained largely unchanged for decades. You walk in, take a paper ticket or write your name on a clipboard, and sit.
            </p>
            <p>
              You don't know how many people are ahead of you. You don't know if the person who walked in after you is going to be seen first. You can't leave to get a coffee for fear of missing your name being called.
            </p>
            <p className="text-white font-medium text-xl">
              This opacity creates anxiety, frustration, and ultimately, a poor customer experience.
            </p>
            <p>
              At Qmova, we believe that transparency is the antidote to waiting room anxiety. By combining algorithmic queue routing, native WhatsApp integration, and beautiful status pages, we give the power back to the customer. We let them know exactly where they stand, and give businesses the tools to manage chaos gracefully.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
