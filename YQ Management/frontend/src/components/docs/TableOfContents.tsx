import React, { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Select all h2, h3 inside the prose container
    const elements = Array.from(document.querySelectorAll('.prose h2, .prose h3'));
    const parsedHeadings = elements.map(el => ({
      id: el.id,
      text: el.textContent || '',
      level: Number(el.tagName.charAt(1))
    })).filter(h => h.id);

    setHeadings(parsedHeadings);

    // Setup intersection observer
    const callback = (entries: IntersectionObserverEntry[]) => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (visible) {
        setActiveId(visible.target.id);
      }
    };

    const observer = new IntersectionObserver(callback, {
      rootMargin: '0px 0px -80% 0px'
    });

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <div className="w-56 shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden xl:block pl-6 py-8 custom-scrollbar text-sm">
      <h4 className="font-semibold text-white mb-4 uppercase tracking-wider text-xs">On this page</h4>
      <div className="space-y-2.5 border-l border-white/10">
        {headings.map(heading => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`block -ml-px border-l-2 pl-3 py-0.5 transition-colors ${
              heading.level === 3 ? 'ml-2 text-xs' : ''
            } ${
              activeId === heading.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {heading.text}
          </a>
        ))}
      </div>
    </div>
  );
}
