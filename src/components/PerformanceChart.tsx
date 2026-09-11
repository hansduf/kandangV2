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
  timeMode?: '7' | '14' | '30' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  records,
  timeMode = '14',
  startDate,
  endDate,
}) => {
  const [metric, setMetric] = useState<'hdp' | 'hhp' | 'kg' | 'mortality'>('hdp');

  // Ensure records are sorted chronologically ascending (oldest to newest) for chart display
  const sortedRecords = [...records].sort((a, b) => a.record_date.localeCompare(b.record_date));

  // Filter records based on timeMode or custom date range if needed
  let filteredRecords = sortedRecords;

  if (timeMode === '7') {
    filteredRecords = sortedRecords.slice(-7);
  } else if (timeMode === '14') {
    filteredRecords = sortedRecords.slice(-14);
  } else if (timeMode === '30') {
    filteredRecords = sortedRecords.slice(-30);
  } else if (timeMode === 'custom' && startDate && endDate) {
    filteredRecords = sortedRecords.filter(
      (r) => r.record_date >= startDate && r.record_date <= endDate
    );
  }

  // Format data for chart
  const chartData = filteredRecords.map((r) => {
    // Format date string for XAxis (e.g. 2026-09-11 -> 11/09)
    let displayDate = r.record_date;
    if (r.record_date.length >= 10) {
      const parts = r.record_date.split('-');
      if (parts.length === 3) {
        displayDate = `${parts[2]}/${parts[1]}`;
      }
    }

    return {
      date: displayDate,
      fullDate: r.record_date,
      hdp: r.hdp_percent !== undefined && r.hdp_percent !== null ? r.hdp_percent : (r.hd_percent || 0),
      hhp: r.hhp_percent || 0,
      egg_kg: r.egg_good_kg || 0,
      feed_kg: r.feed_kg || 0,
      fcr: r.fcr || 0,
      mortality: r.mortality_pcs || 0,
    };
  });

  const metricConfig = {
    hdp: { label: 'Hen-Day Production (HDP %)', dataKey: 'hdp', color: '#00684a', gradientId: 'emeraldGrad', unit: '%' },
    hhp: { label: 'Hen-Housed Production (HHP %)', dataKey: 'hhp', color: '#d97706', gradientId: 'amberGrad', unit: '%' },
    kg: { label: 'Telur Utuh (Kg)', dataKey: 'egg_kg', color: '#2563eb', gradientId: 'blueGrad', unit: 'kg' },
    mortality: { label: 'Mortalitas (Ekor)', dataKey: 'mortality', color: '#e11d48', gradientId: 'roseGrad', unit: 'ekor' },
  }[metric];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-sm">
      {/* Metric Selector Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Grafik Tren Performa
          </h3>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Visualisasi metrik HDP, HHP, Kg & Kematian</p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['hdp', 'hhp', 'kg', 'mortality'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg transition-all ${
                metric === m
                  ? 'bg-[#00684a] text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {m === 'hdp' ? 'HDP %' : m === 'hhp' ? 'HHP %' : m === 'kg' ? 'Kg Telur' : 'Kematian'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 w-full pt-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00684a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00684a" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} />
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
                formatter={(val: any) => [`${val} ${metricConfig.unit}`, metricConfig.label]}
                labelFormatter={(lbl: any, payload: any) => payload?.[0]?.payload?.fullDate || lbl}
              />
              <Area
                type="monotone"
                dataKey={metricConfig.dataKey}
                name={metricConfig.label}
                stroke={metricConfig.color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${metricConfig.gradientId})`}
                dot={{ r: 4, fill: metricConfig.color, strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7, fill: metricConfig.color, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
            Belum ada data grafik untuk periode ini.
          </div>
        )}
      </div>
    </div>
  );
};
