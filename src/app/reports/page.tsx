'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { PerformanceChart } from '@/components/PerformanceChart';
import { FlockModal } from '@/components/FlockModal';
import { fetchFlocks, fetchDashboardSummary, fetchDailyHistory, createFlock } from '@/lib/supabase';
import { Flock, DashboardSummary, DailyRecord } from '@/types/database';
import { BarChart3, Download, Egg, Wheat, Skull, TrendingUp, Scale } from 'lucide-react';

export default function ReportsPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Laporan & Analytics</h2>
              <p className="text-xs font-semibold text-slate-400">Khusus Mandor / Owner Kandang</p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Quick Performance Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="gradient-border-emerald p-3.5 rounded-3xl shadow-xl">
            <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-0.5">Hen-Day (HD) % Hari Ini</span>
            <span className="text-2xl font-black text-white">{today?.hd_percent || 0}%</span>
            <span className="block text-[10px] font-semibold text-slate-400 mt-1">Target: &gt;85%</span>
          </div>

          <div className="gradient-border-blue p-3.5 rounded-3xl shadow-xl">
            <span className="block text-[10px] font-black uppercase tracking-wider text-blue-400 mb-0.5">FCR Pakan Harian</span>
            <span className="text-2xl font-black text-white">{today?.fcr || 0}</span>
            <span className="block text-[10px] font-semibold text-slate-400 mt-1">Standar: 2.0 - 2.2</span>
          </div>
        </div>

        {/* Kumulatif Totals Box */}
        {totals && (
          <div className="glass-card p-4 space-y-3.5 border border-slate-700/80 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">TOTAL KUMULATIF PERIODE</span>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {totals.total_days_recorded} Hari Catatan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5">
                <Egg className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Telur Utuh</span>
                  <span className="text-sm font-black text-white">{totals.total_egg_good_pcs} btr</span>
                  <span className="block text-[10px] text-emerald-400 font-bold">({totals.total_egg_good_kg} kg)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Wheat className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Pakan Terpakai</span>
                  <span className="text-sm font-black text-white">{totals.total_feed_kg} kg</span>
                  <span className="block text-[10px] text-blue-400 font-bold">~{(totals.total_feed_kg / 50).toFixed(0)} Sak</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Rata2 Hen-Day %</span>
                  <span className="text-sm font-black text-white">{totals.overall_hd_percent}% HD</span>
                  <span className="block text-[10px] text-emerald-400 font-bold">FCR: {totals.overall_fcr}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Skull className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Kematian</span>
                  <span className="text-sm font-black text-rose-400">{totals.total_mortality} ekor</span>
                  <span className="block text-[10px] text-slate-400 font-bold">Afkir: {totals.total_culling} ekor</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE CHART COMPONENT */}
        <PerformanceChart records={history} />

        {/* Tabular Data List */}
        <div className="glass-card p-4 space-y-3 border border-slate-700/80 shadow-2xl overflow-hidden">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Tabel Riwayat Catatan Harian</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase">
                  <th className="py-2.5 px-1">Tgl</th>
                  <th className="py-2.5 px-1">Telur (Btr/Kg)</th>
                  <th className="py-2.5 px-1 text-center">HD %</th>
                  <th className="py-2.5 px-1 text-center">Pakan</th>
                  <th className="py-2.5 px-1 text-center">FCR</th>
                  <th className="py-2.5 px-1 text-right">Mati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs font-semibold text-slate-200">
                {history.map((r) => (
                  <tr key={r.record_date} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-1 font-black text-white">{r.record_date.slice(5)}</td>
                    <td className="py-2.5 px-1">
                      <div className="font-extrabold text-amber-400">{r.egg_good_pcs} btr</div>
                      <div className="text-[10px] text-slate-400 font-bold">{r.egg_good_kg} kg</div>
                    </td>
                    <td className="py-2.5 px-1 text-center font-black text-emerald-400">{r.hd_percent}%</td>
                    <td className="py-2.5 px-1 text-center font-bold text-blue-300">{r.feed_kg} kg</td>
                    <td className="py-2.5 px-1 text-center font-bold text-slate-300">{r.fcr}</td>
                    <td className="py-2.5 px-1 text-right font-black text-rose-400">{r.mortality_pcs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <BottomNav />

      <FlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}

