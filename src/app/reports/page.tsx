'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { PerformanceChart } from '@/components/PerformanceChart';
import {
  fetchFlocks,
  fetchDashboardSummary,
  fetchDailyHistory,
  createFlock,
  saveDailyRecord,
  saveHealthRecord,
} from '@/lib/supabase';
import { Flock, DashboardSummary, DailyRecord, HealthRecord } from '@/types/database';
import {
  BarChart3,
  Download,
  Egg,
  Skull,
  TrendingUp,
  Layers,
  Award,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function ReportsPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [summaries, setSummaries] = useState<DashboardSummary[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [selectedHistory, setSelectedHistory] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<'hdp' | 'eggs_today' | 'pop' | 'mortality'>('hdp');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeFlockId) {
      loadFlockHistory(activeFlockId);
    }
  }, [activeFlockId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const flockList = await fetchFlocks();
      setFlocks(flockList);

      if (flockList.length > 0) {
        if (!activeFlockId) {
          setActiveFlockId(flockList[0].id);
        }

        // Concurrently fetch summaries for all flocks
        const sumList = await Promise.all(
          flockList.map(async (f) => {
            try {
              return await fetchDashboardSummary(f.id);
            } catch (err) {
              console.error(`Error loading summary for flock ${f.id}:`, err);
              return null;
            }
          })
        );

        const validSummaries = sumList.filter(Boolean) as DashboardSummary[];
        setSummaries(validSummaries);
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlockHistory = async (flockId: string) => {
    try {
      const hist = await fetchDailyHistory(flockId, 30);
      setSelectedHistory(hist);
    } catch (err) {
      console.error('Error loading flock history:', err);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    await loadAllData();
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    await loadAllData();
    if (activeFlockId) await loadFlockHistory(activeFlockId);
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    await loadAllData();
    if (activeFlockId) await loadFlockHistory(activeFlockId);
  };

  // AGGREGATE CALCULATIONS ACROSS ALL FLOCKS
  const farmAggregates = useMemo(() => {
    let totalActivePop = 0;
    let totalInitialPop = 0;
    let todayEggPcs = 0;
    let todayEggKg = 0;
    let todayEggBadPcs = 0;
    let todayMortality = 0;
    let cumEggPcs = 0;
    let cumEggKg = 0;
    let cumMortality = 0;
    let cumWeeklyMort = 0;
    let cumMonthlyMort = 0;
    let cumFeedKg = 0;

    summaries.forEach((s) => {
      totalActivePop += s.flock.current_population || 0;
      totalInitialPop += s.flock.initial_population || s.flock.current_population || 0;
      todayEggPcs += s.today.egg_good_pcs || 0;
      todayEggKg += s.today.egg_good_kg || 0;
      todayEggBadPcs += s.today.egg_bad_pcs || 0;
      todayMortality += s.today.mortality_pcs || 0;
      cumEggPcs += s.totals.total_egg_good_pcs || 0;
      cumEggKg += s.totals.total_egg_good_kg || 0;
      cumMortality += s.totals.total_mortality || 0;
      cumWeeklyMort += s.totals.weekly_mortality || 0;
      cumMonthlyMort += s.totals.monthly_mortality || 0;
      cumFeedKg += s.totals.total_feed_kg || 0;
    });

    const todayFarmHdp = totalActivePop > 0 ? Number(((todayEggPcs / totalActivePop) * 100).toFixed(2)) : 0;
    const todayFarmHhp = totalInitialPop > 0 ? Number(((todayEggPcs / totalInitialPop) * 100).toFixed(2)) : 0;
    const farmMortRate = totalInitialPop > 0 ? Number(((cumMortality / totalInitialPop) * 100).toFixed(2)) : 0;
    const farmFCR = cumEggKg > 0 ? Number((cumFeedKg / cumEggKg).toFixed(2)) : 0;

    return {
      totalActivePop,
      totalInitialPop,
      todayEggPcs,
      todayEggKg: Number(todayEggKg.toFixed(2)),
      todayEggBadPcs,
      todayMortality,
      todayFarmHdp,
      todayFarmHhp,
      cumEggPcs,
      cumEggKg: Number(cumEggKg.toFixed(2)),
      cumMortality,
      cumWeeklyMort,
      cumMonthlyMort,
      farmMortRate,
      cumFeedKg: Number(cumFeedKg.toFixed(2)),
      farmFCR,
    };
  }, [summaries]);

  // LEADERBOARDS
  const bestHdpFlock = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort((a, b) => {
      const hdpA = a.today.hdp_percent || a.today.hd_percent || 0;
      const hdpB = b.today.hdp_percent || b.today.hd_percent || 0;
      return hdpB - hdpA;
    })[0];
  }, [summaries]);

  const highestProductionFlock = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort(
      (a, b) => (b.totals.total_egg_good_pcs || 0) - (a.totals.total_egg_good_pcs || 0)
    )[0];
  }, [summaries]);

  const lowestMortalityFlock = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort(
      (a, b) => (a.totals.mortality_rate_percent || 0) - (b.totals.mortality_rate_percent || 0)
    )[0];
  }, [summaries]);

  // CHART DATA: Comparison Bar Chart
  const comparisonChartData = useMemo(() => {
    return summaries.map((s) => ({
      name: `${s.flock.coop_name} (${s.flock.name})`,
      shortName: s.flock.coop_name,
      hdp: s.today.hdp_percent || s.today.hd_percent || 0,
      eggs_today: s.today.egg_good_pcs || 0,
      pop: s.flock.current_population || 0,
      mortality: s.totals.total_mortality || 0,
      cumEggs: s.totals.total_egg_good_pcs || 0,
    }));
  }, [summaries]);

  // EXPORT ALL FLOCKS COMPARISON CSV
  const exportMultiCoopCSV = () => {
    if (summaries.length === 0) return;
    const headers = [
      'Kandang',
      'Nama Angkatan',
      'Strain',
      'Umur (Mgg)',
      'Populasi Aktif',
      'Populasi Awal',
      'HDP Hari Ini (%)',
      'HHP Hari Ini (%)',
      'Telur Utuh Hari Ini (Btr)',
      'Telur Utuh Hari Ini (Kg)',
      'Telur Retak Hari Ini (Btr)',
      'Mati Hari Ini (Ekor)',
      'Rata-rata HDP Kumulatif (%)',
      'Total Telur Kumulatif (Btr)',
      'Total Telur Kumulatif (Kg)',
      'Total Mati Kumulatif (Ekor)',
      'Tingkat Mortalitas (%)',
      'Total Pakan (Kg)',
      'FCR Kumulatif',
      'Status'
    ];

    const rows = summaries.map((s) => [
      s.flock.coop_name,
      `"${s.flock.name}"`,
      s.flock.strain,
      s.flock.age_weeks,
      s.flock.current_population,
      s.flock.initial_population,
      s.today.hdp_percent || s.today.hd_percent || 0,
      s.today.hhp_percent || 0,
      s.today.egg_good_pcs,
      s.today.egg_good_kg,
      s.today.egg_bad_pcs,
      s.today.mortality_pcs,
      s.totals.overall_hdp_percent || s.totals.overall_hd_percent || 0,
      s.totals.total_egg_good_pcs,
      s.totals.total_egg_good_kg,
      s.totals.total_mortality,
      s.totals.mortality_rate_percent,
      s.totals.total_feed_kg,
      s.totals.overall_fcr,
      s.flock.status,
    ]);

    // Add aggregate total row
    rows.push([
      'TOTAL / RATA-RATA FARM',
      '-',
      '-',
      '-',
      farmAggregates.totalActivePop,
      farmAggregates.totalInitialPop,
      farmAggregates.todayFarmHdp,
      farmAggregates.todayFarmHhp,
      farmAggregates.todayEggPcs,
      farmAggregates.todayEggKg,
      farmAggregates.todayEggBadPcs,
      farmAggregates.todayMortality,
      '-',
      farmAggregates.cumEggPcs,
      farmAggregates.cumEggKg,
      farmAggregates.cumMortality,
      farmAggregates.farmMortRate,
      farmAggregates.cumFeedKg,
      farmAggregates.farmFCR,
      'Active'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Komparasi_Semua_Kandang_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFlockSummary = summaries.find((s) => s.flock.id === activeFlockId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <Navbar onOpenNewFlockModal={() => setIsModalOpen(true)} />

      <main className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-3 py-3.5 sm:px-4 sm:py-4 space-y-4">
        {/* HEADER SECTION */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Analitik & Komparasi Seluruh Kandang
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Perbandingan performa komparatif multi-kandang & data farm
              </p>
            </div>
          </div>

          <button
            onClick={exportMultiCoopCSV}
            className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all ml-auto"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Ekspor CSV Semua Kandang</span>
          </button>
        </div>

        {/* 1. AGGREGATE TOTALS (RINGKASAN FARM SELURUHNYA) */}
        <div className="bg-gradient-to-br from-[#00684a] via-[#03593f] to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/15 pb-2.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                Agregat Farm
              </span>
              <span className="text-xs font-bold text-emerald-100">
                {flocks.length} Kandang Terdaftar
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-200">
              Populasi Total: {farmAggregates.totalActivePop.toLocaleString('id-ID')} / {farmAggregates.totalInitialPop.toLocaleString('id-ID')} ekor
            </span>
          </div>

          {/* Aggregate Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rata2 HDP Hari Ini</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.todayFarmHdp}%
              </div>
              <span className="text-[10px] text-emerald-100/80 font-semibold">
                HHP: {farmAggregates.todayFarmHhp}%
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-amber-200 text-[10px] font-black uppercase tracking-wider">
                <Egg className="w-3.5 h-3.5" />
                <span>Telur Utuh Hari Ini</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.todayEggPcs.toLocaleString('id-ID')} <span className="text-xs text-amber-200">btr</span>
              </div>
              <span className="text-[10px] text-amber-100/80 font-semibold">
                {farmAggregates.todayEggKg} kg total
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-rose-200 text-[10px] font-black uppercase tracking-wider">
                <Skull className="w-3.5 h-3.5" />
                <span>Kematian Farm</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.todayMortality} <span className="text-xs text-rose-200">hari ini</span>
              </div>
              <span className="text-[10px] text-rose-100/80 font-semibold">
                Total: {farmAggregates.cumMortality} ({farmAggregates.farmMortRate}%)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-blue-200 text-[10px] font-black uppercase tracking-wider">
                <Egg className="w-3.5 h-3.5" />
                <span>Total Telur Kumulatif</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.cumEggPcs.toLocaleString('id-ID')} <span className="text-xs text-blue-200">btr</span>
              </div>
              <span className="text-[10px] text-blue-100/80 font-semibold">
                {farmAggregates.cumEggKg.toLocaleString('id-ID')} kg
              </span>
            </div>
          </div>
        </div>

        {/* 2. LEADERBOARDS & BEST PERFORMERS */}
        {summaries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Best HDP */}
            <div className="bg-white p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  HDP Tertinggi Hari Ini
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  {bestHdpFlock?.flock.coop_name} ({bestHdpFlock?.flock.name})
                </span>
                <span className="text-xs font-extrabold text-[#00684a]">
                  {bestHdpFlock?.today.hdp_percent || bestHdpFlock?.today.hd_percent || 0}% HDP
                </span>
              </div>
            </div>

            {/* Highest Production */}
            <div className="bg-white p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <Egg className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Produksi Telur Terbanyak
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  {highestProductionFlock?.flock.coop_name} ({highestProductionFlock?.flock.name})
                </span>
                <span className="text-xs font-extrabold text-amber-600">
                  {highestProductionFlock?.totals.total_egg_good_pcs.toLocaleString('id-ID')} butir
                </span>
              </div>
            </div>

            {/* Healthiest / Lowest Mortality */}
            <div className="bg-white p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Kandang Tersehat
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  {lowestMortalityFlock?.flock.coop_name} ({lowestMortalityFlock?.flock.name})
                </span>
                <span className="text-xs font-extrabold text-purple-600">
                  Mortalitas {lowestMortalityFlock?.totals.mortality_rate_percent || 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. VISUAL COMPARISON BAR CHART */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Grafik Komparasi Antar Kandang
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                Visualisasi perbandingan metrik kunci seluruh kandang secara berdampingan
              </p>
            </div>

            {/* Metric Selector Pills */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { key: 'hdp' as const, label: 'HDP % Hari Ini' },
                  { key: 'eggs_today' as const, label: 'Telur Hari Ini (Btr)' },
                  { key: 'pop' as const, label: 'Populasi' },
                  { key: 'mortality' as const, label: 'Total Mati' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg transition-all ${
                    chartMetric === m.key
                      ? 'bg-[#00684a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            {comparisonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    unit={chartMetric === 'hdp' ? '%' : ''}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs font-bold shadow-xl border border-slate-800 space-y-1">
                            <div className="font-black text-emerald-300">{data.name}</div>
                            <div>HDP Hari Ini: <strong className="text-white">{data.hdp}%</strong></div>
                            <div>Telur Hari Ini: <strong className="text-white">{data.eggs_today} btr</strong></div>
                            <div>Populasi: <strong className="text-white">{data.pop} ekor</strong></div>
                            <div>Total Mati: <strong className="text-rose-400">{data.mortality} ekor</strong></div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={chartMetric}
                    radius={[8, 8, 0, 0]}
                    fill="#00684a"
                  >
                    {comparisonChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          chartMetric === 'hdp'
                            ? '#00684a'
                            : chartMetric === 'eggs_today'
                            ? '#d97706'
                            : chartMetric === 'pop'
                            ? '#2563eb'
                            : '#e11d48'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                Belum ada data kandang untuk dikomparasi.
              </div>
            )}
          </div>
        </div>

        {/* 4. TABEL KOMPARASI LENGKAP HEAD-TO-HEAD SEMUA KANDANG */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Tabel Komparasi Lengkap Semua Kandang
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                Detail komparatif akurat per kandang & agregat farm
              </p>
            </div>
            <span className="text-[10px] font-black bg-emerald-50 text-[#00684a] px-2.5 py-1 rounded-lg border border-emerald-200">
              {summaries.length} Kandang
            </span>
          </div>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase bg-slate-50/70">
                  <th className="py-2.5 px-2">Kandang</th>
                  <th className="py-2.5 px-2">Strain / Umur</th>
                  <th className="py-2.5 px-2 text-center">Populasi (Aktif/Awal)</th>
                  <th className="py-2.5 px-2 text-center">HDP Hari Ini</th>
                  <th className="py-2.5 px-2 text-center">Telur Hari Ini</th>
                  <th className="py-2.5 px-2 text-center">Retak</th>
                  <th className="py-2.5 px-2 text-center">Rata2 HDP Kum.</th>
                  <th className="py-2.5 px-2 text-center">Kumulatif Telur</th>
                  <th className="py-2.5 px-2 text-right">Kematian (Rate %)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {summaries.map((s) => {
                  const hdpToday = s.today.hdp_percent || s.today.hd_percent || 0;
                  const isGoodHdp = hdpToday >= 80;
                  const isSelected = s.flock.id === activeFlockId;

                  return (
                    <tr
                      key={s.flock.id}
                      onClick={() => setActiveFlockId(s.flock.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>{s.flock.coop_name}</span>
                          <span className="text-[10px] font-bold text-slate-400">({s.flock.name})</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00684a]" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[11px] text-slate-600">
                        <div>{s.flock.strain}</div>
                        <div className="text-[10px] text-slate-400">{s.flock.age_weeks} Mgg</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="font-black text-slate-900">
                          {s.flock.current_population} <span className="text-[10px] text-slate-400">/ {s.flock.initial_population}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-black text-[11px] border ${
                            isGoodHdp
                              ? 'bg-emerald-50 text-[#00684a] border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {hdpToday}%
                        </span>
                        <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                          HHP: {s.today.hhp_percent || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="font-extrabold text-slate-900">{s.today.egg_good_pcs} btr</div>
                        <div className="text-[10px] text-emerald-700 font-bold">{s.today.egg_good_kg} kg</div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-amber-700">
                        {s.today.egg_bad_pcs} btr
                      </td>
                      <td className="py-3 px-2 text-center font-extrabold text-[#00684a]">
                        {s.totals.overall_hdp_percent || s.totals.overall_hd_percent || 0}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="font-black text-slate-900">
                          {s.totals.total_egg_good_pcs.toLocaleString('id-ID')} btr
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          {s.totals.total_egg_good_kg.toLocaleString('id-ID')} kg
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="font-black text-rose-600">
                          {s.totals.total_mortality} ekor
                        </div>
                        <div className="text-[10px] font-bold text-rose-500">
                          {s.totals.mortality_rate_percent || 0}%
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL / AGREGATE ROW */}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-2 uppercase tracking-wider text-[11px] text-[#00684a]">
                    Total Farm
                  </td>
                  <td className="py-3 px-2 text-[10px] text-slate-500">
                    {flocks.length} Kandang
                  </td>
                  <td className="py-3 px-2 text-center font-black">
                    {farmAggregates.totalActivePop.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500">/ {farmAggregates.totalInitialPop.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[11px] font-black">
                      {farmAggregates.todayFarmHdp}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="font-black">{farmAggregates.todayEggPcs.toLocaleString('id-ID')} btr</div>
                    <div className="text-[10px] text-emerald-700 font-bold">{farmAggregates.todayEggKg} kg</div>
                  </td>
                  <td className="py-3 px-2 text-center text-amber-700 font-black">
                    {farmAggregates.todayEggBadPcs} btr
                  </td>
                  <td className="py-3 px-2 text-center text-slate-500 font-bold">-</td>
                  <td className="py-3 px-2 text-center">
                    <div className="font-black">{farmAggregates.cumEggPcs.toLocaleString('id-ID')} btr</div>
                    <div className="text-[10px] text-slate-600 font-bold">{farmAggregates.cumEggKg.toLocaleString('id-ID')} kg</div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-black text-rose-600">{farmAggregates.cumMortality} ekor</div>
                    <div className="text-[10px] text-rose-500 font-bold">{farmAggregates.farmMortRate}%</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. DEEP DIVE: DETAIL & RIWAYAT KANDANG INDIVIDUAL */}
        {activeFlockSummary && (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#00684a] text-white text-[10px] font-black px-2.5 py-1 rounded-xl">
                  {activeFlockSummary.flock.coop_name}
                </span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Detail & Tren Kandang: {activeFlockSummary.flock.name}
                </h3>
              </div>

              {/* Coop Selector Pills for quick switch */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {flocks.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFlockId(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      f.id === activeFlockId
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.coop_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Chart of selected flock */}
            <PerformanceChart
              records={selectedHistory}
              weeklyMortality={activeFlockSummary.totals.weekly_mortality}
              monthlyMortality={activeFlockSummary.totals.monthly_mortality}
              totalMortality={activeFlockSummary.totals.total_mortality}
              mortalityRate={activeFlockSummary.totals.mortality_rate_percent}
            />

            {/* Recent Daily Records Table for this flock */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                    <th className="py-2 px-1">Tanggal</th>
                    <th className="py-2 px-1">Telur Utuh</th>
                    <th className="py-2 px-1 text-center">Retak</th>
                    <th className="py-2 px-1 text-center">HDP %</th>
                    <th className="py-2 px-1 text-center">HHP %</th>
                    <th className="py-2 px-1 text-right">Mati</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {selectedHistory.slice(0, 10).map((r) => (
                    <tr key={r.record_date} className="hover:bg-slate-50">
                      <td className="py-2.5 px-1 font-black text-slate-900">{r.record_date}</td>
                      <td className="py-2.5 px-1">
                        <div className="font-extrabold text-[#00684a]">{r.egg_good_pcs} btr</div>
                        <div className="text-[10px] text-slate-500 font-bold">{r.egg_good_kg} kg</div>
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-amber-700">{r.egg_bad_pcs} btr</td>
                      <td className="py-2.5 px-1 text-center font-black text-[#00684a]">
                        {r.hdp_percent !== undefined && r.hdp_percent !== null ? r.hdp_percent : (r.hd_percent || 0)}%
                      </td>
                      <td className="py-2.5 px-1 text-center font-bold text-amber-600">
                        {r.hhp_percent || 0}%
                      </td>
                      <td className="py-2.5 px-1 text-right font-black text-rose-600">{r.mortality_pcs}</td>
                    </tr>
                  ))}
                  {selectedHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-slate-400 text-xs font-semibold">
                        Belum ada catatan harian untuk kandang ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <BottomNav onOpenQuickInput={() => setIsQuickInputOpen(true)} />

      <QuickInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onSaveDaily={handleSaveDaily}
        onSaveHealth={handleSaveHealth}
      />

      <FlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}
