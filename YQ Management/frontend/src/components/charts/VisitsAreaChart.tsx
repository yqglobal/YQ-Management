import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function VisitsAreaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1571ff" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#1571ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.4} />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#707881' }} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#707881' }} />
        <Tooltip
          isAnimationActive={false}
          contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '10px' }}
          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
          labelStyle={{ color: '#a1a1aa' }}
          cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area type="monotone" dataKey="visits" stroke="#1571ff" strokeWidth={2.5} fill="url(#colorVisits)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
