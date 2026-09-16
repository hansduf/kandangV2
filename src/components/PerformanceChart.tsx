'use client';

import React, { useState } from 'react';
import { DailyRecord, Flock } from '@/types/database';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Trophy, BarChart3, TrendingUp } from 'lucide-react';

interface FlockHistoryItem {
  flock: Flock;
  records: DailyRecord[];
}

interface PerformanceChartProps {
  records: DailyRecord[];
  allHistories?: FlockHistoryItem[];
  isAllView?: boolean;
  timeMode?: '7' | '14' | '30' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  weeklyMortality?: number;
  monthlyMortality?: number;
  totalMortality?: number;
  mortalityRate?: number;
  activePopulation?: number;
}

const COOP_COLORS = [
  '#00684a', // Emerald
  '#2563eb', // Blue
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  records,
  allHistories = [],
  isAllView = false,
  timeMode = '14',
  startDate,
  endDate,
  weeklyMortality = 0,
  monthlyMortality = 0,
  totalMortality = 0,
  mortalityRate = 0,
  activePopulation,
}) => {
  // Metrics: pcs (Telur Utuh Butir), bad (Telur Rusak Butir), kg, hdp, hhp, mortality, fcr
  const [metric, setMetric] = useState<'pcs' | 'bad' | 'kg' | 'hdp' | 'hhp' | 'mortality' | 'fcr'>('pcs');
  const [chartMode, setChartMode] = useState<'aggregate' | 'race'>('aggregate');
  const [mortView, setMortView] = useState<'chart' | '7d' | '30d' | 'total'>('chart');
  const [fcrView, setFcrView] = useState<'both' | 'fcr' | 'intake'>('both');

  // Sort single/aggregate records chronologically ascending
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

  // Format data for standard Area Chart
  const chartData = filteredRecords.map((r) => {
    let displayDate = r.record_date;
    if (r.record_date.length >= 10) {
      const parts = r.record_date.split('-');
      if (parts.length === 3) {
        displayDate = `${parts[2]}/${parts[1]}`;
      }
    }

    let totalEggKg = (r.egg_good_kg || 0) + (r.egg_bad_kg || 0);
    if ((r.egg_bad_kg || 0) === 0 && (r.egg_bad_pcs || 0) > 0 && (r.egg_good_pcs || 0) > 0 && (r.egg_good_kg || 0) > 0) {
      totalEggKg += ((r.egg_bad_pcs || 0) * (r.egg_good_kg / r.egg_good_pcs));
    }

    // Determine active population to calculate feed intake
    let pop = activePopulation || (r as any).current_population || 0;
    if (pop <= 0 && allHistories.length > 0) {
      const match = allHistories.find((h) => h.flock.id === (r as any).flock_id);
      if (match) pop = match.flock.current_population;
    }
    const totalEggs = (r.egg_good_pcs || 0) + (r.egg_bad_pcs || 0);
    const hdp = r.hdp_percent !== undefined && r.hdp_percent !== null ? r.hdp_percent : (r.hd_percent || 0);
    if (pop <= 0 && hdp > 0 && totalEggs > 0) {
      pop = Math.round((totalEggs / hdp) * 100);
    }
    if (pop <= 0 && (r.feed_kg || 0) > 0) {
      pop = 1000;
    }

    const calculatedIntake = (r.feed_intake_g && r.feed_intake_g > 0)
      ? r.feed_intake_g
      : (pop > 0 && (r.feed_kg || 0) > 0 ? Number(((r.feed_kg * 1000) / pop).toFixed(1)) : 0);

    return {
      date: displayDate,
      fullDate: r.record_date,
      egg_pcs: r.egg_good_pcs || 0,
      egg_bad_pcs: r.egg_bad_pcs || 0,
      egg_kg: r.egg_good_kg || 0,
      total_egg_kg: Number(totalEggKg.toFixed(2)),
      hdp,
      hhp: r.hhp_percent || 0,
      feed_kg: r.feed_kg || 0,
      feed_intake_g: calculatedIntake,
      fcr: r.fcr || (totalEggKg > 0 && (r.feed_kg || 0) > 0 ? Number(((r.feed_kg || 0) / totalEggKg).toFixed(2)) : 0),
      mortality: r.mortality_pcs || 0,
    };
  });

  // Summary statistics for FCR and Feed Intake over the current period
  const fcrAverages = React.useMemo(() => {
    const validFcr = chartData.filter((d) => d.fcr > 0);
    const avgFcr = validFcr.length > 0
      ? Number((validFcr.reduce((acc, d) => acc + d.fcr, 0) / validFcr.length).toFixed(2))
      : 0;

    const validIntake = chartData.filter((d) => d.feed_intake_g > 0);
    const avgIntake = validIntake.length > 0
      ? Number((validIntake.reduce((acc, d) => acc + d.feed_intake_g, 0) / validIntake.length).toFixed(1))
      : 0;

    const totalFeed = Number(chartData.reduce((acc, d) => acc + (d.feed_kg || 0), 0).toFixed(2));
    const totalEggs = Number(chartData.reduce((acc, d) => acc + (d.total_egg_kg || 0), 0).toFixed(2));

    return { avgFcr, avgIntake, totalFeed, totalEggs };
  }, [chartData]);

  // Prepare Multi-Line Race Data if allHistories is available
  const canShowRace = isAllView && allHistories.length > 1;

  // Collect unique dates across all flocks in the filtered timeframe
  const uniqueDates = Array.from(
    new Set(
      allHistories.flatMap((h) =>
        h.records
          .filter((r) => {
            if (timeMode === 'all') return true;
            if (!startDate || !endDate) return true;
            return r.record_date >= startDate && r.record_date <= endDate;
          })
          .map((r) => r.record_date)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  // Build race dataset per date
  const raceData = uniqueDates.map((d) => {
    let displayDate = d;
    if (d.length >= 10) {
      const parts = d.split('-');
      if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}`;
    }

    const row: any = {
      date: displayDate,
      fullDate: d,
    };

    allHistories.forEach(({ flock, records: fRecs }) => {
      const rec = fRecs.find((r) => r.record_date === d);
      const key = flock.coop_name || flock.name;
      let val = 0;
      if (rec) {
        if (metric === 'pcs') val = rec.egg_good_pcs || 0;
        else if (metric === 'bad') val = rec.egg_bad_pcs || 0;
        else if (metric === 'kg') val = rec.egg_good_kg || 0;
        else if (metric === 'hdp')
          val =
            rec.hdp_percent !== undefined && rec.hdp_percent !== null
              ? rec.hdp_percent
              : rec.hd_percent || 0;
        else if (metric === 'hhp') val = rec.hhp_percent || 0;
        else if (metric === 'mortality') val = rec.mortality_pcs || 0;
        else if (metric === 'fcr') val = rec.fcr || 0;
      }
      row[key] = val;
    });

    return row;
  });

  // Rank summary for race chart
  const raceTotals = allHistories.map(({ flock, records: fRecs }, idx) => {
    const key = flock.coop_name || flock.name;
    const fFiltered = fRecs.filter((r) => {
      if (timeMode === 'all') return true;
      if (!startDate || !endDate) return true;
      return r.record_date >= startDate && r.record_date <= endDate;
    });

    let totalVal = 0;
    if (metric === 'pcs') {
      totalVal = fFiltered.reduce((acc, r) => acc + (r.egg_good_pcs || 0), 0);
    } else if (metric === 'bad') {
      totalVal = fFiltered.reduce((acc, r) => acc + (r.egg_bad_pcs || 0), 0);
    } else if (metric === 'kg') {
      totalVal = Number(fFiltered.reduce((acc, r) => acc + (r.egg_good_kg || 0), 0).toFixed(2));
    } else if (metric === 'hdp') {
      const sum = fFiltered.reduce(
        (acc, r) =>
          acc +
          (r.hdp_percent !== undefined && r.hdp_percent !== null
            ? r.hdp_percent
            : r.hd_percent || 0),
        0
      );
      totalVal = fFiltered.length > 0 ? Number((sum / fFiltered.length).toFixed(1)) : 0;
    } else if (metric === 'hhp') {
      const sum = fFiltered.reduce((acc, r) => acc + (r.hhp_percent || 0), 0);
      totalVal = fFiltered.length > 0 ? Number((sum / fFiltered.length).toFixed(1)) : 0;
    } else if (metric === 'mortality') {
      totalVal = fFiltered.reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
    } else if (metric === 'fcr') {
      const sumFeed = fFiltered.reduce((acc, r) => acc + (r.feed_kg || 0), 0);
      const sumEgg = fFiltered.reduce((acc, r) => {
        let eggKg = (r.egg_good_kg || 0) + (r.egg_bad_kg || 0);
        if ((r.egg_bad_kg || 0) === 0 && (r.egg_bad_pcs || 0) > 0 && (r.egg_good_pcs || 0) > 0 && (r.egg_good_kg || 0) > 0) {
          eggKg += (r.egg_bad_pcs || 0) * (r.egg_good_kg / r.egg_good_pcs);
        }
        return acc + eggKg;
      }, 0);
      totalVal = sumEgg > 0 && sumFeed > 0 ? Number((sumFeed / sumEgg).toFixed(2)) : 0;
    }

    return {
      key,
      flockName: flock.name,
      coopName: flock.coop_name,
      totalVal,
      color: COOP_COLORS[idx % COOP_COLORS.length],
    };
  }).sort((a, b) => {
    if (metric === 'fcr') {
      if (a.totalVal === 0) return 1;
      if (b.totalVal === 0) return -1;
      return a.totalVal - b.totalVal;
    }
    return metric === 'mortality' ? a.totalVal - b.totalVal : b.totalVal - a.totalVal;
  });

  const metricConfig = {
    pcs: {
      label: 'Telur Utuh (Jumlah Butir)',
      shortLabel: 'Butir Utuh',
      dataKey: 'egg_pcs',
      color: '#00684a',
      gradientId: 'emeraldGrad',
      unit: 'btr',
    },
    bad: {
      label: 'Telur Retak / Rusak (Butir)',
      shortLabel: 'Telur Rusak',
      dataKey: 'egg_bad_pcs',
      color: '#d97706',
      gradientId: 'amberGrad',
      unit: 'btr',
    },
    kg: {
      label: 'Telur Utuh (Kg)',
      shortLabel: 'Kg Telur',
      dataKey: 'egg_kg',
      color: '#2563eb',
      gradientId: 'blueGrad',
      unit: 'kg',
    },
    hdp: {
      label: 'Hen-Day Production (HDP %)',
      shortLabel: 'HDP %',
      dataKey: 'hdp',
      color: '#059669',
      gradientId: 'tealGrad',
      unit: '%',
    },
    hhp: {
      label: 'Hen-Housed Production (HHP %)',
      shortLabel: 'HHP %',
      dataKey: 'hhp',
      color: '#7c3aed',
      gradientId: 'purpleGrad',
      unit: '%',
    },
    mortality: {
      label: 'Mortalitas (Ekor)',
      shortLabel: 'Kematian',
      dataKey: 'mortality',
      color: '#e11d48',
      gradientId: 'roseGrad',
      unit: 'ekor',
    },
    fcr: {
      label: 'Feed Conversion Ratio (FCR)',
      shortLabel: 'FCR Pakan',
      dataKey: 'fcr',
      color: '#d97706',
      gradientId: 'amberGrad',
      unit: 'rasio',
    },
  }[metric];

  // Mortality summary data for sub-view
  const mortSummary = [
    { label: 'Minggu Ini (7H)', value: weeklyMortality, color: '#f59e0b' },
    { label: 'Bulan Ini (30H)', value: monthlyMortality, color: '#f97316' },
    { label: 'Total Kumulatif', value: totalMortality, color: '#e11d48' },
  ];

  // Custom Tooltip for Race Chart with Rankings
  const RaceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sorted = [...payload].sort((a, b) => {
        const valA = Number(a.value) || 0;
        const valB = Number(b.value) || 0;
        if (metric === 'fcr') {
          if (valA === 0) return 1;
          if (valB === 0) return -1;
          return valA - valB;
        }
        return valB - valA;
      });
      const medals = ['🥇', '🥈', '🥉'];

      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="text-[11px] font-black text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>📅 {payload[0]?.payload?.fullDate || label}</span>
            <span className="text-[9.5px] font-black text-[#00684a] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Peringkat Harian
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            {sorted.map((entry, idx) => {
              const rankBadge = medals[idx] || `${idx + 1}.`;
              return (
                <div
                  key={entry.dataKey}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] shrink-0">{rankBadge}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-bold text-slate-800 truncate">
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">
                    {entry.value} {metricConfig.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Standard Area Chart (Special FCR Details)
  const AreaChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (metric === 'fcr') {
        const fcrVal = Number(payload[0]?.value) || 0;
        const feedKg = data?.feed_kg || 0;
        const totalEggKg = data?.total_egg_kg || 0;
        const feedIntake = data?.feed_intake_g || 0;
        const eggGoodPcs = data?.egg_pcs || 0;
        const eggBadPcs = data?.egg_bad_pcs || 0;

        return (
          <div className="bg-white border border-amber-200/90 rounded-2xl p-3 shadow-xl text-xs space-y-2 min-w-[210px]">
            <div className="text-[11px] font-black text-slate-800 border-b border-amber-100 pb-1.5 flex items-center justify-between">
              <span>📅 {data?.fullDate || label}</span>
              <span className="text-[9.5px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                FCR &amp; Pakan
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 font-bold">FCR Rasio:</span>
                <span className="text-sm font-black text-amber-600">
                  {fcrVal > 0 ? fcrVal.toFixed(2) : '-'}
                </span>
              </div>
              {feedIntake > 0 && (
                <div className="flex items-center justify-between gap-3 text-slate-700">
                  <span className="font-semibold text-slate-500">Porsi Makan:</span>
                  <span className="font-black text-slate-900">{feedIntake} g/ekor/hari</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-slate-700">
                <span className="font-semibold text-slate-500">Total Pakan:</span>
                <span className="font-black text-slate-900">{feedKg} kg</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-700">
                <span className="font-semibold text-slate-500">Total Telur:</span>
                <span className="font-black text-slate-900">{totalEggKg} kg</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium text-right">
                ({eggGoodPcs} utuh + {eggBadPcs} retak)
              </div>
            </div>
          </div>
        );
      }

      // Default metric tooltip
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xl text-xs space-y-1 min-w-[150px]">
          <div className="text-[11px] font-black text-slate-700 border-b border-slate-100 pb-1">
            📅 {data?.fullDate || label}
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="font-bold text-slate-600">{metricConfig.label}:</span>
            <span className="font-black text-slate-900">
              {payload[0]?.value} {metricConfig.unit}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3 shadow-sm">
      {/* Top Header: Title & Chart Mode Selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#00684a]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {chartMode === 'race' ? 'Grafik Balapan Antar Kandang' : 'Grafik Tren Performa'}
            </h3>
          </div>
          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">
            {chartMode === 'race'
              ? 'Perbandingan multi-kandang langsung: amati siapa yang memimpin'
              : 'Visualisasi lengkap Butir Utuh, Rusak, Kg, HDP, & Kematian'}
          </p>
        </div>

        {/* View Mode Toggle: Total Farm vs Balapan Antar Kandang (only in All Coops view) */}
        {canShowRace && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('aggregate')}
              className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg transition-all flex items-center gap-1 ${
                chartMode === 'aggregate'
                  ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Gabungan Farm</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('race')}
              className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg transition-all flex items-center gap-1 ${
                chartMode === 'race'
                  ? 'bg-[#00684a] text-white shadow-xs scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Balapan Kandang</span>
            </button>
          </div>
        )}
      </div>

      {/* Metric Selector Pills (Butir Utuh, Telur Rusak, Kg Telur, HDP %, HHP %, Kematian, FCR) */}
      <div className="flex items-center gap-1.5 flex-wrap py-0.5">
        {(
          [
            { id: 'pcs' as const, label: '🥚 Butir Utuh' },
            { id: 'bad' as const, label: '💔 Telur Rusak' },
            { id: 'kg' as const, label: '⚖️ Kg Telur' },
            { id: 'hdp' as const, label: '📈 HDP %' },
            { id: 'hhp' as const, label: '📊 HHP %' },
            { id: 'mortality' as const, label: '💀 Kematian' },
            { id: 'fcr' as const, label: '🌾 FCR & Porsi Makan' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMetric(m.id);
              if (m.id === 'mortality') setMortView('chart');
            }}
            className={`px-3 py-1.5 text-[10px] sm:text-[11px] font-black rounded-xl transition-all whitespace-nowrap border ${
              metric === m.id
                ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs scale-[1.02]'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* FCR & Feed Intake Sub-View Selector (only when fcr selected and not in race mode) */}
      {metric === 'fcr' && chartMode === 'aggregate' && (
        <div className="space-y-2">
          <div className="flex gap-1 bg-amber-50/90 p-1 rounded-xl border border-amber-200">
            {[
              { key: 'both' as const, label: '📊 Dual (FCR & Porsi Makan)' },
              { key: 'fcr' as const, label: '🌾 FCR Rasio Saja' },
              { key: 'intake' as const, label: '🥣 Porsi Makan (g/ekor) Saja' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFcrView(item.key)}
                className={`flex-1 px-2 py-1 text-[10px] font-black rounded-lg transition-all ${
                  fcrView === item.key
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Quick Summary Pill Bar: Avg FCR, Avg Feed Intake, Total Feed */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="block text-[8px] font-bold text-slate-500 uppercase">Rata-Rata FCR</span>
              <span className="text-xs font-black text-amber-600">
                {fcrAverages.avgFcr > 0 ? fcrAverages.avgFcr : '-'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-500 uppercase">Rata-Rata Porsi</span>
              <span className="text-xs font-black text-emerald-600">
                {fcrAverages.avgIntake > 0 ? `${fcrAverages.avgIntake} g/ekor` : '-'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-500 uppercase">Total Pakan</span>
              <span className="text-xs font-black text-slate-800">
                {fcrAverages.totalFeed > 0 ? `${fcrAverages.totalFeed} kg` : '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mortality Sub-View Selector (only when mortality selected and not in race mode) */}
      {metric === 'mortality' && chartMode === 'aggregate' && (
        <div className="flex gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
          {[
            { key: 'chart' as const, label: 'Grafik Harian' },
            { key: '7d' as const, label: '7 Hari' },
            { key: '30d' as const, label: '30 Hari' },
            { key: 'total' as const, label: 'Kumulatif' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
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

      {/* Chart Canvas Area */}
      <div className="h-64 sm:h-72 w-full pt-1">
        {metric === 'mortality' && chartMode === 'aggregate' && mortView !== 'chart' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            {mortView === '7d' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Kematian 7 Hari Terakhir
                </span>
                <div className="text-4xl font-black text-rose-600">
                  {weeklyMortality} <span className="text-lg text-slate-400">ekor</span>
                </div>
              </div>
            )}
            {mortView === '30d' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Kematian 30 Hari Terakhir
                </span>
                <div className="text-4xl font-black text-rose-600">
                  {monthlyMortality} <span className="text-lg text-slate-400">ekor</span>
                </div>
              </div>
            )}
            {mortView === 'total' && (
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Total Kematian Kumulatif
                </span>
                <div className="text-4xl font-black text-rose-600">
                  {totalMortality} <span className="text-lg text-slate-400">ekor</span>
                </div>
                <span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Tingkat Mortalitas: {mortalityRate}%
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 w-full mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
              {mortSummary.map((s) => (
                <div key={s.label}>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase">
                    {s.label}
                  </span>
                  <span className="text-xs font-black" style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : chartMode === 'race' && raceData.length > 0 ? (
          /* Multi-Line Race Chart (Balapan Antar Kandang) */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={raceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<RaceTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: 10,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              />
              {allHistories.map(({ flock }, idx) => {
                const key = flock.coop_name || flock.name;
                const color = COOP_COLORS[idx % COOP_COLORS.length];
                return (
                  <Line
                    key={flock.id}
                    type="monotone"
                    dataKey={key}
                    name={flock.coop_name}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: color, stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : chartData.length > 0 ? (
          /* Standard Area Chart */
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
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              {metric === 'fcr' && fcrView === 'both' ? (
                <>
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#d97706', fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#059669', fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    unit="g"
                  />
                  <Tooltip content={<AreaChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: 6 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="fcr"
                    name="🌾 FCR (Rasio)"
                    stroke="#d97706"
                    strokeWidth={3}
                    fillOpacity={0.6}
                    fill="url(#amberGrad)"
                    dot={{ r: 3.5, fill: '#d97706', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="feed_intake_g"
                    name="🥣 Porsi Makan (g/ekor)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </>
              ) : metric === 'fcr' && fcrView === 'intake' ? (
                <>
                  <YAxis
                    tick={{ fontSize: 10, fill: '#059669', fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    unit="g"
                  />
                  <Tooltip content={<AreaChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="feed_intake_g"
                    name="🥣 Porsi Makan (g/ekor/hari)"
                    stroke="#059669"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#tealGrad)"
                    dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </>
              ) : (
                <>
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<AreaChartTooltip />} />
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
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
            Belum ada data grafik untuk periode ini.
          </div>
        )}
      </div>

      {/* Race Standings Bar (Displayed when in Race Mode) */}
      {chartMode === 'race' && raceTotals.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-wider">
            <span className="flex items-center gap-1 text-[#00684a]">
              <Trophy className="w-3.5 h-3.5" />
              <span>Klasemen {metricConfig.shortLabel} (Periode Ini)</span>
            </span>
            <span>{raceTotals.length} Kandang</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {raceTotals.map((item, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div
                  key={item.key}
                  className="bg-white border border-slate-200 px-2 py-1 rounded-xl flex items-center gap-1.5 text-[11px] shadow-2xs"
                >
                  <span className="text-xs">{medals[idx] || `#${idx + 1}`}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-slate-800">{item.coopName}:</span>
                  <span className="font-black text-slate-900">
                    {item.totalVal.toLocaleString('id-ID')} {metricConfig.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
