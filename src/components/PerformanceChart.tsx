'use client';

import React, { useState } from 'react';
import { DailyRecord } from '@/types/database';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
    hd: { label: 'Hen-Day (%)', dataKey: 'hd', color: '#059669', unit: '%' },
    kg: { label: 'Telur Utuh (Kg)', dataKey: 'egg_kg', color: '#d97706', unit: 'kg' },
    feed: { label: 'FCR Pakan', dataKey: 'fcr', color: '#2563eb', unit: '' },
    mortality: { label: 'Mortalitas (Ekor)', dataKey: 'mortality', color: '#e11d48', unit: 'ekor' },
  }[metric];

  return (
    <div className="stat-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Grafik Performa 14 Hari</h3>
        
        {/* Metric Selector Pills */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['hd', 'kg', 'feed', 'mortality'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                metric === m ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m === 'hd' ? 'HD %' : m === 'kg' ? 'Kg Telur' : m === 'feed' ? 'FCR' : 'Mati'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                borderColor: '#e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
            <Line
              type="monotone"
              dataKey={metricConfig.dataKey}
              name={metricConfig.label}
              stroke={metricConfig.color}
              strokeWidth={3}
              dot={{ r: 4, fill: metricConfig.color }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
