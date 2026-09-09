'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { FABButton } from '@/components/FABButton';
import { QuickInputModal } from '@/components/QuickInputModal';
import { FlockModal } from '@/components/FlockModal';
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-emerald-50">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600 flex items-center justify-center text-white animate-bounce shadow-lg">
          <Egg className="w-8 h-8 fill-emerald-100" />
        </div>
        <span className="text-sm font-black text-emerald-800 mt-3">Membuka Dashboard Performa...</span>
      </div>
    );
  }

  const activeFlock = summary?.flock;
  const today = summary?.today;

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      {/* Top Navbar */}
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsFlockModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-3 py-3 space-y-3.5">
        {/* Active Flock Hero Banner */}
        {activeFlock && (
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-4 text-white shadow-xl shadow-emerald-200/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-emerald-500/40 text-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {activeFlock.coop_name}
                </span>
                <span className="text-xs text-emerald-100 font-semibold">• {activeFlock.strain}</span>
              </div>
              <h2 className="text-lg font-black leading-tight">{activeFlock.name}</h2>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                Populasi Aktif: <strong className="text-white font-extrabold">{activeFlock.current_population} ekor</strong> (Umur {activeFlock.age_weeks} Minggu)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <Activity className="w-7 h-7 text-emerald-200" />
            </div>
          </div>
        )}

        {/* Section Header: Performa Hari Ini */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Laporan Performa Hari Ini</h3>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            today?.has_recorded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {today?.has_recorded ? '✔ Sudah Dicatat' : '⚠️ Belum Input'}
          </span>
        </div>

        {/* Metric Grid Cards */}
        <div className="grid grid-cols-2 gap-2.5">
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
            subtitle={`${today?.feed_kg || 0} kg konsumsi`}
            icon={Wheat}
            colorTheme="blue"
          />
        </div>

        {/* Average Weight Pill */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-800">Rata-Rata Berat Telur</span>
              <span className="text-[11px] font-semibold text-slate-400">Standar Telur: 60-65g / butir</span>
            </div>
          </div>
          <span className="text-base font-black text-amber-700">{today?.avg_egg_weight_g || 0} gram</span>
        </div>

        {/* MAIN PERFORMANCE GRAPH (LANGSUNG DISUGUHI LAPORAN GRAFIK) */}
        <PerformanceChart records={history} />

        {/* Recent Daily Records Table */}
        <div className="stat-card p-4 space-y-3 border-2 border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Catatan 7 Hari Terakhir</h3>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center">
              <span>Terbaru</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.slice(0, 7).map((rec) => (
              <div key={rec.record_date} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900">{rec.record_date}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {rec.egg_good_pcs} btr ({rec.egg_good_kg} kg) • {rec.feed_kg} kg pakan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-700">{rec.hd_percent}% HD</span>
                  <span className="block text-[10px] font-bold text-rose-600">
                    {rec.mortality_pcs > 0 ? `+${rec.mortality_pcs} mati` : '0 mati'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (FAB) DI KANAN BAWAH (+) */}
      <FABButton onClick={() => setIsInputModalOpen(true)} />

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
