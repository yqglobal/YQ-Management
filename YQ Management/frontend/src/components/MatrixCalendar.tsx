import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const hr = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const ampm = hr < 12 ? 'AM' : 'PM';
  const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${displayHr.toString().padStart(2, '0')}:${min} ${ampm}`;
});

export function MatrixCalendar({ 
  appointments = [], 
  services = [], 
  currentDate = new Date(),
  onReschedule
}: { 
  appointments: any[], 
  services?: any[], 
  currentDate?: Date,
  onReschedule?: (apt: any, newTime: Date, serviceId: string | null) => void
}) {
  const [now, setNow] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (now && currentDate.toDateString() === now.toDateString() && scrollRef.current && !hasScrolledRef.current) {
      const currentPixels = 256 + Math.max(0, (now.getHours() + (now.getMinutes() / 60)) * 240);
      // scroll to center the needle approximately
      scrollRef.current.scrollTo({ left: Math.max(0, currentPixels - 400), behavior: 'smooth' });
      hasScrolledRef.current = true;
    }
  }, [now, currentDate]);
  
  // Base 12:00 AM (midnight) = 0px. Each hour is 240px (120px per 30 min)
  const getApptStyle = (apt: any, index: number, allAppts: any[]) => {
    const dateStr = apt.scheduledTime || apt.createdAt;
    if (!dateStr) return { left: '8px', width: '224px', top: '12px' };
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    const hourOffset = hours + (minutes / 60);
    const leftPx = Math.max(8, hourOffset * 240 + 8);
    
    let overlapCount = 0;
    for (let i = 0; i < index; i++) {
      const otherApt = allAppts[i];
      const otherDate = new Date(otherApt.scheduledTime || otherApt.createdAt);
      const otherHours = otherDate.getHours();
      const otherMinutes = otherDate.getMinutes();
      const otherHourOffset = otherHours + (otherMinutes / 60);
      
      if (Math.abs(otherHourOffset - hourOffset) < 0.5) {
        overlapCount++;
      }
    }
    
    const topPx = 12 + (overlapCount * (76 + 8)); // 76px height + 8px gap
    
    return { left: `${leftPx}px`, width: '224px', top: `${topPx}px` };
  };

  const apptsByService = new Map<string, any[]>();
  const unassignedAppts: any[] = [];

  appointments.forEach(apt => {
    if (apt.serviceId) {
      if (!apptsByService.has(apt.serviceId)) {
        apptsByService.set(apt.serviceId, []);
      }
      apptsByService.get(apt.serviceId)!.push(apt);
    } else {
      unassignedAppts.push(apt);
    }
  });

  const rows = [
    ...services.map(s => ({
      id: s.id,
      name: s.name,
      type: 'Service',
      initials: s.name.substring(0, 2).toUpperCase(),
      appointments: apptsByService.get(s.id) || []
    })),
    ...(unassignedAppts.length > 0 || services.length === 0 ? [{
      id: 'unassigned',
      name: services.length === 0 ? 'General Queue' : 'Unassigned',
      type: services.length === 0 ? 'Default Resource' : 'General',
      initials: services.length === 0 ? 'GQ' : 'UN',
      appointments: unassignedAppts
    }] : [])
  ];

  return (
    <div className="bg-card dark:bg-dark-card rounded-[2rem] border border-border dark:border-dark-border shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="sticky top-0 z-20 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-border dark:border-dark-border" style={{ display: 'grid', gridTemplateColumns: '256px repeat(48, 120px)' }}>
          <div className="sticky left-0 z-30 bg-card/95 dark:bg-dark-card/95 backdrop-blur-sm border-r border-border dark:border-dark-border p-4 flex items-end">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{format(currentDate, 'MMM d, yyyy')}</span>
          </div>
          
          {TIMES.map((time) => (
            <div key={time} className="p-4 border-r border-border border-dashed font-data-mono text-body-sm text-on-surface-variant flex flex-col justify-end relative">
              {time}
            </div>
          ))}
        </div>

        <div className="relative min-w-max">
          {/* Current time indicator - only show if currentDate is today */}
          {now && now.toDateString() === currentDate.toDateString() && (
            <div className="absolute top-0 bottom-0 w-px bg-rose-500 z-20 pointer-events-none" 
                 style={{ left: `${256 + Math.max(0, (now.getHours() + (now.getMinutes() / 60)) * 240)}px` }}>
              <div className="w-3 h-3 bg-rose-500 rounded-full absolute -top-1.5 -left-1.5 shadow-[0_0_8px_rgba(243,24,96,0.8)]"></div>
            </div>
          )}
          
          {rows.map((row) => {
            let maxOverlaps = 0;
            row.appointments.forEach((apt, index) => {
              let overlapCount = 0;
              const dateStr = apt.scheduledTime || apt.createdAt;
              if (!dateStr) return;
              const date = new Date(dateStr);
              const hourOffset = date.getHours() + (date.getMinutes() / 60);
              for (let i = 0; i < index; i++) {
                const otherApt = row.appointments[i];
                const otherDate = new Date(otherApt.scheduledTime || otherApt.createdAt);
                const otherHourOffset = otherDate.getHours() + (otherDate.getMinutes() / 60);
                if (Math.abs(otherHourOffset - hourOffset) < 0.5) {
                  overlapCount++;
                }
              }
              if (overlapCount > maxOverlaps) {
                maxOverlaps = overlapCount;
              }
            });
            
            const minRowHeight = Math.max(100, 12 + ((maxOverlaps + 1) * (76 + 8)));

            return (
              <div key={row.id} className="border-b border-border dark:border-dark-border group" style={{ display: 'grid', gridTemplateColumns: '256px repeat(48, 120px)', minHeight: `${minRowHeight}px` }}>
                <div className="sticky left-0 z-10 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border p-4 flex items-center group-hover:bg-surface-container-low dark:group-hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold text-sm">
                      {row.initials}
                    </div>
                    <div>
                      <h3 className="font-body-md font-semibold text-on-surface dark:text-white truncate max-w-[160px]">{row.name}</h3>
                      <span className="font-label-caps text-on-surface-variant">{row.type}</span>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="relative" 
                  style={{ gridColumn: 'span 48' }}
                  onDragOver={(e) => {
                    if (onReschedule) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (!onReschedule) return;
                    e.preventDefault();
                    const aptData = e.dataTransfer.getData('application/json');
                    if (!aptData) return;
                    const apt = JSON.parse(aptData);
                    
                    const rowRect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rowRect.left;
                    
                    const hoursOffset = x / 240;
                    const snappedHours = Math.round(hoursOffset * 4) / 4;
                    
                    const newTime = new Date(currentDate);
                    newTime.setHours(0, 0, 0, 0);
                    newTime.setMinutes(snappedHours * 60);

                    onReschedule(apt, newTime, row.id === 'unassigned' ? null : row.id);
                  }}
                >
                  <div className="border-l border-border border-dashed opacity-20 pointer-events-none w-full h-full absolute z-0"></div>
                  
                  {now && now.toDateString() === currentDate.toDateString() && (
                    <div 
                      className="absolute top-0 bottom-0 bg-zinc-500/10 z-0 pointer-events-none" 
                      style={{ left: '0px', width: `${Math.max(0, (now.getHours() + (now.getMinutes() / 60)) * 240)}px` }}
                    ></div>
                  )}

                  <div className="relative w-full h-full z-10">
                    {row.appointments.map((apt: any, i: number) => {
                      const style = getApptStyle(apt, i, row.appointments);
                      return (
                        <button 
                          key={apt.id || i} 
                          style={style} 
                          draggable={!!onReschedule && apt._type === 'Appointment'}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify(apt));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`absolute h-[76px] rounded-xl p-3 flex flex-col justify-between items-start transition-shadow focus:outline-none focus:ring-2 min-h-[44px] ${apt._type === 'Appointment' ? 'bg-sky-50 border border-sky-200 hover:shadow-md focus:ring-sky-500 cursor-move' : 'bg-emerald-50 border border-emerald-200 hover:shadow-md focus:ring-emerald-500 cursor-default'}`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className={`w-1 h-3 rounded-full ${apt._type === 'Appointment' ? 'bg-sky-500' : 'bg-emerald-500'}`}></div>
                            <span className={`font-label-caps text-label-caps ${apt._type === 'Appointment' ? 'text-sky-800' : 'text-emerald-800'}`}>{apt._type === 'Appointment' ? 'Appt' : 'Walk-in'} #{apt.id?.substring(0,4) || i+1}</span>
                          </div>
                          <span className={`font-body-sm truncate w-full text-left ${apt._type === 'Appointment' ? 'text-sky-900' : 'text-emerald-900'}`}>{apt.customer?.name || apt.customerName || 'Walk-in'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
