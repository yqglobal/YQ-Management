import re

with open("frontend/src/pages/dashboard/queues/[id]/index.tsx", "r") as f:
    content = f.read()

operator_controls_ui = """
              {/* Operator Controls */}
              <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-6 shadow-sm">
                <h3 className="font-headline-sm text-headline-sm font-semibold mb-4 text-on-surface dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary dark:text-sky-500">settings_remote</span>
                  Operator Controls
                </h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleToggleStatus}
                    disabled={updateStatusMutation.isPending}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      queue.status === 'ACTIVE'
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/20 dark:text-amber-400'
                        : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 dark:text-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span className="material-symbols-outlined">
                        {queue.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                      </span>
                      <div>
                        <div className="font-bold text-sm">
                          {queue.status === 'ACTIVE' ? 'Pause Queue (Take Break)' : 'Resume Queue'}
                        </div>
                        <div className="text-xs opacity-80">
                          {queue.status === 'ACTIVE' 
                            ? 'Temporarily halts queue and notifies waiting customers.' 
                            : 'Queue is currently paused. Click to resume.'}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
"""

content = content.replace("{/* Right: Scan QR / Share Links */}", operator_controls_ui + "\n              {/* Right: Scan QR / Share Links */}")

with open("frontend/src/pages/dashboard/queues/[id]/index.tsx", "w") as f:
    f.write(content)

