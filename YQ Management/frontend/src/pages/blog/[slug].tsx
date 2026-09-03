import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ArrowLeft, User, Calendar, Loader2, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../components/AuthContext';

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  coverImage?: string;
  publishedAt?: string;
  authorName?: string;
  excerpt?: string;
}

export default function BlogPost({ blog }: { blog: BlogPost }) {
  const router = useRouter();
  const { user } = useAuth();

  if (router.isFallback || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // Generate share URLs
  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://qmova.com/blog/${blog.slug}`;
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(blog.title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
  };

  return (
    <div className="dark bg-[#09090b] min-h-screen font-sans text-white antialiased overflow-x-hidden selection:bg-sky-500/30">
      <Head>
        <title>{blog.seoTitle || `${blog.title} | Qmova Blog`}</title>
        <meta name="description" content={blog.seoDescription || blog.excerpt || blog.title} />
        <meta property="og:title" content={blog.seoTitle || blog.title} />
        <meta property="og:description" content={blog.seoDescription || blog.excerpt} />
        {blog.coverImage && <meta property="og:image" content={blog.coverImage} />}
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
        <article className="max-w-4xl mx-auto px-4 lg:px-8">
          
          <Link href="/blog" className="inline-flex items-center space-x-2 text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors mb-12 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Blog</span>
          </Link>

          <div className="mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-8"
            >
              {blog.title}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-wrap items-center space-x-6 text-sm text-zinc-400 py-6 border-y border-white/5"
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-sky-400" />
                </div>
                <span className="font-medium text-zinc-200">{blog.authorName || 'Qmova Team'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{blog.publishedAt ? format(new Date(blog.publishedAt), 'MMMM d, yyyy') : 'Recently'}</span>
              </div>

              <div className="flex-1 flex justify-end items-center space-x-3">
                <span className="text-zinc-500 mr-2 flex items-center gap-1"><Share2 className="w-3 h-3"/> Share</span>
                <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:bg-white/10 transition-colors text-zinc-400 hover:text-white px-2 py-1 rounded">
                  Twitter
                </a>
                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:bg-white/10 transition-colors text-zinc-400 hover:text-white px-2 py-1 rounded">
                  LinkedIn
                </a>
                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:bg-white/10 transition-colors text-zinc-400 hover:text-white px-2 py-1 rounded">
                  Facebook
                </a>
              </div>
            </motion.div>
          </div>

          {blog.coverImage && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 relative aspect-video"
            >
              <div className="relative w-full aspect-video">
                <Image 
                  src={blog.coverImage} 
                  alt={blog.title} 
                  fill
                  className="object-cover" 
                />
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="prose prose-invert prose-lg max-w-none text-zinc-300 leading-relaxed
                       prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight
                       prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-a:transition-colors
                       prose-img:rounded-2xl prose-img:border prose-img:border-white/5 prose-img:shadow-2xl
                       prose-p:mb-6 prose-li:mb-2 prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </article>
      </main>

      {/* CTA Footer */}
      <section className="py-24 relative overflow-hidden flex justify-center text-center border-t border-white/5 bg-black/40">
        <div className="absolute inset-0 bg-sky-900/10"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-6 px-4">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">Upgrade your customer flow.</h2>
          <p className="text-lg text-zinc-400">
            Join modern businesses delivering a wait-free experience.
          </p>
          <div className="flex justify-center pt-4">
            <Link href="/register" className="h-[54px] px-8 rounded-full bg-sky-600 text-white font-bold hover:bg-sky-500 transition-all shadow-[0_0_30px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 text-center bg-black/80">
        <p className="text-zinc-500 text-sm font-medium">© {new Date().getFullYear()} Qmova. All rights reserved.</p>
      </footer>
    </div>
  );
}

export async function getServerSideProps(context: { params: { slug: string } }) {
  const { slug } = context.params;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/public/blogs/${slug}`);
    
    if (res.status === 404) {
      return { notFound: true };
    }
    
    const blog = await res.json();
    return { props: { blog } };
  } catch {
    return { notFound: true };
  }
}
