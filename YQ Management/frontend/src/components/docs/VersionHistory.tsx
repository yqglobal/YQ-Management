import React from 'react';

interface VersionUpdate {
  version: string;
  date: string;
  description: string;
}

interface VersionHistoryProps {
  updates: VersionUpdate[];
}

export default function VersionHistory({ updates }: VersionHistoryProps) {
  return (
    <div className="my-8">
      <h3 className="text-lg font-semibold text-white mb-4">Version History</h3>
      <div className="space-y-4 border-l border-white/10 ml-3">
        {updates.map((update, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute w-2 h-2 bg-indigo-500 rounded-full left-[-4.5px] top-2" />
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                v{update.version}
              </span>
              <span className="text-xs text-zinc-500">{update.date}</span>
            </div>
            <p className="text-sm text-zinc-400">{update.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
