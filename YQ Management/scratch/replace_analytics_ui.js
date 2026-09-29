const fs = require('fs');
const path = require('path');

const analyticsPath = path.join(__dirname, '../frontend/src/pages/dashboard/analytics.tsx');
let content = fs.readFileSync(analyticsPath, 'utf-8');

const targetStats = `<div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Customers', value: people.length, icon: Users },
                  { label: 'Total Visits', value: totalVisits, icon: BarChart2 },
                  { label: 'Avg Visits / Customer', value: people.length ? (totalVisits / people.length).toFixed(1) : '0', icon: Clock },
                ].map(({ label, value, icon: Icon }) => (`;

const newStats = `<div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Customers', value: uniqueCustomersCount, icon: Users },
                  { label: 'Total Visits', value: totalVisitsCount, icon: BarChart2 },
                  { label: 'Avg Wait (Mins)', value: avgWaitTime, icon: Clock },
                ].map(({ label, value, icon: Icon }) => (`;

content = content.replace(targetStats, newStats);

const targetToolbar = `              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search name, phone or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant">Sort:</span>
                  {(['visits', 'recent', 'name'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomerSort(s)}
                      className={\`px-3 py-1.5 text-sm rounded-lg font-medium transition-all capitalize \${customerSort === s
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                        }\`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>`;

const newToolbar = `              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search name, phone or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedServiceId}
                    onChange={e => setSelectedServiceId(e.target.value)}
                    className="bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm px-3 py-2 text-on-surface dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="">All Services</option>
                    {services?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <span className="text-sm text-on-surface-variant ml-2">Sort:</span>
                  {(['visits', 'recent', 'name'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomerSort(s)}
                      className={\`px-3 py-1.5 text-sm rounded-lg font-medium transition-all capitalize \${customerSort === s
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                        }\`}
                    >
                      {s === 'visits' ? 'Wait' : s}
                    </button>
                  ))}
                </div>
              </div>`;
content = content.replace(targetToolbar, newToolbar);

const targetTable = `                {isCustomersLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-14 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : people.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-white/[0.02] text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4 text-center">Visits</th>
                          <th className="p-4 text-center">Avg Time</th>
                          <th className="p-4">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-dark-border">
                        {people.map((person: AnyFixMe) => (
                          <tr key={person.id} onClick={() => setSelectedCustomerId(person.id)} className="hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                  {(person.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <p className="font-semibold text-on-surface dark:text-white text-sm">{person.name || 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5">
                                {person.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{person.phone}
                                  </div>
                                )}
                                {person.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{person.email}
                                  </div>
                                )}
                                {!person.phone && !person.email && <span className="text-xs text-on-surface-variant">—</span>}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                                {person.totalVisits}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sm text-on-surface-variant font-medium">{person.avgWaitMinutes}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-on-surface-variant">{person.lastVisitLabel}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (`;

const newTable = `                {isVisitsLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-14 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : filteredVisits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-white/[0.02] text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4">Service</th>
                          <th className="p-4">Location</th>
                          <th className="p-4 text-center">Wait</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Visit Date / Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-dark-border">
                        {filteredVisits.map((visit: AnyFixMe) => {
                          const wMins = computeWaitMins(visit);
                          const sMins = computeServiceMins(visit);
                          return (
                          <tr key={visit.id} onClick={() => visit.customerId ? setSelectedCustomerId(visit.customerId) : null} className="hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                  {(visit.customer?.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <p className="font-semibold text-on-surface dark:text-white text-sm">{visit.customer?.name || 'Walk-in'}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5">
                                {visit.customer?.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{visit.customer.phone}
                                  </div>
                                )}
                                {visit.customer?.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{visit.customer.email}
                                  </div>
                                )}
                                {!visit.customer?.phone && !visit.customer?.email && <span className="text-xs text-on-surface-variant">—</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-medium text-on-surface dark:text-white">{visit.service?.name || '—'}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-on-surface-variant">{visit.location?.name || '—'}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sm text-on-surface-variant font-medium">{wMins > 0 ? \`\${wMins}m\` : '—'}</span>
                            </td>
                            <td className="p-4">
                              <span className={\`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider
                                \${visit.currentState === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                                  ['NO_SHOW', 'CANCELLED'].includes(visit.currentState) ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                }\`}>
                                {visit.currentState.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-on-surface dark:text-white">{new Date(visit.createdAt).toLocaleDateString()}</span>
                                <span className="text-xs text-on-surface-variant">{new Date(visit.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                ) : (`;

content = content.replace(targetTable, newTable);
fs.writeFileSync(analyticsPath, content, 'utf-8');
console.log('Script completed phase 2');
