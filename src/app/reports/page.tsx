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
    <div className="min-h-screen bg-slate-100 pb-24">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-3 py-3 space-y-3.5">
        {/* Title & Export */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Laporan & Analytics</h2>
              <p className="text-xs font-semibold text-slate-500">Khusus Mandor / Owner Kandang</p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Quick Performance Indicators */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="stat-card p-3 bg-emerald-50 border border-emerald-200">
            <span className="block text-[10px] font-extrabold uppercase text-emerald-700">Hen-Day (HD) % Hari Ini</span>
            <span className="text-xl font-black text-emerald-950">{today?.hd_percent || 0}%</span>
            <span className="block text-[10px] font-semibold text-emerald-700 mt-0.5">Target: &gt;85%</span>
          </div>

          <div className="stat-card p-3 bg-blue-50 border border-blue-200">
            <span className="block text-[10px] font-extrabold uppercase text-blue-700">FCR Pakan Harian</span>
            <span className="text-xl font-black text-blue-950">{today?.fcr || 0}</span>
            <span className="block text-[10px] font-semibold text-blue-700 mt-0.5">Standar: 2.0 - 2.2</span>
          </div>
        </div>

        {/* Kumulatif Totals Box */}
        {totals && (
          <div className="stat-card p-4 space-y-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">TOTAL KUMULATIF PERIODE</span>
              <span className="text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full">
                {totals.total_days_recorded} Hari Catatan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Egg className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Telur Utuh</span>
                  <span className="text-sm font-black text-white">{totals.total_egg_good_pcs} btr</span>
                  <span className="block text-[10px] text-emerald-300 font-bold">({totals.total_egg_good_kg} kg)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Pakan Terpakai</span>
                  <span className="text-sm font-black text-white">{totals.total_feed_kg} kg</span>
                  <span className="block text-[10px] text-blue-300 font-bold">~{(totals.total_feed_kg / 50).toFixed(0)} Sak</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Rata2 Hen-Day %</span>
                  <span className="text-sm font-black text-white">{totals.overall_hd_percent}% HD</span>
                  <span className="block text-[10px] text-emerald-300 font-bold">FCR: {totals.overall_fcr}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Kematian</span>
                  <span className="text-sm font-black text-rose-300">{totals.total_mortality} ekor</span>
                  <span className="block text-[10px] text-slate-400 font-bold">Afkir: {totals.total_culling} ekor</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE CHART COMPONENT */}
        <PerformanceChart records={history} />

        {/* Tabular Data List */}
        <div className="stat-card p-3 space-y-2 overflow-hidden border-2 border-slate-200">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider px-1">Tabel Riwayat Catatan Harian</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <th className="py-2 px-1">Tgl</th>
                  <th className="py-2 px-1">Telur (Btr/Kg)</th>
                  <th className="py-2 px-1 text-center">HD %</th>
                  <th className="py-2 px-1 text-center">Pakan</th>
                  <th className="py-2 px-1 text-center">FCR</th>
                  <th className="py-2 px-1 text-right">Mati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                {history.map((r) => (
                  <tr key={r.record_date} className="hover:bg-slate-50">
                    <td className="py-2.5 px-1 font-black text-slate-900">{r.record_date.slice(5)}</td>
                    <td className="py-2.5 px-1">
                      <div className="font-extrabold">{r.egg_good_pcs} btr</div>
                      <div className="text-[10px] text-slate-500 font-bold">{r.egg_good_kg} kg</div>
                    </td>
                    <td className="py-2.5 px-1 text-center font-black text-emerald-700">{r.hd_percent}%</td>
                    <td className="py-2.5 px-1 text-center font-bold text-slate-700">{r.feed_kg} kg</td>
                    <td className="py-2.5 px-1 text-center font-bold text-slate-700">{r.fcr}</td>
                    <td className="py-2.5 px-1 text-right font-black text-rose-600">{r.mortality_pcs}</td>
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
