'use client';

import React, { useState } from 'react';
import { DailyRecord } from '@/types/database';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PerformanceChartProps {
  records: DailyRecord[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ records }) => {
  const [metric, setMetric] = useState<'hd' | 'kg' | 'feed' | 'mortality'>('hd');
  const [days, setDays] = useState<7 | 14 | 30>(14);

  // Format data for chart (oldest to newest)
  const chartData = [...records]
    .reverse()
    .slice(-days)
    .map((r) => ({
      date: r.record_date.slice(5), // MM-DD
      hd: r.hd_percent || 0,
      egg_kg: r.egg_good_kg || 0,
      feed_kg: r.feed_kg || 0,
      fcr: r.fcr || 0,
      mortality: r.mortality_pcs || 0,
    }));

  const metricConfig = {
    hd: { label: 'Hen-Day (%)', dataKey: 'hd', color: '#00684a', gradientId: 'emeraldGrad', unit: '%' },
    kg: { label: 'Telur Utuh (Kg)', dataKey: 'egg_kg', color: '#d97706', gradientId: 'amberGrad', unit: 'kg' },
    mortality: { label: 'Mortalitas (Ekor)', dataKey: 'mortality', color: '#e11d48', gradientId: 'roseGrad', unit: 'ekor' },
  }[metric === 'feed' ? 'hd' : metric];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tren Performa ({days} Hari)</h3>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Visualisasi metrik harian</p>
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe Selector Pills */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${
                  days === d
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}H
              </button>
            ))}
          </div>

          {/* Metric Selector Pills */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['hd', 'kg', 'mortality'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${
                  metric === m
                    ? 'bg-[#00684a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'hd' ? 'HD %' : m === 'kg' ? 'Kg Telur' : 'Mati'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-52 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00684a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00684a" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                borderColor: '#cbd5e1',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                color: '#0f172a',
                fontWeight: 700,
              }}
            />
            <Area
              type="monotone"
              dataKey={metricConfig.dataKey}
              name={metricConfig.label}
              stroke={metricConfig.color === '#10b981' ? '#00684a' : metricConfig.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${metricConfig.gradientId})`}
              dot={{ r: 4, fill: metricConfig.color === '#10b981' ? '#00684a' : metricConfig.color, strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: metricConfig.color === '#10b981' ? '#00684a' : metricConfig.color, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

