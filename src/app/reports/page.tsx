'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { PerformanceChart } from '@/components/PerformanceChart';
import { DailyCalendarCard } from '@/components/DailyCalendarCard';
import {
  fetchFlocks,
  fetchDashboardSummary,
  fetchDailyHistory,
  fetchHealthRecords,
  createFlock,
  saveDailyRecord,
  saveFeedRecord,
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
  Calendar,
} from 'lucide-react';

interface FlockHistoryItem {
  flock: Flock;
  records: DailyRecord[];
}

export default function ReportsPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [summaries, setSummaries] = useState<DashboardSummary[]>([]);
  const [allHistories, setAllHistories] = useState<FlockHistoryItem[]>([]);
  const [allHealthRecords, setAllHealthRecords] = useState<HealthRecord[]>([]);
  const [viewFlockId, setViewFlockId] = useState<string>('all'); // 'all' or flock.id
  const [loading, setLoading] = useState(true);

  // Timeframe Filter State for Analytics Page
  const [timeMode, setTimeMode] = useState<'7' | '14' | '30' | 'all' | 'custom'>('7');
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStart7 = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStart7);
  const [endDate, setEndDate] = useState(todayStr);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

  // Update date boundaries when timeMode changes
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setEndDate(today);
    if (timeMode === '7') {
      const d = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (timeMode === '14') {
      const d = new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (timeMode === '30') {
      const d = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
      setStartDate(d);
    }
  }, [timeMode]);

  // Human-readable Indonesian label for selected timeframe
  const periodLabel = useMemo(() => {
    if (timeMode === 'all') return 'Semua Waktu';
    if (!startDate || !endDate) return 'Periode';

    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];

    if (startDate === endDate) {
      return `${start.getDate()} ${monthNames[start.getMonth()]}`;
    }
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]}`;
    }
    return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;
  }, [timeMode, startDate, endDate]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const flockList = await fetchFlocks();
      setFlocks(flockList);

      if (flockList.length > 0) {
        // Concurrently fetch summaries, histories (365 days for flexible filtering), and health records
        const [sumList, histList, healthList] = await Promise.all([
          Promise.all(
            flockList.map(async (f) => {
              try {
                return await fetchDashboardSummary(f.id);
              } catch (err) {
                console.error(`Error loading summary for flock ${f.id}:`, err);
                return null;
              }
            })
          ),
          Promise.all(
            flockList.map(async (f) => {
              try {
                const recs = await fetchDailyHistory(f.id, 365);
                return { flock: f, records: recs };
              } catch (err) {
                console.error(`Error loading history for flock ${f.id}:`, err);
                return { flock: f, records: [] };
              }
            })
          ),
          Promise.all(
            flockList.map(async (f) => {
              try {
                const recs = await fetchHealthRecords(f.id);
                return recs.map((r) => ({
                  ...r,
                  coop_name: f.coop_name,
                  flock_name: f.name,
                }));
              } catch (err) {
                console.error(`Error loading health for flock ${f.id}:`, err);
                return [];
              }
            })
          ),
        ]);

        const validSummaries = sumList.filter(Boolean) as DashboardSummary[];
        setSummaries(validSummaries);
        setAllHistories(histList);
        setAllHealthRecords(healthList.flat());
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    await loadAllData();
    setViewFlockId(newFlock.id);
    return newFlock;
  };

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    await loadAllData();
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    await loadAllData();
  };

  const handleSaveFeed = async (record: { flock_id: string; record_date: string; feed_morning_kg?: number; feed_afternoon_kg?: number; feed_kg: number; notes?: string }) => {
    await saveFeedRecord(record);
    await loadAllData();
  };

  // 1. DYNAMIC PERIOD METRICS PER FLOCK (ADAPTS TO SELECTED TIMEFRAME)
  const flockPeriodList = useMemo(() => {
    return flocks.map((flock) => {
      const allRecs = allHistories.find((h) => h.flock.id === flock.id)?.records || [];
      const filteredRecs = allRecs.filter((r) => {
        if (timeMode === 'all') return true;
        if (!startDate || !endDate) return true;
        return r.record_date >= startDate && r.record_date <= endDate;
      });

      const period_egg_good_pcs = filteredRecs.reduce((acc, r) => acc + (r.egg_good_pcs || 0), 0);
      const period_egg_good_kg = Number(
        filteredRecs.reduce((acc, r) => acc + (r.egg_good_kg || 0), 0).toFixed(2)
      );
      const period_egg_bad_pcs = filteredRecs.reduce((acc, r) => acc + (r.egg_bad_pcs || 0), 0);
      const period_mortality_pcs = filteredRecs.reduce((acc, r) => acc + (r.mortality_pcs || 0), 0);
      const period_feed_kg = Number(
        filteredRecs.reduce((acc, r) => acc + (r.feed_kg || 0), 0).toFixed(2)
      );

      // Calculate average daily HDP in this period
      let period_avg_hdp = 0;
      if (filteredRecs.length > 0) {
        const sumHdp = filteredRecs.reduce((acc, r) => {
          const val =
            r.hdp_percent !== undefined && r.hdp_percent !== null
              ? r.hdp_percent
              : r.hd_percent || 0;
          return acc + val;
        }, 0);
        period_avg_hdp = Number((sumHdp / filteredRecs.length).toFixed(1));
      } else if (flock.current_population > 0 && (period_egg_good_pcs + period_egg_bad_pcs) > 0) {
        period_avg_hdp = Number(
          (((period_egg_good_pcs + period_egg_bad_pcs) / flock.current_population) * 100).toFixed(1)
        );
      }

      let period_avg_hhp = 0;
      if (filteredRecs.length > 0) {
        const sumHhp = filteredRecs.reduce((acc, r) => acc + (r.hhp_percent || 0), 0);
        period_avg_hhp = Number((sumHhp / filteredRecs.length).toFixed(1));
      }

      const summary = summaries.find((s) => s.flock.id === flock.id);

      return {
        flock,
        summary,
        records: filteredRecs,
        period_egg_good_pcs,
        period_egg_good_kg,
        period_egg_bad_pcs,
        period_mortality_pcs,
        period_feed_kg,
        period_avg_hdp,
        period_avg_hhp,
        records_count: filteredRecs.length,
      };
    });
  }, [flocks, allHistories, summaries, timeMode, startDate, endDate]);

  // 2. AGGREGATE STATS (ALL-TIME AND DYNAMIC PERIOD)
  const farmAggregates = useMemo(() => {
    let totalActivePop = 0;
    let totalInitialPop = 0;
    let cumEggPcs = 0;
    let cumEggKg = 0;
    let cumMortality = 0;
    let cumWeeklyMort = 0;
    let cumMonthlyMort = 0;
    let cumFeedKg = 0;

    summaries.forEach((s) => {
      totalActivePop += s.flock.current_population || 0;
      totalInitialPop += s.flock.initial_population || s.flock.current_population || 0;
      cumEggPcs += s.totals.total_egg_good_pcs || 0;
      cumEggKg += s.totals.total_egg_good_kg || 0;
      cumMortality += s.totals.total_mortality || 0;
      cumWeeklyMort += s.totals.weekly_mortality || 0;
      cumMonthlyMort += s.totals.monthly_mortality || 0;
      cumFeedKg += s.totals.total_feed_kg || 0;
    });

    const farmMortRate =
      totalInitialPop > 0 ? Number(((cumMortality / totalInitialPop) * 100).toFixed(2)) : 0;
    const farmFCR = cumEggKg > 0 ? Number((cumFeedKg / cumEggKg).toFixed(2)) : 0;

    // Period sums across all coops
    let periodEggPcs = 0;
    let periodEggKg = 0;
    let periodEggBadPcs = 0;
    let periodMortality = 0;
    let periodFeedKg = 0;
    let totalHdpSum = 0;
    let totalHdpCount = 0;
    let totalHhpSum = 0;

    flockPeriodList.forEach((item) => {
      periodEggPcs += item.period_egg_good_pcs;
      periodEggKg += item.period_egg_good_kg;
      periodEggBadPcs += item.period_egg_bad_pcs;
      periodMortality += item.period_mortality_pcs;
      periodFeedKg += item.period_feed_kg;
      if (item.period_avg_hdp > 0) {
        totalHdpSum += item.period_avg_hdp;
        totalHdpCount += 1;
      }
      if (item.period_avg_hhp > 0) {
        totalHhpSum += item.period_avg_hhp;
      }
    });

    const periodFarmAvgHdp =
      totalHdpCount > 0 ? Number((totalHdpSum / totalHdpCount).toFixed(1)) : 0;
    const periodFarmAvgHhp =
      totalHdpCount > 0 ? Number((totalHhpSum / totalHdpCount).toFixed(1)) : 0;

    return {
      totalActivePop,
      totalInitialPop,
      cumEggPcs,
      cumEggKg: Number(cumEggKg.toFixed(2)),
      cumMortality,
      cumWeeklyMort,
      cumMonthlyMort,
      farmMortRate,
      cumFeedKg: Number(cumFeedKg.toFixed(2)),
      farmFCR,
      // Dynamic period metrics:
      periodEggPcs,
      periodEggKg: Number(periodEggKg.toFixed(2)),
      periodEggBadPcs,
      periodMortality,
      periodFeedKg: Number(periodFeedKg.toFixed(2)),
      periodFarmAvgHdp,
      periodFarmAvgHhp,
    };
  }, [summaries, flockPeriodList]);

  // 3. UNIFIED FARM DAILY HISTORY (ALL FLOCKS COMBINED BY DATE)
  const farmDailyHistory = useMemo(() => {
    const dateMap = new Map<
      string,
      {
        record_date: string;
        egg_good_pcs: number;
        egg_good_kg: number;
        egg_bad_pcs: number;
        egg_bad_kg: number;
        mortality_pcs: number;
        culling_pcs: number;
        feed_kg: number;
        pop_sum: number;
        initial_pop_sum: number;
        coops: {
          coop_name: string;
          flock_name: string;
          egg_good_pcs: number;
          egg_good_kg: number;
          egg_bad_pcs: number;
          hdp_percent: number;
          mortality_pcs: number;
        }[];
      }
    >();

    allHistories.forEach(({ flock, records }) => {
      records.forEach((r) => {
        const existing = dateMap.get(r.record_date) || {
          record_date: r.record_date,
          egg_good_pcs: 0,
          egg_good_kg: 0,
          egg_bad_pcs: 0,
          egg_bad_kg: 0,
          mortality_pcs: 0,
          culling_pcs: 0,
          feed_kg: 0,
          pop_sum: 0,
          initial_pop_sum: 0,
          coops: [],
        };

        existing.egg_good_pcs += r.egg_good_pcs || 0;
        existing.egg_good_kg = Number((existing.egg_good_kg + (r.egg_good_kg || 0)).toFixed(2));
        existing.egg_bad_pcs += r.egg_bad_pcs || 0;
        existing.egg_bad_kg = Number((existing.egg_bad_kg + (r.egg_bad_kg || 0)).toFixed(2));
        existing.mortality_pcs += r.mortality_pcs || 0;
        existing.culling_pcs += r.culling_pcs || 0;
        existing.feed_kg = Number((existing.feed_kg + (r.feed_kg || 0)).toFixed(2));
        existing.pop_sum += flock.current_population || 0;
        existing.initial_pop_sum += flock.initial_population || flock.current_population || 0;

        existing.coops.push({
          coop_name: flock.coop_name,
          flock_name: flock.name,
          egg_good_pcs: r.egg_good_pcs || 0,
          egg_good_kg: r.egg_good_kg || 0,
          egg_bad_pcs: r.egg_bad_pcs || 0,
          hdp_percent:
            r.hdp_percent !== undefined && r.hdp_percent !== null
              ? r.hdp_percent
              : r.hd_percent || 0,
          mortality_pcs: r.mortality_pcs || 0,
        });

        dateMap.set(r.record_date, existing);
      });
    });

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((date) => {
      const item = dateMap.get(date)!;
      const totalProducedPcs = (item.egg_good_pcs || 0) + (item.egg_bad_pcs || 0);
      const hdp =
        item.pop_sum > 0 ? Number(((totalProducedPcs / item.pop_sum) * 100).toFixed(2)) : 0;
      const hhp =
        item.initial_pop_sum > 0
          ? Number(((totalProducedPcs / item.initial_pop_sum) * 100).toFixed(2))
          : 0;

      return {
        record_date: item.record_date,
        flock_id: 'all',
        egg_good_pcs: item.egg_good_pcs,
        egg_good_kg: item.egg_good_kg,
        egg_bad_pcs: item.egg_bad_pcs,
        egg_bad_kg: item.egg_bad_kg,
        mortality_pcs: item.mortality_pcs,
        culling_pcs: item.culling_pcs,
        feed_kg: item.feed_kg,
        hd_percent: hdp,
        hdp_percent: hdp,
        hhp_percent: hhp,
        fcr: item.egg_good_kg > 0 ? Number((item.feed_kg / item.egg_good_kg).toFixed(2)) : 0,
        notes: '',
        coops: item.coops,
      } as DailyRecord & { coops: typeof item.coops };
    });
  }, [allHistories]);

  // Active records & summary based on selected view ('all' or specific flock)
  const isAllView = viewFlockId === 'all';
  const activeFlockSummary = summaries.find((s) => s.flock.id === viewFlockId);
  const activeSingleHistory = allHistories.find((h) => h.flock.id === viewFlockId)?.records || [];

  const rawDisplayedRecords = isAllView ? farmDailyHistory : activeSingleHistory;

  // Filter daily records according to the selected timeframe
  const displayedRecords = useMemo(() => {
    if (timeMode === 'all') return rawDisplayedRecords;
    if (!startDate || !endDate) return rawDisplayedRecords;
    return rawDisplayedRecords.filter(
      (r) => r.record_date >= startDate && r.record_date <= endDate
    );
  }, [rawDisplayedRecords, timeMode, startDate, endDate]);

  const displayedWeeklyMort = isAllView
    ? farmAggregates.cumWeeklyMort
    : activeFlockSummary?.totals.weekly_mortality;
  const displayedMonthlyMort = isAllView
    ? farmAggregates.cumMonthlyMort
    : activeFlockSummary?.totals.monthly_mortality;
  const displayedTotalMort = isAllView
    ? farmAggregates.cumMortality
    : activeFlockSummary?.totals.total_mortality;
  const displayedMortRate = isAllView
    ? farmAggregates.farmMortRate
    : activeFlockSummary?.totals.mortality_rate_percent;

  // EXPORT ALL COOP CSV (INCLUDES DYNAMIC PERIOD METRICS)
  const exportMultiCoopCSV = () => {
    if (flockPeriodList.length === 0) return;
    const headers = [
      'Kandang',
      'Nama Angkatan',
      'Strain',
      'Umur (Mgg)',
      'Populasi Aktif',
      'Populasi Awal',
      `HDP Periode (${periodLabel}) %`,
      `Telur Periode (${periodLabel}) Btr`,
      `Telur Periode (${periodLabel}) Kg`,
      `Mati Periode (${periodLabel}) Ekor`,
      'Rata2 HDP Kumulatif (%)',
      'Total Telur Kumulatif (Btr)',
      'Total Telur Kumulatif (Kg)',
      'Total Mati Kumulatif (Ekor)',
      'Tingkat Mortalitas Kumulatif (%)',
      'Total Pakan (Kg)',
      'FCR Kumulatif',
      'Status',
    ];

    const rows = flockPeriodList.map((p) => [
      p.flock.coop_name,
      `"${p.flock.name}"`,
      p.flock.strain,
      p.flock.age_weeks,
      p.flock.current_population,
      p.flock.initial_population,
      p.period_avg_hdp,
      p.period_egg_good_pcs,
      p.period_egg_good_kg,
      p.period_mortality_pcs,
      p.summary?.totals.overall_hdp_percent || p.summary?.totals.overall_hd_percent || 0,
      p.summary?.totals.total_egg_good_pcs || 0,
      p.summary?.totals.total_egg_good_kg || 0,
      p.summary?.totals.total_mortality || 0,
      p.summary?.totals.mortality_rate_percent || 0,
      p.summary?.totals.total_feed_kg || 0,
      p.summary?.totals.overall_fcr || 0,
      p.flock.status,
    ]);

    // Add aggregate total row
    rows.push([
      'TOTAL / RATA-RATA FARM',
      '-',
      '-',
      '-',
      farmAggregates.totalActivePop,
      farmAggregates.totalInitialPop,
      farmAggregates.periodFarmAvgHdp,
      farmAggregates.periodEggPcs,
      farmAggregates.periodEggKg,
      farmAggregates.periodMortality,
      '-',
      farmAggregates.cumEggPcs,
      farmAggregates.cumEggKg,
      farmAggregates.cumMortality,
      farmAggregates.farmMortRate,
      farmAggregates.cumFeedKg,
      farmAggregates.farmFCR,
      'Active',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Komparasi_Kandang_${periodLabel.replace(/\s+/g, '_')}_${todayStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                Laporan terpadu semua kandang, gabungan farm & data komparatif
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

        {/* GLOBAL TIMEFRAME SELECTOR BAR FOR ANALYTICS */}
        <div className="bg-white p-3 border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00684a]" />
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Time Frame Periode
                </h3>
                <span className="bg-emerald-50 text-[#00684a] border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {periodLabel}
                </span>
              </div>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['7', '14', '30', 'all', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTimeMode(mode)}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-lg transition-all ${
                    timeMode === mode
                      ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {mode === 'all' ? 'Semua' : mode === 'custom' ? 'Kustom' : `${mode} Hari`}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Picker if Custom Mode */}
          {timeMode === 'custom' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in duration-200 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-[#00684a]" />
                <span>Rentang Tanggal Kustom:</span>
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
        </div>

        {/* 1. AGGREGATE TOTALS (RINGKASAN FARM MENYESUAIKAN TIMEFRAME) */}
        <div className="bg-gradient-to-br from-[#00684a] via-[#03593f] to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/15 pb-2.5 relative z-10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                Agregat Farm
              </span>
              <span className="text-xs font-bold text-emerald-100">
                {flocks.length} Kandang Terdaftar
              </span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 font-bold px-2 py-0.5 rounded-md border border-emerald-400/20">
                Periode: {periodLabel}
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-200">
              Populasi Total: {farmAggregates.totalActivePop.toLocaleString('id-ID')} /{' '}
              {farmAggregates.totalInitialPop.toLocaleString('id-ID')} ekor
            </span>
          </div>

          {/* Aggregate Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 relative z-10">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rata2 HDP ({periodLabel})</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.periodFarmAvgHdp}%
              </div>
              <span className="text-[10px] text-emerald-100/80 font-semibold">
                HHP: {farmAggregates.periodFarmAvgHhp}%
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-amber-200 text-[10px] font-black uppercase tracking-wider">
                <Egg className="w-3.5 h-3.5" />
                <span>Telur Utuh ({periodLabel})</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.periodEggPcs.toLocaleString('id-ID')}{' '}
                <span className="text-xs text-amber-200">btr</span>
              </div>
              <span className="text-[10px] text-amber-100/80 font-semibold">
                {farmAggregates.periodEggKg} kg total
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-rose-200 text-[10px] font-black uppercase tracking-wider">
                <Skull className="w-3.5 h-3.5" />
                <span>Kematian ({periodLabel})</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.periodMortality} <span className="text-xs text-rose-200">ekor</span>
              </div>
              <span className="text-[10px] text-rose-100/80 font-semibold">
                Total Farm: {farmAggregates.cumMortality} ({farmAggregates.farmMortRate}%)
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="flex items-center gap-1.5 text-blue-200 text-[10px] font-black uppercase tracking-wider">
                <Egg className="w-3.5 h-3.5" />
                <span>Total Telur Kumulatif</span>
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {farmAggregates.cumEggPcs.toLocaleString('id-ID')}{' '}
                <span className="text-xs text-blue-200">btr</span>
              </div>
              <span className="text-[10px] text-blue-100/80 font-semibold">
                {farmAggregates.cumEggKg.toLocaleString('id-ID')} kg
              </span>
            </div>
          </div>
        </div>


        {/* 3. DETAIL & TREN PERFORMA TERPADU (DINAIKKAN KE ATAS TABEL KOMPARASI) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-xl text-white ${
                    isAllView ? 'bg-[#00684a]' : 'bg-slate-800'
                  }`}
                >
                  {isAllView
                    ? 'Total Farm (Semua Kandang)'
                    : `${activeFlockSummary?.flock.coop_name} (${activeFlockSummary?.flock.name})`}
                </span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Detail & Tren Harian
                </h3>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">
                {isAllView
                  ? 'Menampilkan performa gabungan seluruh kandang & breakdown per kandang pada setiap tanggal'
                  : `Menampilkan riwayat catatan dan tren khusus ${activeFlockSummary?.flock.coop_name}`}
              </p>
            </div>

            {/* View Selector Pills: Semua Kandang vs Kandang A vs Kandang B */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewFlockId('all')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                  viewFlockId === 'all'
                    ? 'bg-[#00684a] text-white shadow-xs scale-[1.02]'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Semua Kandang</span>
              </button>
              {flocks.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setViewFlockId(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                    viewFlockId === f.id
                      ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {f.coop_name} ({f.name})
                </button>
              ))}
            </div>
          </div>

          {/* Performance Chart for Selected View and Timeframe */}
          <PerformanceChart
            records={displayedRecords}
            allHistories={allHistories}
            isAllView={isAllView}
            timeMode={timeMode}
            startDate={startDate}
            endDate={endDate}
            weeklyMortality={displayedWeeklyMort}
            monthlyMortality={displayedMonthlyMort}
            totalMortality={displayedTotalMort}
            mortalityRate={displayedMortRate}
          />
        </div>

        {/* 4. CARD KALENDER VERSI SEMUA KANDANG (FARM CALENDAR) */}
        <DailyCalendarCard
          flockName="Semua Kandang (Farm)"
          dailyRecords={farmDailyHistory}
          healthRecords={allHealthRecords}
          onOpenQuickInput={() => setIsQuickInputOpen(true)}
        />

        {/* 5. TABEL KOMPARASI LENGKAP HEAD-TO-HEAD (MENYESUAIKAN TIMEFRAME SECARA DINAMIS) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Tabel Komparasi Lengkap Semua Kandang
                </h3>
                <span className="bg-[#00684a] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  {periodLabel}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">
                Kolom produksi & HDP menyesuaikan otomatis dengan time frame yang dipilih
              </p>
            </div>
            <span className="text-[10px] font-black bg-emerald-50 text-[#00684a] px-2.5 py-1 rounded-lg border border-emerald-200">
              {flockPeriodList.length} Kandang
            </span>
          </div>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase bg-slate-50/70">
                  <th className="py-2.5 px-2">Kandang</th>
                  <th className="py-2.5 px-2">Strain / Umur</th>
                  <th className="py-2.5 px-2 text-center">Populasi (Aktif/Awal)</th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-[#00684a]">
                    HDP ({periodLabel})
                  </th>
                  <th className="py-2.5 px-2 text-center bg-amber-50/50 text-amber-900">
                    Telur ({periodLabel})
                  </th>
                  <th className="py-2.5 px-2 text-center">Retak</th>
                  <th className="py-2.5 px-2 text-center">Rata2 HDP Kum.</th>
                  <th className="py-2.5 px-2 text-center">Kumulatif Telur</th>
                  <th className="py-2.5 px-2 text-right">Mati ({periodLabel}) / Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {flockPeriodList.map((item) => {
                  const isGoodHdp = item.period_avg_hdp >= 80;
                  const isSelected = item.flock.id === viewFlockId;

                  return (
                    <tr
                      key={item.flock.id}
                      onClick={() => setViewFlockId(item.flock.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>{item.flock.coop_name}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            ({item.flock.name})
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00684a]" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[11px] text-slate-600">
                        <div>{item.flock.strain}</div>
                        <div className="text-[10px] text-slate-400">{item.flock.age_weeks} Mgg</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="font-black text-slate-900">
                          {item.flock.current_population}{' '}
                          <span className="text-[10px] text-slate-400">
                            / {item.flock.initial_population}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center bg-emerald-50/30">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-black text-[11px] border ${
                            isGoodHdp
                              ? 'bg-emerald-50 text-[#00684a] border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.period_avg_hdp}%
                        </span>
                        <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                          HHP: {item.period_avg_hhp}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center bg-amber-50/20">
                        <div className="font-extrabold text-slate-900">
                          {item.period_egg_good_pcs.toLocaleString('id-ID')} btr
                        </div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          {item.period_egg_good_kg} kg
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-amber-700">
                        {item.period_egg_bad_pcs} btr
                      </td>
                      <td className="py-3 px-2 text-center font-extrabold text-[#00684a]">
                        {item.summary?.totals.overall_hdp_percent ||
                          item.summary?.totals.overall_hd_percent ||
                          0}
                        %
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="font-black text-slate-900">
                          {(item.summary?.totals.total_egg_good_pcs || 0).toLocaleString('id-ID')} btr
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          {(item.summary?.totals.total_egg_good_kg || 0).toLocaleString('id-ID')} kg
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="font-black text-rose-600">
                          {item.period_mortality_pcs} ekor
                        </div>
                        <div className="text-[10px] font-bold text-rose-400">
                          Total: {item.summary?.totals.total_mortality || 0} (
                          {item.summary?.totals.mortality_rate_percent || 0}%)
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL / AGGREGATE ROW FOR THE TIMEFRAME */}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-2 uppercase tracking-wider text-[11px] text-[#00684a]">
                    Total Farm
                  </td>
                  <td className="py-3 px-2 text-[10px] text-slate-500">
                    {flocks.length} Kandang
                  </td>
                  <td className="py-3 px-2 text-center font-black">
                    {farmAggregates.totalActivePop.toLocaleString('id-ID')}{' '}
                    <span className="text-[10px] text-slate-500">
                      / {farmAggregates.totalInitialPop.toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center bg-emerald-100/60">
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[11px] font-black">
                      {farmAggregates.periodFarmAvgHdp}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center bg-amber-100/50">
                    <div className="font-black text-slate-900">
                      {farmAggregates.periodEggPcs.toLocaleString('id-ID')} btr
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold">
                      {farmAggregates.periodEggKg} kg
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-amber-700 font-black">
                    {farmAggregates.periodEggBadPcs} btr
                  </td>
                  <td className="py-3 px-2 text-center text-slate-500 font-bold">-</td>
                  <td className="py-3 px-2 text-center">
                    <div className="font-black">
                      {farmAggregates.cumEggPcs.toLocaleString('id-ID')} btr
                    </div>
                    <div className="text-[10px] text-slate-600 font-bold">
                      {farmAggregates.cumEggKg.toLocaleString('id-ID')} kg
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="font-black text-rose-600">
                      {farmAggregates.periodMortality} ekor
                    </div>
                    <div className="text-[10px] text-rose-500 font-bold">
                      Total: {farmAggregates.cumMortality} ({farmAggregates.farmMortRate}%)
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <BottomNav onOpenQuickInput={() => setIsQuickInputOpen(true)} />

      <QuickInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        flocks={flocks}
        activeFlockId={viewFlockId !== 'all' ? viewFlockId : flocks[0]?.id}
        onSelectFlock={(id) => setViewFlockId(id)}
        onSaveDaily={handleSaveDaily}
        onSaveHealth={handleSaveHealth}
        onSaveFeed={handleSaveFeed}
        existingRecords={displayedRecords}
      />

      <FlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}
