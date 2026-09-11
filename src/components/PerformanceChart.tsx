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
  BarChart,
  Bar,
} from 'recharts';

interface PerformanceChartProps {
  records: DailyRecord[];
  timeMode?: '7' | '14' | '30' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  weeklyMortality?: number;
  monthlyMortality?: number;
  totalMortality?: number;
  mortalityRate?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  records,
  timeMode = '14',
  startDate,
  endDate,
  weeklyMortality = 0,
  monthlyMortality = 0,
  totalMortality = 0,
  mortalityRate = 0,
}) => {
  const [metric, setMetric] = useState<'hdp' | 'hhp' | 'kg' | 'mortality'>('hdp');
  const [mortView, setMortView] = useState<'chart' | '7d' | '30d' | 'total'>('chart');

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

  // Mortality summary data for sub-view
  const mortSummary = [
    { label: 'Minggu Ini (7H)', value: weeklyMortality, color: '#f59e0b' },
    { label: 'Bulan Ini (30H)', value: monthlyMortality, color: '#f97316' },
    { label: 'Total Kumulatif', value: totalMortality, color: '#e11d48' },
  ];

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
              onClick={() => { setMetric(m); if (m === 'mortality') setMortView('chart'); }}
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

      {/* Mortality Sub-View Selector (only when mortality selected) */}
      {metric === 'mortality' && (
        <div className="flex gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
          {([
            { key: 'chart' as const, label: 'Grafik Harian' },
            { key: '7d' as const, label: '7 Hari' },
            { key: '30d' as const, label: '30 Hari' },
            { key: 'total' as const, label: 'Kumulatif' },
          ]).map((item) => (
            <button
              key={item.key}
              onClick={() => setMortView(item.key)}
              className={`flex-1 px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                mortView === item.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-56 w-full pt-1">
        {/* Show summary cards for mortality sub-views */}
        {metric === 'mortality' && mortView !== 'chart' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            {mortView === '7d' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kematian 7 Hari Terakhir</span>
                <div className="text-4xl font-black text-rose-600">{weeklyMortality} <span className="text-lg text-slate-400">ekor</span></div>
              </div>
            )}
            {mortView === '30d' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kematian 30 Hari Terakhir</span>
                <div className="text-4xl font-black text-rose-600">{monthlyMortality} <span className="text-lg text-slate-400">ekor</span></div>
              </div>
            )}
            {mortView === 'total' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Kematian Kumulatif</span>
                <div className="text-4xl font-black text-rose-600">{totalMortality} <span className="text-lg text-slate-400">ekor</span></div>
                <span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Tingkat Mortalitas: {mortalityRate}%
                </span>
              </div>
            )}
            {/* Mini summary row below */}
            <div className="grid grid-cols-3 gap-2 w-full mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
              {mortSummary.map((s) => (
                <div key={s.label}>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase">{s.label}</span>
                  <span className="text-xs font-black" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : chartData.length > 0 ? (
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
