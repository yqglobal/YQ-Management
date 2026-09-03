import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { FileText, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../components/AuthContext';

interface Blog {
  slug: string;
  title: string;
  coverImage?: string;
  publishedAt?: string;
  excerpt?: string;
  authorName?: string;
}

export default function BlogListing({ blogs }: { blogs: Blog[] }) {
  const { user } = useAuth();

  return (
    <div className="dark bg-[#09090b] min-h-screen font-sans text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>Qmova Blog | Industry Insights & News</title>
        <meta name="description" content="Discover the latest tips, updates, and insights on queue management and SaaS from Qmova." />
        <meta property="og:title" content="Qmova Blog | Industry Insights & News" />
        <meta property="og:description" content="Discover the latest tips, updates, and insights on queue management and SaaS from Qmova." />
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

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <div className="relative max-w-6xl mx-auto px-4 lg:px-8 mb-20 text-center">
          <div className="absolute inset-0 -top-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent opacity-70 pointer-events-none"></div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-[4rem] font-extrabold tracking-tight leading-[1.1] text-white mb-6"
          >
            The Qmova Blog
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Insights, updates, and best practices for managing your queues and improving customer experience.
          </motion.p>
        </div>

        {/* Blog Grid */}
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.length === 0 ? (
              <div className="col-span-full text-center py-24 bg-[#0f1219] rounded-3xl border border-white/5">
                <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">No posts yet</h3>
                <p className="text-zinc-400">Check back later for exciting new content.</p>
              </div>
            ) : (
              blogs.map((blog, idx) => (
                <motion.div 
                  key={blog.id} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Link href={`/blog/${blog.slug}`} className="group flex flex-col h-full bg-[#0f1219] rounded-2xl border border-white/5 overflow-hidden hover:border-sky-500/30 transition-all duration-300">
                    <div className="relative w-full h-56 overflow-hidden">
                      {blog.coverImage ? (
                        <div className="relative w-full h-full">
                          <Image 
                            src={blog.coverImage} 
                            alt={blog.title} 
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-700 ease-out">
                          <FileText className="w-12 h-12 text-indigo-300/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1219] to-transparent opacity-80" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col relative z-10 -mt-10">
                      <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">
                        {blog.publishedAt ? format(new Date(blog.publishedAt), 'MMM d, yyyy') : 'Recently'}
                      </p>
                      <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-sky-300 transition-colors">
                        {blog.title}
                      </h2>
                      <p className="text-zinc-400 mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
                        {blog.excerpt || 'Read this article to learn more about our latest insights and updates.'}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <span className="text-sm font-semibold text-zinc-300">{blog.authorName || 'Qmova Team'}</span>
                        <span className="text-sky-400 group-hover:translate-x-1 transition-transform bg-sky-500/10 p-2 rounded-full">
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 text-center bg-black/40">
        <p className="text-zinc-500 text-sm font-medium">© {new Date().getFullYear()} Qmova. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Ensure SEO speed and reliability by server rendering or static generation
export async function getServerSideProps() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/public/blogs`);
    const blogs = await res.json();
    return { props: { blogs: blogs || [] } };
  } catch {
    return { props: { blogs: [] } };
  }
}
