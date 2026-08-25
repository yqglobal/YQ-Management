import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ArrowLeft, User, Calendar, Loader2 } from 'lucide-react';

import DOMPurify from 'isomorphic-dompurify';

export default function BlogPost({ blog }: { blog: any }) {
  const router = useRouter();

  if (router.isFallback || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Basic markdown rendering or dangerouslySetInnerHTML.
  // We assume content is HTML here, since we said HTML/Markdown. 
  // If it's markdown, one would use a library like react-markdown. 
  // For standard compatibility without adding deps, we use HTML string.
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Head>
        <title>{blog.seoTitle || `${blog.title} | Qmova Blog`}</title>
        <meta name="description" content={blog.seoDescription || blog.excerpt || blog.title} />
        <meta property="og:title" content={blog.seoTitle || blog.title} />
        <meta property="og:description" content={blog.seoDescription || blog.excerpt} />
        {blog.coverImage && <meta property="og:image" content={blog.coverImage} />}
      </Head>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/blog" className="text-gray-500 hover:text-gray-900 flex items-center space-x-2 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Blog</span>
          </Link>
          <Link href="/" className="text-xl font-bold tracking-tighter text-blue-600">
            Qmova
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="font-medium text-gray-900">{blog.authorName || 'Qmova Team'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{blog.publishedAt ? format(new Date(blog.publishedAt), 'MMMM d, yyyy') : 'Recently'}</span>
              </div>
            </div>
          </div>

          {blog.coverImage && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              <img src={blog.coverImage} alt={blog.title} className="w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}

          <div 
            className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed
                       prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight
                       prose-a:text-blue-600 hover:prose-a:text-blue-500"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blog.content) }}
          />
        </article>
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 text-center mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Start managing your queues effectively today</h3>
          <Link href="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-sm mb-8">
            Create Free Account
          </Link>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Qmova. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const { slug } = context.params;
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/public/blogs/${slug}`);
    
    if (res.status === 404) {
      return { notFound: true };
    }
    
    const blog = await res.json();
    return { props: { blog } };
  } catch (error) {
    return { notFound: true };
  }
}
