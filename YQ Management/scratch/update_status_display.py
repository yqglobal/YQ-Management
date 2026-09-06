import re

with open("frontend/src/pages/customer/status/[id].tsx", "r") as f:
    content = f.read()


banner_ui = """
          {data?.queue?.status === 'PAUSED' && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-2xl p-4 flex gap-4 items-center mb-6 animate-pulse">
              <span className="material-symbols-outlined text-[32px]">pause_circle</span>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">Queue Paused</h3>
                <p className="text-sm opacity-90">The operator is on a short break. Service will resume shortly.</p>
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 sm:p-12 shadow-xl border border-gray-100 dark:border-zinc-800 text-center relative overflow-hidden">
"""

content = content.replace('<div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 sm:p-12 shadow-xl border border-gray-100 dark:border-zinc-800 text-center relative overflow-hidden">', banner_ui)

with open("frontend/src/pages/customer/status/[id].tsx", "w") as f:
    f.write(content)

