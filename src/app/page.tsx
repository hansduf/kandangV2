'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { QuickInputModal } from '@/components/QuickInputModal';
import { FlockModal } from '@/components/FlockModal';
import { BottomNav } from '@/components/BottomNav';
import {
  fetchFlocks,
  fetchDashboardSummary,
  fetchDailyHistory,
  fetchHealthRecords,
  saveDailyRecord,
  saveHealthRecord,
  createFlock,
  updateFlock,
  fetchTasksForDate,
  toggleTaskCompletion,
} from '@/lib/supabase';
import { Flock, DashboardSummary, DailyRecord, HealthRecord } from '@/types/database';
import { DailyCalendarCard } from '@/components/DailyCalendarCard';
import { FloatingTaskEdge } from '@/components/FloatingTaskEdge';
import { TaskCalendarCard } from '@/components/TaskCalendarCard';
import { useProfile } from '@/context/ProfileContext';
import {
  Egg,
  TrendingUp,
  Skull,
  Activity,
  ChevronRight,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Home,
  Calendar,
  HardHat,
  Crown,
} from 'lucide-react';

export default function DashboardHomePage() {
  const { activeProfile, isOwner, isWorker, setIsProfileModalOpen } = useProfile();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [healthList, setHealthList] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);

  // Timeframe Filter State for Dashboard
  const [timeMode, setTimeMode] = useState<'7' | '14' | '30' | 'all' | 'custom'>('14');
  const todayStr = new Date().toISOString().split('T')[0];
  const past7Days = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(past7Days);
  const [endDate, setEndDate] = useState(todayStr);

  // Modals State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);

  useEffect(() => {
    loadFlocks();
  }, []);

  useEffect(() => {
    if (activeFlockId) {
      loadDashboard(activeFlockId, timeMode);
    }
  }, [activeFlockId, timeMode]);

  const loadFlocks = async () => {
    try {
      const data = await fetchFlocks();
      setFlocks(data);
      if (data.length > 0 && !activeFlockId) {
        setActiveFlockId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (flockId: string, mode: string) => {
    setLoading(true);
    try {
      const limit = mode === '7' ? 7 : mode === '14' ? 14 : mode === '30' ? 30 : 365;
      const [sumData, histData, healthData] = await Promise.all([
        fetchDashboardSummary(flockId),
        fetchDailyHistory(flockId, limit),
        fetchHealthRecords(flockId),
      ]);
      setSummary(sumData);
      setHistory(histData);
      setHealthList(healthData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    // Auto-mark daily_record task as complete for today
    try {
      const todayTasks = await fetchTasksForDate(record.record_date, activeProfile?.id);
      const eggTask = todayTasks.find((t) => t.task_type === 'daily_record' && !t.is_completed);
      if (eggTask) {
        await toggleTaskCompletion(eggTask.task_id, record.record_date, activeProfile?.id);
      }
    } catch (e) {
      console.error('Failed to auto-complete egg task:', e);
    }
    setTaskRefreshTrigger((prev) => prev + 1);
    if (activeFlockId) {
      await loadDashboard(activeFlockId, timeMode);
    }
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    if (activeFlockId) {
      await loadDashboard(activeFlockId, timeMode);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    await loadFlocks();
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const handleUpdateFlock = async (id: string, flockData: Partial<Flock>) => {
    const updated = await updateFlock(id, flockData);
    await loadFlocks();
    setEditingFlock(null);
    return updated;
  };

  if (loading && flocks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-900">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#00684a] to-emerald-500 flex items-center justify-center text-white animate-bounce shadow-xl">
          <Egg className="w-8 h-8 fill-white stroke-[2.5]" />
        </div>
        <span className="text-sm font-black text-[#00684a] mt-4 tracking-wider uppercase">Membuka Dashboard Performa...</span>
      </div>
    );
  }

  const activeFlock = summary?.flock;
  const today = summary?.today;

  // Track previous day egg count
  const previousEggPcs = history.length > 0 ? (history[0].egg_good_pcs || 0) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* Top Navbar */}
      <Navbar
        onOpenNewFlockModal={() => {
          setEditingFlock(null);
          setIsFlockModalOpen(true);
        }}
      />

      <main className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-3 py-3.5 sm:px-4 sm:py-4 space-y-3.5 sm:space-y-4">
        {/* WORKER DASHBOARD VIEW */}
        {isWorker ? (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Worker Greeting & Quick Action Banner */}
            <div className="bg-gradient-to-r from-[#00684a] via-emerald-800 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-white font-black text-base uppercase">
                    {activeProfile?.name ? activeProfile.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black">Halo, {activeProfile?.name || 'Pengguna'}! 👋</h2>
                    <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">Pencatatan Telur & Agenda Tugas Harian</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[11px] font-black bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all"
                >
                  Ganti Akun
                </button>
              </div>

              {/* Today Egg Logging Status Indicator */}
              <div className="bg-black/25 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black text-blue-200 block uppercase tracking-wider">Status Input Telur Hari Ini</span>
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                    {today?.has_recorded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Sudah Tercatat ({today.egg_good_pcs} butir)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span className="text-amber-200">Belum Dicatat Hari Ini</span>
                      </>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setIsInputModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{today?.has_recorded ? 'Edit Catatan' : 'Catat Sekarang'}</span>
                </button>
              </div>
            </div>

            {/* Horizontal Coop Selector (without add button for worker) */}
            {flocks.length > 1 && (
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Pilih Kandang:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar snap-x scroll-smooth">
                  {flocks.map((f) => {
                    const isActive = f.id === activeFlockId;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setActiveFlockId(f.id)}
                        className={`snap-start shrink-0 px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                          isActive
                            ? 'bg-[#00684a] text-white border-[#00684a] shadow-md shadow-[#00684a]/20 scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`} />
                        <span>{f.coop_name}</span>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                          • {f.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <StatCard
                title="Telur Utuh Hari Ini"
                value={today?.egg_good_pcs.toLocaleString('id-ID') || 0}
                unit="btr"
                subtitle={`${today?.egg_good_kg || 0} kg total`}
                icon={Egg}
                colorTheme="blue"
              />
              <StatCard
                title="Kematian Hari Ini"
                value={today?.mortality_pcs || 0}
                unit="ekor"
                subtitle="Mati / Afkir hari ini"
                icon={Skull}
                colorTheme="rose"
              />
              <StatCard
                title="Hen-Day (HDP)"
                value={today?.hdp_percent !== undefined && today?.hdp_percent !== null ? today.hdp_percent : (today?.hd_percent || 0)}
                unit="%"
                subtitle="Telur / Ayam Hidup"
                icon={TrendingUp}
                colorTheme="emerald"
              />
              <StatCard
                title="Populasi Aktif"
                value={activeFlock?.current_population.toLocaleString('id-ID') || 0}
                unit="ekor"
                subtitle={`Umur ${activeFlock?.age_weeks || 0} Minggu`}
                icon={Activity}
                colorTheme="amber"
              />
            </div>

            {/* WORKER TASK CALENDAR AGENDA (HARI INI, BESOK, LUSA) */}
            <TaskCalendarCard
              workerId={activeProfile?.id}
              onOpenQuickInput={() => setIsInputModalOpen(true)}
            />

            {/* Recent Daily Records Table */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl space-y-3 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Catatan Harian</h3>
                <span className="text-[10px] sm:text-[11px] font-black text-[#00684a] flex items-center">
                  <span>Terbaru</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {history.slice(0, 5).map((rec) => (
                  <div key={rec.record_date} className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl px-1 transition-colors">
                    <div>
                      <span className="text-xs font-black text-slate-900">{rec.record_date}</span>
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500">
                        {rec.egg_good_pcs.toLocaleString('id-ID')} btr ({rec.egg_good_kg} kg) • {rec.egg_bad_pcs} retak
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] sm:text-xs font-black text-[#00684a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {rec.hdp_percent !== undefined && rec.hdp_percent !== null ? rec.hdp_percent : (rec.hd_percent || 0)}% HDP
                      </span>
                      <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                        {rec.mortality_pcs > 0 ? `+${rec.mortality_pcs} mati` : '0 mati'}
                      </span>
                    </div>
                  </div>
                ))}

                {history.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    Belum ada riwayat catatan harian untuk kandang ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* OWNER DASHBOARD VIEW */
          <>
            {/* Horizontal Swipeable Coop Sub-Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar snap-x scroll-smooth">
              {flocks.map((f) => {
                const isActive = f.id === activeFlockId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFlockId(f.id)}
                    className={`snap-start shrink-0 px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-[#00684a] text-white border-[#00684a] shadow-md shadow-[#00684a]/20 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`} />
                    <span>{f.coop_name}</span>
                    <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      • {f.name}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setEditingFlock(null);
                  setIsFlockModalOpen(true);
                }}
                className="snap-start shrink-0 px-3 py-2 rounded-2xl text-xs font-black bg-emerald-50 text-[#00684a] border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Tambah</span>
              </button>
            </div>

            {/* Empty State if No Flocks */}
            {flocks.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00684a] mx-auto flex items-center justify-center border border-emerald-200">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Belum ada kandang terdaftar</h4>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Daftarkan kandang baru untuk melihat dashboard performa & mencatat telur.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingFlock(null);
                    setIsFlockModalOpen(true);
                  }}
                  className="bg-[#00684a] hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-2xl text-xs inline-flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Daftarkan Kandang Pertama</span>
                </button>
              </div>
            )}

            {/* Active Flock Hero Banner */}
            {activeFlock && flocks.length > 0 && (
              <div className="bg-gradient-to-r from-[#00684a] via-[#046a38] to-emerald-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 text-white shadow-lg flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/20 text-emerald-100 border border-white/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {activeFlock.coop_name}
                    </span>
                    <span className="text-xs text-emerald-100 font-bold">• {activeFlock.strain}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-white">{activeFlock.name}</h2>
                  <p className="text-xs text-emerald-50 font-semibold mt-0.5">
                    Populasi Aktif: <strong className="text-white font-black">{activeFlock.current_population.toLocaleString('id-ID')} ekor</strong> (Umur {activeFlock.age_weeks} Mgg)
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
                </div>
              </div>
            )}

            {flocks.length > 0 && (
              <>
                {/* GLOBAL TIMEFRAME SELECTOR BAR */}
                <div className="bg-white p-3 border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#00684a]" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Periode Laporan</h3>
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
                </div>

                {/* Flock Health & Status Alert Badge */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    {timeMode === 'all' ? 'Statistik Keseluruhan' : timeMode === 'custom' ? `${startDate} s/d ${endDate}` : `Ringkasan ${timeMode} Hari Terakhir`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#00684a] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className={`w-1.5 h-1.5 rounded-full ${today?.has_recorded ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                    <span>{today?.has_recorded ? 'Sudah Dicatat' : 'Belum Input'}</span>
                  </span>
                </div>

                {/* Metric Grid Cards */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <StatCard
                    title="Hen-Day (HDP)"
                    value={today?.hdp_percent !== undefined && today?.hdp_percent !== null ? today.hdp_percent : (today?.hd_percent || 0)}
                    unit="%"
                    subtitle={`Telur/Ayam Hidup (HHP: ${today?.hhp_percent || 0}%)`}
                    icon={TrendingUp}
                    colorTheme="emerald"
                  />
                  <StatCard
                    title="Hen-Housed (HHP)"
                    value={today?.hhp_percent || 0}
                    unit="%"
                    subtitle={`Telur/Pop. Awal (${activeFlock?.initial_population || 0} ekor)`}
                    icon={TrendingUp}
                    colorTheme="amber"
                  />
                  <StatCard
                    title="Telur Utuh Hari Ini"
                    value={today?.egg_good_pcs.toLocaleString('id-ID') || 0}
                    unit="btr"
                    subtitle={`${today?.egg_good_kg || 0} kg total`}
                    icon={Egg}
                    colorTheme="blue"
                  />
                  <StatCard
                    title="Kematian Hari Ini"
                    value={today?.mortality_pcs || 0}
                    unit="ekor"
                    subtitle={`Mgg: ${summary?.totals.weekly_mortality || 0} | Bln: ${summary?.totals.monthly_mortality || 0} | Total: ${summary?.totals.total_mortality || 0}`}
                    icon={Skull}
                    colorTheme="rose"
                  />
                </div>

                {/* PERFORMANCE CHART WITH MORTALITY BUILT-IN */}
                <PerformanceChart
                  records={history}
                  timeMode={timeMode}
                  startDate={startDate}
                  endDate={endDate}
                  weeklyMortality={summary?.totals.weekly_mortality}
                  monthlyMortality={summary?.totals.monthly_mortality}
                  totalMortality={summary?.totals.total_mortality}
                  mortalityRate={summary?.totals.mortality_rate_percent}
                />

                {/* DAILY CALENDAR CARD: PRODUKSI, KEMATIAN & VAKSIN/OBAT */}
                <DailyCalendarCard
                  flockName={activeFlock ? `${activeFlock.coop_name} (${activeFlock.name})` : 'Kandang'}
                  dailyRecords={history}
                  healthRecords={healthList}
                  onOpenQuickInput={() => setIsInputModalOpen(true)}
                />

                {/* TASK CALENDAR CARD FOR OWNER */}
                <TaskCalendarCard
                  onOpenQuickInput={() => setIsInputModalOpen(true)}
                />

                {/* Recent Daily Records Table */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl space-y-3 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Catatan Harian</h3>
                    <span className="text-[10px] sm:text-[11px] font-black text-[#00684a] flex items-center">
                      <span>Terbaru</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {history.slice(0, 7).map((rec) => (
                      <div key={rec.record_date} className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl px-1 transition-colors">
                        <div>
                          <span className="text-xs font-black text-slate-900">{rec.record_date}</span>
                          <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500">
                            {rec.egg_good_pcs.toLocaleString('id-ID')} btr ({rec.egg_good_kg} kg) • {rec.egg_bad_pcs} retak
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] sm:text-xs font-black text-[#00684a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {rec.hdp_percent !== undefined && rec.hdp_percent !== null ? rec.hdp_percent : (rec.hd_percent || 0)}% HDP
                          </span>
                          <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                            {rec.mortality_pcs > 0 ? `+${rec.mortality_pcs} mati` : '0 mati'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {history.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                        Belum ada riwayat catatan harian untuk kandang ini.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* FLOATING TASK EDGE NOTIFICATION BADGE */}
      <FloatingTaskEdge
        onOpenQuickInput={() => setIsInputModalOpen(true)}
        refreshTrigger={taskRefreshTrigger}
      />

      {/* BOTTOM NAVIGATION BAR WITH CATAT (+) BUTTON */}
      <BottomNav onOpenQuickInput={() => setIsInputModalOpen(true)} />

      {/* SLIDE-UP BOTTOM SHEET INPUT MODAL */}
      <QuickInputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onSaveDaily={handleSaveDaily}
        onSaveHealth={handleSaveHealth}
        previousEggPcs={previousEggPcs}
        existingRecords={history}
      />

      {/* FLOCK ADD / EDIT MODAL */}
      <FlockModal
        isOpen={isFlockModalOpen}
        onClose={() => {
          setIsFlockModalOpen(false);
          setEditingFlock(null);
        }}
        flockToEdit={editingFlock}
        onCreateFlock={handleCreateFlock}
        onUpdateFlock={handleUpdateFlock}
      />
    </div>
  );
}
