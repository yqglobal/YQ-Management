import React from 'react';
import Link from 'next/link';

interface RelatedDocsProps {
  docs: { title: string; href: string; description?: string }[];
}

export default function RelatedDocs({ docs }: RelatedDocsProps) {
  if (!docs || docs.length === 0) return null;

  return (
    <div className="my-8">
      <h3 className="text-lg font-semibold text-white mb-4">Related Documents</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docs.map((doc, idx) => (
          <Link 
            key={idx} 
            href={doc.href}
            className="block p-4 rounded-xl border border-white/10 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-white/20 transition-all"
          >
            <div className="font-medium text-indigo-400 mb-1">{doc.title}</div>
            {doc.description && (
              <div className="text-sm text-zinc-400">{doc.description}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
