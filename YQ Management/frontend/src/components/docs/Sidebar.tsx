import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SidebarSection } from '../../lib/docs';

interface SidebarProps {
  sections: SidebarSection[];
}

export default function Sidebar({ sections }: SidebarProps) {
  const router = useRouter();
  const currentSlug = (router.query.slug as string[])?.join('/') || '';

  return (
    <nav className="w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden md:block border-r border-white/10 pr-6 py-8 custom-scrollbar">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="mb-8">
          <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
            {section.title}
          </h4>
          
          {/* If the section has an index file, show it as an overview link */}
          <Link
            href={`/docs/${section.slug}`}
            className={`block text-sm py-1.5 px-3 -ml-3 rounded-md transition-colors ${
              currentSlug === section.slug
                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Overview
          </Link>

          <div className="space-y-1 mt-1">
            {section.items.map((item, iIdx) => {
              const isActive = currentSlug === item.slug;
              return (
                <Link
                  key={iIdx}
                  href={`/docs/${item.slug}`}
                  className={`block text-sm py-1.5 px-3 -ml-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
