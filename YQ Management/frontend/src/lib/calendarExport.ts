/**
 * Generates and downloads an iCalendar (.ics) file for an appointment.
 * Works seamlessly across Apple Calendar, Google Calendar, Outlook, and mobile devices.
 */
export function downloadIcsCalendar({
  title,
  description,
  location,
  startDate,
  durationMinutes = 30,
}: {
  title: string;
  description: string;
  location?: string;
  startDate: Date | string;
  durationMinutes?: number;
}) {
  if (typeof window === 'undefined') return;

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return;
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const formatUtc = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Qmova//Appointment Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substring(2, 9)}@qmova.com`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    location ? `LOCATION:${location.replace(/[,;]/g, ' ')}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder for your appointment',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([icsLines.join('\r\n')], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `${title.replace(/[^a-zA-Z0-9]/g, '_')}_appointment.ics`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
