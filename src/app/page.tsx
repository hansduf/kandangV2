'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { FABButton } from '@/components/FABButton';
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
  Scale,
  Activity,
  ChevronRight,
  BarChart3,
  Calendar,
  Sparkles,
  CheckCircle,
  AlertCircle,
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 animate-bounce shadow-xl shadow-emerald-500/30">
          <Egg className="w-8 h-8 fill-slate-950 stroke-[2.5]" />
        </div>
        <span className="text-sm font-black text-emerald-400 mt-4 tracking-wider uppercase">Membuka Dashboard Performa...</span>
      </div>
    );
  }

  const activeFlock = summary?.flock;
  const today = summary?.today;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      {/* Top Navbar */}
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsFlockModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-3.5 py-4 space-y-4">
        {/* Active Flock Hero Banner */}
        {activeFlock && (
          <div className="gradient-border-emerald rounded-3xl p-4 text-white shadow-2xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {activeFlock.coop_name}
                </span>
                <span className="text-xs text-slate-300 font-bold">• {activeFlock.strain}</span>
              </div>
              <h2 className="text-xl font-black leading-tight tracking-tight text-white">{activeFlock.name}</h2>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Populasi Aktif: <strong className="text-emerald-400 font-black">{activeFlock.current_population} ekor</strong> (Umur {activeFlock.age_weeks} Minggu)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-emerald-400 animate-pulse-glow" />
            </div>
          </div>
        )}

        {/* Section Header: Performa Hari Ini */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Laporan Performa Hari Ini</h3>
          </div>
          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
            today?.has_recorded
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            {today?.has_recorded ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{today?.has_recorded ? 'Sudah Dicatat' : 'Belum Input'}</span>
          </span>
        </div>

        {/* Metric Grid Cards */}
        <div className="grid grid-cols-2 gap-3">
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
            title="Kematian Hari Ini"
            value={today?.mortality_pcs || 0}
            unit="ekor"
            subtitle={`Kumulatif: ${summary?.totals.total_mortality || 0} ekor`}
            icon={Skull}
            colorTheme="rose"
          />
          <StatCard
            title="FCR Pakan"
            value={today?.fcr || 0}
            unit=""
            subtitle={`${today?.feed_kg || 0} kg pakan`}
            icon={Wheat}
            colorTheme="blue"
          />
        </div>

        {/* Average Weight Pill */}
        <div className="glass-card p-3.5 flex items-center justify-between shadow-xl border border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-black text-white">Rata-Rata Berat Telur</span>
              <span className="text-[11px] font-semibold text-slate-400">Standar Telur: 60-65g / butir</span>
            </div>
          </div>
          <span className="text-lg font-black text-amber-400">{today?.avg_egg_weight_g || 0} gram</span>
        </div>

        {/* MAIN PERFORMANCE GRAPH */}
        <PerformanceChart records={history} />

        {/* Recent Daily Records Table */}
        <div className="glass-card p-4 space-y-3 border border-slate-700/80">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Riwayat Catatan 7 Hari Terakhir</h3>
            <span className="text-[11px] font-black text-emerald-400 flex items-center">
              <span>Terbaru</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {history.slice(0, 7).map((rec) => (
              <div key={rec.record_date} className="py-3 flex items-center justify-between hover:bg-slate-900/40 rounded-xl px-1 transition-colors">
                <div>
                  <span className="text-xs font-black text-white">{rec.record_date}</span>
                  <span className="block text-[11px] font-semibold text-slate-400">
                    {rec.egg_good_pcs} btr ({rec.egg_good_kg} kg) • {rec.feed_kg} kg pakan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{rec.hd_percent}% HD</span>
                  <span className="block text-[10px] font-bold text-rose-400 mt-0.5">
                    {rec.mortality_pcs > 0 ? `+${rec.mortality_pcs} mati` : '0 mati'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <FABButton onClick={() => setIsInputModalOpen(true)} />

      {/* BOTTOM NAVIGATION BAR */}
      <BottomNav />

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

