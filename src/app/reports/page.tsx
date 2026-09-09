'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PerformanceChart } from '@/components/PerformanceChart';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { fetchFlocks, fetchDashboardSummary, fetchDailyHistory, createFlock, saveDailyRecord, saveHealthRecord } from '@/lib/supabase';
import { Flock, DashboardSummary, DailyRecord, HealthRecord } from '@/types/database';
import { BarChart3, Download, Egg, Wheat, Skull, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

  useEffect(() => {
    loadFlocks();
  }, []);

  useEffect(() => {
    if (activeFlockId) {
      loadData(activeFlockId);
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

  const loadData = async (flockId: string) => {
    setLoading(true);
    try {
      const sum = await fetchDashboardSummary(flockId);
      const hist = await fetchDailyHistory(flockId, 60);
      setSummary(sum);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    if (activeFlockId) await loadData(activeFlockId);
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    if (activeFlockId) await loadData(activeFlockId);
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Tanggal,Telur Utuh (Butir),Telur Utuh (Kg),Telur Retak (Butir),Mati (Ekor),Afkir (Ekor),Pakan (Kg),HD (%),FCR,Rata2 Berat (g),Catatan'];
    const rows = history.map((r) =>
      [
        r.record_date,
        r.egg_good_pcs,
        r.egg_good_kg,
        r.egg_bad_pcs,
        r.mortality_pcs,
        r.culling_pcs,
        r.feed_kg,
        r.hd_percent || 0,
        r.fcr || 0,
        r.avg_egg_weight_g || 0,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kandang_${summary?.flock?.name || 'Angkatan'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = summary?.totals;
  const today = summary?.today;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Title & Export */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Laporan & Analytics</h2>
              <p className="text-xs font-semibold text-slate-500">Khusus Mandor / Owner Kandang</p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Quick Performance Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-emerald-200 p-3.5 rounded-3xl shadow-md">
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#00684a] mb-0.5">Hen-Day (HD) % Hari Ini</span>
            <span className="text-2xl font-black text-slate-900">{today?.hd_percent || 0}%</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Target: &gt;85%</span>
          </div>

          <div className="bg-white border border-amber-200 p-3.5 rounded-3xl shadow-md">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-600 mb-0.5">Telur Retak Hari Ini</span>
            <span className="text-2xl font-black text-slate-900">{today?.egg_bad_pcs || 0} btr</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">~{today?.egg_bad_kg || 0} kg total</span>
          </div>
        </div>

        {/* Kumulatif Totals Box */}
        {totals && (
          <div className="bg-white p-4 rounded-3xl space-y-3.5 border border-slate-200 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-[#00684a] uppercase tracking-wider">TOTAL KUMULATIF PERIODE</span>
              <span className="text-[10px] font-black bg-emerald-50 text-[#00684a] border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {totals.total_days_recorded} Hari Catatan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5">
                <Egg className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Telur Utuh</span>
                  <span className="text-sm font-black text-slate-900">{totals.total_egg_good_pcs} btr</span>
                  <span className="block text-[10px] text-[#00684a] font-bold">({totals.total_egg_good_kg} kg)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Egg className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Telur Retak</span>
                  <span className="text-sm font-black text-slate-900">{totals.total_egg_bad_pcs} btr</span>
                  <span className="block text-[10px] text-amber-700 font-bold">({totals.total_egg_bad_kg} kg)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-[#00684a] shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Rata2 Hen-Day %</span>
                  <span className="text-sm font-black text-slate-900">{totals.overall_hd_percent}% HD</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Skull className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Kematian</span>
                  <span className="text-sm font-black text-rose-600">{totals.total_mortality} ekor</span>
                  <span className="block text-[10px] text-slate-500 font-bold">Afkir: {totals.total_culling} ekor</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE CHART COMPONENT */}
        <PerformanceChart records={history} />

        {/* Tabular Data List */}
        <div className="bg-white p-4 rounded-3xl space-y-3 border border-slate-200 shadow-md overflow-hidden">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tabel Riwayat Catatan Harian</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="py-2.5 px-1">Tgl</th>
                  <th className="py-2.5 px-1">Telur Utuh (Btr/Kg)</th>
                  <th className="py-2.5 px-1 text-center">Retak</th>
                  <th className="py-2.5 px-1 text-center">HD %</th>
                  <th className="py-2.5 px-1 text-right">Mati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {history.map((r) => (
                  <tr key={r.record_date} className="hover:bg-slate-50">
                    <td className="py-2.5 px-1 font-black text-slate-900">{r.record_date.slice(5)}</td>
                    <td className="py-2.5 px-1">
                      <div className="font-extrabold text-[#00684a]">{r.egg_good_pcs} btr</div>
                      <div className="text-[10px] text-slate-500 font-bold">{r.egg_good_kg} kg</div>
                    </td>
                    <td className="py-2.5 px-1 text-center font-bold text-amber-700">{r.egg_bad_pcs} btr</td>
                    <td className="py-2.5 px-1 text-center font-black text-[#00684a]">{r.hd_percent}%</td>
                    <td className="py-2.5 px-1 text-right font-black text-rose-600">{r.mortality_pcs}</td>
                  </tr>
                ))}
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

