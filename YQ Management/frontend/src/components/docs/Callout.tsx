import React from 'react';
import { Info, AlertTriangle, Lightbulb, PenTool, Milestone } from 'lucide-react';

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'note' | 'roadmap';
  title?: string;
  children: React.ReactNode;
}

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    tip: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    note: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400',
    roadmap: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    tip: <Lightbulb className="w-5 h-5" />,
    note: <PenTool className="w-5 h-5" />,
    roadmap: <Milestone className="w-5 h-5" />,
  };

  return (
    <div className={`my-6 flex gap-4 p-4 rounded-xl border ${styles[type]}`}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div>
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-sm opacity-90 leading-relaxed prose-p:my-0">
          {children}
        </div>
      </div>
    </div>
  );
}
