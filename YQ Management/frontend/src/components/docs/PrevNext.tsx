import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SidebarItem } from '../../lib/docs';

interface PrevNextProps {
  prev: SidebarItem | null;
  next: SidebarItem | null;
}

export default function PrevNext({ prev, next }: PrevNextProps) {
  if (!prev && !next) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-8 border-t border-white/10">
      {prev ? (
        <Link 
          href={`/docs/${prev.slug}`}
          className="flex-1 p-4 rounded-xl border border-white/10 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-white/20 transition-all flex flex-col items-start group"
        >
          <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Previous
          </span>
          <span className="font-medium text-white">{prev.title}</span>
        </Link>
      ) : <div className="flex-1" />}
      
      {next ? (
        <Link 
          href={`/docs/${next.slug}`}
          className="flex-1 p-4 rounded-xl border border-white/10 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-white/20 transition-all flex flex-col items-end group text-right"
        >
          <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
            Next
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </span>
          <span className="font-medium text-white">{next.title}</span>
        </Link>
      ) : <div className="flex-1" />}
    </div>
  );
}
