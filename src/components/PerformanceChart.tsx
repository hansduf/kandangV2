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

  // Format data for chart (oldest to newest)
  const chartData = [...records]
    .reverse()
    .slice(-14)
    .map((r) => ({
      date: r.record_date.slice(5), // MM-DD
      hd: r.hd_percent || 0,
      egg_kg: r.egg_good_kg || 0,
      feed_kg: r.feed_kg || 0,
      fcr: r.fcr || 0,
      mortality: r.mortality_pcs || 0,
    }));

  const metricConfig = {
    hd: { label: 'Hen-Day (%)', dataKey: 'hd', color: '#10b981', gradientId: 'emeraldGrad', unit: '%' },
    kg: { label: 'Telur Utuh (Kg)', dataKey: 'egg_kg', color: '#f59e0b', gradientId: 'amberGrad', unit: 'kg' },
    feed: { label: 'FCR Pakan', dataKey: 'fcr', color: '#3b82f6', gradientId: 'blueGrad', unit: '' },
    mortality: { label: 'Mortalitas (Ekor)', dataKey: 'mortality', color: '#f43f5e', gradientId: 'roseGrad', unit: 'ekor' },
  }[metric];

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">Tren Performa 14 Hari</h3>
          <p className="text-[11px] font-semibold text-slate-400">Visualisasi metrik harian</p>
        </div>
        
        {/* Metric Selector Pills */}
        <div className="flex gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-700/80">
          {(['hd', 'kg', 'feed', 'mortality'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 text-[10px] font-black rounded-xl transition-all ${
                metric === m
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'hd' ? 'HD %' : m === 'kg' ? 'Kg Telur' : m === 'feed' ? 'FCR' : 'Mati'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                fontSize: '12px',
                color: '#f8fafc',
                fontWeight: 700,
              }}
            />
            <Area
              type="monotone"
              dataKey={metricConfig.dataKey}
              name={metricConfig.label}
              stroke={metricConfig.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${metricConfig.gradientId})`}
              dot={{ r: 4, fill: metricConfig.color, strokeWidth: 2, stroke: '#0f172a' }}
              activeDot={{ r: 7, fill: metricConfig.color, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

