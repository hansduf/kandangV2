'use client';

import React, { useState } from 'react';
import { DailyRecord } from '@/types/database';
import { Save, CheckCircle2, Egg, Wheat, Skull, AlertTriangle } from 'lucide-react';

interface DailyRecordFormProps {
  flockId: string;
  currentPopulation: number;
  initialDate?: string;
  onSave: (record: DailyRecord) => Promise<void>;
}

export const DailyRecordForm: React.FC<DailyRecordFormProps> = ({
  flockId,
  currentPopulation,
  initialDate,
  onSave,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate || today);

  const [eggGoodPcs, setEggGoodPcs] = useState<number | ''>(1740);
  const [eggGoodKg, setEggGoodKg] = useState<number | ''>(108.5);

  const [eggBadPcs, setEggBadPcs] = useState<number | ''>(12);
  const [eggBadKg, setEggBadKg] = useState<number | ''>(0.75);

  const [mortalityPcs, setMortalityPcs] = useState<number | ''>(0);
  const [cullingPcs, setCullingPcs] = useState<number | ''>(0);

  const [feedKg, setFeedKg] = useState<number | ''>(230);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Real-time Calculators
  const goodPcsNum = Number(eggGoodPcs) || 0;
  const goodKgNum = Number(eggGoodKg) || 0;
  const feedKgNum = Number(feedKg) || 0;

  const previewHd = currentPopulation > 0 ? ((goodPcsNum / currentPopulation) * 100).toFixed(1) : '0.0';
  const previewFcr = goodKgNum > 0 ? (feedKgNum / goodKgNum).toFixed(2) : '0.00';
  const previewAvgEggWeight = goodPcsNum > 0 ? ((goodKgNum * 1000) / goodPcsNum).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      await onSave({
        flock_id: flockId,
        record_date: date,
        egg_good_pcs: Number(eggGoodPcs) || 0,
        egg_good_kg: Number(eggGoodKg) || 0,
        egg_bad_pcs: Number(eggBadPcs) || 0,
        egg_bad_kg: Number(eggBadKg) || 0,
        mortality_pcs: Number(mortalityPcs) || 0,
        culling_pcs: Number(cullingPcs) || 0,
        feed_kg: Number(feedKg) || 0,
        notes,
      });

      setSuccessMessage('Data harian berhasil disimpan!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('Gagal menyimpan data harian. Pastikan koneksi atau Supabase terkonfigurasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date Input */}
      <div className="stat-card p-3.5">
        <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pencatatan</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      {/* Telur Utuh / Bagus */}
      <div className="stat-card p-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Egg className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Produksi Telur Utuh</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jumlah (Butir)</label>
            <input
              type="number"
              min="0"
              value={eggGoodPcs}
              onChange={(e) => setEggGoodPcs(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 1740"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Total Berat (Kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={eggGoodKg}
              onChange={(e) => setEggGoodKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 108.5"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Telur Retak / Rusak (Opsional) */}
      <div className="stat-card p-4 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Telur Retak / Rusak (Afkir)</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jumlah (Butir)</label>
            <input
              type="number"
              min="0"
              value={eggBadPcs}
              onChange={(e) => setEggBadPcs(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Berat (Kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={eggBadKg}
              onChange={(e) => setEggBadKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Kematian & Afkir & Pakan */}
      <div className="grid grid-cols-2 gap-3">
        {/* Kematian */}
        <div className="stat-card p-3.5 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-1.5 mb-2">
            <Skull className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-800">Mati & Afkir</h4>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Mati (Ekor)</label>
              <input
                type="number"
                min="0"
                value={mortalityPcs}
                onChange={(e) => setMortalityPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Afkir (Ekor)</label>
              <input
                type="number"
                min="0"
                value={cullingPcs}
                onChange={(e) => setCullingPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Pakan */}
        <div className="stat-card p-3.5 border-l-4 border-l-blue-500 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
            <Wheat className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800">Konsumsi Pakan</h4>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Jumlah (Kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={feedKg}
              onChange={(e) => setFeedKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 230"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-[10px] font-medium text-slate-400 mt-1">~{(Number(feedKg) / 50).toFixed(1)} Sak (@50kg)</p>
          </div>
        </div>
      </div>

      {/* Live Calculated Preview Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Hen-Day (HD)</span>
          <span className="text-lg font-black text-emerald-900">{previewHd}%</span>
        </div>
        <div className="h-7 w-[1px] bg-emerald-200" />
        <div className="text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">FCR Pakan</span>
          <span className="text-lg font-black text-emerald-900">{previewFcr}</span>
        </div>
        <div className="h-7 w-[1px] bg-emerald-200" />
        <div className="text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Rata2 Telur</span>
          <span className="text-lg font-black text-emerald-900">{previewAvgEggWeight}g</span>
        </div>
      </div>

      {/* Notes */}
      <div className="stat-card p-3.5">
        <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Kondisi cuaca, penggantian pakan, dll..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-600 text-white rounded-xl p-3 text-xs font-bold flex items-center gap-2 shadow-md animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all text-sm active:scale-95"
      >
        <Save className="w-5 h-5" />
        <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Harian'}</span>
      </button>
    </form>
  );
};
