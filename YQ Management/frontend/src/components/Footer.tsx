import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2">
            <div className="mb-6">
              <Logo width={150} height={24} href="/" forceTheme="dark" />
            </div>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs leading-relaxed">
              Enterprise-grade visit management and flow infrastructure for modern clinics, retail networks, and public institutions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/book-demo" className="hover:text-white transition-colors">Book a Demo</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
              <li><Link href="/status" className="hover:text-white transition-colors">System Status</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Legal & Trust</h3>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Qmova Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <Link
              href="/status"
              className="inline-flex items-center gap-2 hover:text-white transition-colors group cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:ring-4 group-hover:ring-emerald-500/20 transition-all"></span>
              All systems operational
            </Link>
            <span className="font-mono text-xs">v2.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
