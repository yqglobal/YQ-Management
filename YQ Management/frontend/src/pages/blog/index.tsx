import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';
import { format } from 'date-fns';
import { FileText, ArrowRight } from 'lucide-react';

export default function BlogListing({ blogs }: { blogs: any[] }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Head>
        <title>Qmova Blog | Industry Insights & News</title>
        <meta name="description" content="Discover the latest tips, updates, and insights on queue management and SaaS from Qmova." />
        <meta property="og:title" content="Qmova Blog | Industry Insights & News" />
        <meta property="og:description" content="Discover the latest tips, updates, and insights on queue management and SaaS from Qmova." />
      </Head>

      {/* Header (Simplified for public page) */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-blue-600">
            Qmova
          </Link>
          <div className="space-x-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">The Qmova Blog</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Insights, updates, and best practices for managing your queues and improving customer experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No posts yet</h3>
                <p className="text-gray-500">Check back later for exciting new content.</p>
              </div>
            ) : (
              blogs.map((blog) => (
                <Link key={blog.id} href={`/blog/${blog.slug}`} className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                  {blog.coverImage ? (
                    <img src={blog.coverImage} alt={blog.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-blue-200" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                      {blog.publishedAt ? format(new Date(blog.publishedAt), 'MMM d, yyyy') : 'Recently'}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {blog.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3 text-sm flex-1">
                      {blog.excerpt || 'Read this article to learn more about our latest insights and updates.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-gray-900">{blog.authorName || 'Qmova Team'}</span>
                      <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 text-center">
        <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Qmova. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Ensure SEO speed and reliability by server rendering or static generation
export async function getServerSideProps() {
  try {
    // Note: since this is SSR, we use the internal API or direct fetch.
    // In a real production environment with next, we might want getStaticProps with revalidate.
    // Using getServerSideProps with the absolute URL for simplicity here.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/public/blogs`);
    const blogs = await res.json();
    return { props: { blogs: blogs || [] } };
  } catch (error) {
    return { props: { blogs: [] } };
  }
}
