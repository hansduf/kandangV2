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
  Scale,
  Activity,
  ChevronRight,
  BarChart3,
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

      <main className="max-w-md mx-auto px-3.5 py-4 space-y-4">
        {/* Active Flock Hero Banner */}
        {activeFlock && (
          <div className="bg-gradient-to-r from-[#00684a] via-[#046a38] to-emerald-900 rounded-3xl p-4 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-white/20 text-emerald-100 border border-white/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {activeFlock.coop_name}
                </span>
                <span className="text-xs text-emerald-100 font-bold">• {activeFlock.strain}</span>
              </div>
              <h2 className="text-xl font-black leading-tight tracking-tight text-white">{activeFlock.name}</h2>
              <p className="text-xs text-emerald-50 font-semibold mt-1">
                Populasi Aktif: <strong className="text-white font-black">{activeFlock.current_population} ekor</strong> (Umur {activeFlock.age_weeks} Minggu)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-md">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
        )}

        {/* Section Header: Performa Hari Ini */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00684a]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Laporan Performa Hari Ini</h3>
          </div>
          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
            today?.has_recorded
              ? 'bg-emerald-50 text-[#00684a] border-emerald-200 shadow-xs'
              : 'bg-amber-50 text-amber-700 border-amber-200'
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

        {/* Average Weight Pill */}
        <div className="bg-white p-3.5 rounded-3xl flex items-center justify-between shadow-md border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-black text-slate-800">Rata-Rata Berat Telur</span>
              <span className="text-[11px] font-semibold text-slate-500">Standar Telur: 60-65g / butir</span>
            </div>
          </div>
          <span className="text-lg font-black text-amber-600">{today?.avg_egg_weight_g || 0} gram</span>
        </div>

        {/* MAIN PERFORMANCE GRAPH */}
        <PerformanceChart records={history} />

        {/* Recent Daily Records Table */}
        <div className="bg-white p-4 rounded-3xl space-y-3 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Catatan 7 Hari Terakhir</h3>
            <span className="text-[11px] font-black text-[#00684a] flex items-center">
              <span>Terbaru</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.slice(0, 7).map((rec) => (
              <div key={rec.record_date} className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl px-1 transition-colors">
                <div>
                  <span className="text-xs font-black text-slate-900">{rec.record_date}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {rec.egg_good_pcs} btr ({rec.egg_good_kg} kg) • {rec.egg_bad_pcs} retak
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#00684a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{rec.hd_percent}% HD</span>
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

