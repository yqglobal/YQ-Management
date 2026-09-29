const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/dashboard/service-desk.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '{/* ── SECTION: ARRIVED / ACTIVE NOW ──────────────────────────── */}';
const endMarker = '{/* Column 3: Visitor/Patient Context Panel */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const replacement = `{/* ── SECTION: UNIFIED TIMELINE (SQUEEZE) ──────────────────────────── */}
            {displayTimeline.length > 0 && (
              <AnimatePresence mode="popLayout">
                {displayTimeline.map((v: AnyFixMe) => {
                  const isAppt = v.source === 'APPOINTMENT' || (v.scheduledTime && !v.isToken);
                  const isUpcoming = v.currentState === 'SCHEDULED' && !v.checkInTime;
                  const waitTimeMs = v.waitingStart ? Date.now() - new Date(v.waitingStart).getTime() : 0;
                  const waitTimeMins = Math.floor(waitTimeMs / 60000);
                  const threshold = tenant?.reviewWaitThresholdMins || 15;
                  const isUrgent = !isUpcoming && waitTimeMins > threshold;
                  const slotTime = v.scheduledTime ? new Date(v.scheduledTime) : null;
                  const minsUntil = slotTime ? Math.round((slotTime.getTime() - Date.now()) / 60000) : null;

                  const chipField = industry.visitCard.primaryChipField;
                  let chipValue: string | null = null;
                  let chipLabel: string | null = industry.visitCard.primaryChipLabel;
                  if (chipField === DYNAMIC_CHIP_SENTINEL) {
                    const entries = Object.entries(v.formResponses || {}).filter(([, val]) => val && String(val).trim() !== '');
                    if (entries.length > 0) {
                      const [firstKey, firstVal] = entries[0];
                      chipValue = String(firstVal);
                      chipLabel = firstKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()).trim();
                    }
                  } else if (chipField) {
                    chipValue = v.formResponses?.[chipField] ?? null;
                  }
                  const hasItinerary = industry.uiFlags.showItinerary && Array.isArray(v.itinerary) && v.itinerary.length > 0;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: isUpcoming ? 0.8 : 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      key={v.id}
                      onClick={() => setSelectedVisit(v)}
                      className={\`bg-card dark:bg-dark-card border \${
                        selectedVisit?.id === v.id ? 'border-primary' : isAppt ? (isUpcoming ? 'border-sky-200/60 dark:border-sky-900/40' : 'border-sky-200 dark:border-sky-900/50') : 'border-border dark:border-dark-border'
                      } rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer\`}
                    >
                      {/* Left accent bar: blue for appointment, amber/red for walk-in */}
                      <div className={\`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl \${
                        isAppt ? (isUpcoming ? 'bg-sky-400/50' : 'bg-sky-500') : isUrgent ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500'
                      }\`}></div>

                      <div className="flex items-center justify-between pl-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={\`font-data-mono text-data-mono \${isUrgent && !isAppt ? 'text-alert' : 'text-on-surface dark:text-white'}\`}>
                              {v.ticketNumber || v.displayId || \`#\${v.id.substring(0,6)}\`}
                            </span>

                            {/* Type Badge */}
                            {isAppt ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">calendar_month</span>
                                APT {v.scheduledTime ? \`• \${new Date(v.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">directions_walk</span>
                                WALK-IN
                              </span>
                            )}

                            {!isAppt && isUrgent && <span className="font-label-caps text-[10px] bg-alert/10 text-alert px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{industry.visitCard.urgencyLabel || 'Urgent'}</span>}
                            {v.priority > 0 && <span className="font-label-caps text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">VIP</span>}
                            
                            {(() => {
                              if (!isAppt || !industry.uiFlags.highlightArrivalStatus) return null;
                              if (!slotTime || !v.waitingStart) return null;
                              const diffMins = (new Date(v.waitingStart).getTime() - slotTime.getTime()) / 60000;
                              if (diffMins < -15) return <span className="font-label-caps text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Early</span>;
                              if (diffMins > 15) return <span className="font-label-caps text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Late</span>;
                              return null;
                            })()}
                            
                            {industry.uiFlags.showPrivacyBadge && <span className="font-label-caps text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-0.5"><span className="material-symbols-outlined text-[9px]">lock</span>PHI</span>}
                            {v.slaStatus === 'WARNING' && <span className="font-label-caps text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">SLA Warning</span>}
                            {v.slaStatus === 'BREACHED' && <span className="font-label-caps text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">SLA Breach</span>}
                            {v.currentState === 'PENDING_PAYMENT' && <span className="font-label-caps text-[10px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Unpaid</span>}
                          </div>
                          <h3 className="font-semibold text-body-lg text-on-surface dark:text-white">{v.customer?.name || industry.terminology.walkIn}</h3>
                          <div className="flex items-center gap-2 text-outline text-body-sm mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">{isAppt ? 'calendar_today' : 'directions_walk'}</span>
                            <span>{v.service?.name || industry.terminology.service}</span>
                          </div>

                          {chipValue && (
                            <div className={\`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit \${industry.accentBg} \${industry.accentText} border border-current/20\`}>
                              <span className="material-symbols-outlined text-[12px]">{industry.visitCard.primaryChipIcon}</span>
                              <span className="truncate max-w-[150px]">{chipLabel ? \`\${chipLabel}: \` : ''}{chipValue}</span>
                            </div>
                          )}
                          {industry.uiFlags.showGuestCount && v.accompanyingGuests > 0 && (
                            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit bg-surface-container text-outline border border-border">
                              <span className="material-symbols-outlined text-[12px]">group</span>
                              <span>+{v.accompanyingGuests} accompanying</span>
                            </div>
                          )}
                          {hasItinerary && <ItineraryProgress itinerary={v.itinerary} />}
                        </div>

                        <div className="flex flex-col items-end gap-3 ml-3 shrink-0">
                          {isUpcoming ? (
                            <>
                              {minsUntil !== null && (
                                <div className="text-xs font-data-mono text-sky-600 dark:text-sky-400 font-semibold">
                                  {minsUntil > 0 ? \`in \${minsUntil}m\` : \`\${Math.abs(minsUntil)}m ago\`}
                                </div>
                              )}
                              <div className="text-[10px] text-outline mt-1">Not arrived</div>
                            </>
                          ) : (
                            <>
                              <div className={\`flex items-center gap-1.5 font-data-mono text-body-md font-semibold \${!isAppt && isUrgent ? 'text-alert' : 'text-outline'}\`}>
                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                {waitTimeMins}m
                              </div>
                              
                              {v.currentState === 'PENDING_PAYMENT' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVisit(v);
                                  }}
                                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium text-body-sm h-[36px] flex items-center gap-2 transition-colors shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[18px]">payments</span>
                                  Pay
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => handleStart(v.id, e, v.isToken)}
                                  className={\`\${
                                    v.isToken ? 'bg-zinc-600 hover:bg-zinc-700' : isAppt ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                  } text-white px-4 py-2 rounded-lg font-medium text-body-sm h-[36px] flex items-center gap-2 transition-colors shadow-sm\`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                                  {v.isToken ? 'Queued' : industry.terminology.actionVerb}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf-8');
console.log("Successfully replaced unified timeline section.");
