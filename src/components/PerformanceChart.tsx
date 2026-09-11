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
import { Calendar } from 'lucide-react';

interface PerformanceChartProps {
  records: DailyRecord[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ records }) => {
  const [metric, setMetric] = useState<'hdp' | 'hhp' | 'kg' | 'mortality'>('hdp');
  const [timeMode, setTimeMode] = useState<'7' | '14' | '30' | 'all' | 'custom'>('14');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const past7Days = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(past7Days);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter records based on timeframe or date range
  let filteredRecords = [...records].reverse(); // Oldest to newest for chart display

  if (timeMode === '7') {
    filteredRecords = filteredRecords.slice(-7);
  } else if (timeMode === '14') {
    filteredRecords = filteredRecords.slice(-14);
  } else if (timeMode === '30') {
    filteredRecords = filteredRecords.slice(-30);
  } else if (timeMode === 'custom') {
    filteredRecords = filteredRecords.filter(
      (r) => r.record_date >= startDate && r.record_date <= endDate
    );
  }

  // Format data for chart
  const chartData = filteredRecords.map((r) => ({
    date: r.record_date.length >= 10 ? r.record_date.slice(5) : r.record_date,
    fullDate: r.record_date,
    hdp: r.hdp_percent || r.hd_percent || 0,
    hhp: r.hhp_percent || 0,
    egg_kg: r.egg_good_kg || 0,
    feed_kg: r.feed_kg || 0,
    fcr: r.fcr || 0,
    mortality: r.mortality_pcs || 0,
  }));

  const metricConfig = {
    hdp: { label: 'Hen-Day Production (HDP %)', dataKey: 'hdp', color: '#00684a', gradientId: 'emeraldGrad', unit: '%' },
    hhp: { label: 'Hen-Housed Production (HHP %)', dataKey: 'hhp', color: '#d97706', gradientId: 'amberGrad', unit: '%' },
    kg: { label: 'Telur Utuh (Kg)', dataKey: 'egg_kg', color: '#2563eb', gradientId: 'blueGrad', unit: 'kg' },
    mortality: { label: 'Mortalitas (Ekor)', dataKey: 'mortality', color: '#e11d48', gradientId: 'roseGrad', unit: 'ekor' },
  }[metric];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Grafik Performa {timeMode === 'all' ? '(Semua)' : timeMode === 'custom' ? '(Kustom)' : `(${timeMode} Hari)`}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Visualisasi metrik HDP, HHP, Kg & Kematian</p>
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe Selector Pills */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['7', '14', '30', 'all', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeMode(mode)}
                className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${
                  timeMode === mode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'all' ? 'Semua' : mode === 'custom' ? 'Kustom' : `${mode}H`}
              </button>
            ))}
          </div>

          {/* Metric Selector Pills */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['hdp', 'hhp', 'kg', 'mortality'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${
                  metric === m
                    ? 'bg-[#00684a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'hdp' ? 'HDP %' : m === 'hhp' ? 'HHP %' : m === 'kg' ? 'Kg Telur' : 'Mati'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Picker if Custom Mode */}
      {timeMode === 'custom' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-[#00684a]" />
            <span>Rentang Tanggal:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-[#00684a]"
            />
            <span className="text-slate-400 font-black">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:border-[#00684a]"
            />
          </div>
        </div>
      )}

      <div className="h-52 w-full pt-2">
        {chartData.length > 0 ? (
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
