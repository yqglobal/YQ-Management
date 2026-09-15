import { format } from 'date-fns-tz';
const date = new Date('2024-09-15T08:11:00Z');
console.log('H:', format(date, 'H', { timeZone: 'Asia/Kolkata' }));
console.log('yyyy-MM-dd:', format(date, 'yyyy-MM-dd', { timeZone: 'Asia/Kolkata' }));
