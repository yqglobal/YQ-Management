import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  slugs: string[];
}

export default function Breadcrumbs({ slugs }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center text-sm text-zinc-500 mb-8 whitespace-nowrap overflow-x-auto custom-scrollbar pb-2">
      <Link href="/docs" className="hover:text-white transition-colors flex items-center gap-1.5">
        <Home className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {slugs.map((slug, idx) => {
        const isLast = idx === slugs.length - 1;
        const href = `/docs/${slugs.slice(0, idx + 1).join('/')}`;
        const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-4 h-4 mx-2 shrink-0 opacity-50" />
            {isLast ? (
              <span className="text-zinc-200 font-medium truncate">{title}</span>
            ) : (
              <Link href={href} className="hover:text-white transition-colors truncate">
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
