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
  saveDailyRecord,
  saveHealthRecord,
  createFlock,
} from '@/lib/supabase';
import { Flock, DashboardSummary, DailyRecord, HealthRecord } from '@/types/database';
import {
  Egg,
  TrendingUp,
  Skull,
  Wheat,
  Activity,
  ChevronRight,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function DashboardHomePage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);

  useEffect(() => {
    loadFlocks();
  }, []);

  useEffect(() => {
    if (activeFlockId) {
      loadDashboard(activeFlockId);
    }
  }, [activeFlockId]);

  const loadFlocks = async () => {
    try {
      const data = await fetchFlocks();
      setFlocks(data);
      if (data.length > 0) {
        setActiveFlockId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (flockId: string) => {
    setLoading(true);
    try {
      const sumData = await fetchDashboardSummary(flockId);
      const histData = await fetchDailyHistory(flockId, 14);
      setSummary(sumData);
      setHistory(histData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    if (activeFlockId) {
      await loadDashboard(activeFlockId);
    }
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    if (activeFlockId) {
      await loadDashboard(activeFlockId);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {/* Top Navbar */}
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsFlockModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-3 py-3.5 sm:px-4 sm:py-4 space-y-3.5 sm:space-y-4">
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
            onClick={() => setIsFlockModalOpen(true)}
            className="snap-start shrink-0 px-3 py-2 rounded-2xl text-xs font-black bg-emerald-50 text-[#00684a] border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Tambah</span>
          </button>
        </div>

        {/* Active Flock Hero Banner */}
        {activeFlock && (
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
                Populasi Aktif: <strong className="text-white font-black">{activeFlock.current_population} ekor</strong> (Umur {activeFlock.age_weeks} Mgg)
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
            </div>
          </div>
        )}

        {/* Section Header: Performa Hari Ini */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BarChart3 className="w-4 h-4 text-[#00684a]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Laporan Performa Hari Ini</h3>
          </div>
          <span className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 border ${
            today?.has_recorded
              ? 'bg-emerald-50 text-[#00684a] border-emerald-200 shadow-xs'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {today?.has_recorded ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{today?.has_recorded ? 'Sudah Dicatat' : 'Belum Input'}</span>
          </span>
        </div>

        {/* Metric Grid Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <StatCard
            title="Hen-Day (HD)"
            value={today?.hd_percent || 0}
            unit="%"
            subtitle="Target Produksi: >85%"
            icon={TrendingUp}
            colorTheme="emerald"
          />
          <StatCard
            title="Telur Utuh Hari Ini"
            value={today?.egg_good_pcs || 0}
            unit="btr"
            subtitle={`${today?.egg_good_kg || 0} kg total`}
            icon={Egg}
            colorTheme="amber"
          />
          <StatCard
            title="Telur Retak Hari Ini"
            value={today?.egg_bad_pcs || 0}
            unit="btr"
            subtitle={`~${today?.egg_bad_kg || 0} kg retak`}
            icon={Egg}
            colorTheme="blue"
          />
          <StatCard
            title="Kematian Hari Ini"
            value={today?.mortality_pcs || 0}
            unit="ekor"
            subtitle={`Kumulatif: ${summary?.totals.total_mortality || 0} ekor`}
            icon={Skull}
            colorTheme="rose"
          />
        </div>

        {/* MAIN PERFORMANCE GRAPH */}
        <PerformanceChart records={history} />

        {/* Recent Daily Records Table */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl space-y-3 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Catatan 7 Hari Terakhir</h3>
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
                    {rec.egg_good_pcs} btr ({rec.egg_good_kg} kg) • {rec.egg_bad_pcs} retak
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] sm:text-xs font-black text-[#00684a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{rec.hd_percent}% HD</span>
                  <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                    {rec.mortality_pcs > 0 ? `+${rec.mortality_pcs} mati` : '0 mati'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

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
      />

      {/* FLOCK ADD MODAL */}
      <FlockModal
        isOpen={isFlockModalOpen}
        onClose={() => setIsFlockModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}

