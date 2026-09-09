'use client';

import React, { useState } from 'react';
import { DailyRecord, Flock } from '@/types/database';
import {
  Egg,
  AlertTriangle,
  Plus,
  Minus,
  Save,
  TrendingUp,
  Scale,
  Home,
} from 'lucide-react';

interface SleekProductionInputProps {
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onSave: (record: DailyRecord) => Promise<void>;
  onSuccessClose?: () => void;
}

export const SleekProductionInput: React.FC<SleekProductionInputProps> = ({
  flocks,
  activeFlockId,
  onSelectFlock,
  onSave,
  onSuccessClose,
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];
  const currentPopulation = activeFlock?.current_population || 1000;

  const todayStr = new Date().toISOString().split('T')[0];
  const [recordDate, setRecordDate] = useState(todayStr);

  const [eggGoodPcs, setEggGoodPcs] = useState<number | ''>(1740);
  const [eggGoodKg, setEggGoodKg] = useState<number | ''>(108.5);

  const [eggBadPcs, setEggBadPcs] = useState<number | ''>(10);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Live Calculators
  const goodPcsNum = Number(eggGoodPcs) || 0;
  const goodKgNum = Number(eggGoodKg) || 0;

  const liveHd = currentPopulation > 0 ? ((goodPcsNum / currentPopulation) * 100).toFixed(1) : '0.0';
  const liveAvgWeight = goodPcsNum > 0 ? ((goodKgNum * 1000) / goodPcsNum).toFixed(1) : '0.0';

  const adjustPcs = (amount: number) => {
    const current = Number(eggGoodPcs) || 0;
    const nextVal = Math.max(0, current + amount);
    setEggGoodPcs(nextVal);
    setEggGoodKg(Number((nextVal * 0.0623).toFixed(2)));
  };

  const adjustBadPcs = (amount: number) => {
    const current = Number(eggBadPcs) || 0;
    setEggBadPcs(Math.max(0, current + amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlock?.id) return;

    setIsSubmitting(true);
    setSuccessToast('');

    try {
      await onSave({
        flock_id: activeFlock.id,
        record_date: recordDate,
        egg_good_pcs: Number(eggGoodPcs) || 0,
        egg_good_kg: Number(eggGoodKg) || 0,
        egg_bad_pcs: Number(eggBadPcs) || 0,
        egg_bad_kg: Number(((Number(eggBadPcs) || 0) * 0.06).toFixed(2)),
        mortality_pcs: 0,
        culling_pcs: 0,
        feed_kg: 0,
        notes: notes.trim(),
      });

      setSuccessToast('✅ CATATAN PRODUKSI BERHASIL DISIMPAN!');
      setTimeout(() => {
        setSuccessToast('');
        if (onSuccessClose) onSuccessClose();
      }, 1200);
    } catch (err) {
      alert('Gagal menyimpan catatan produksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* BANNER INFORMASI KANDANG & ANGKATAN AKTIF */}
      {activeFlock && (
        <div className="bg-gradient-to-r from-[#00684a] via-[#046a38] to-emerald-900 rounded-2xl p-3.5 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-xs">
              <Home className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 bg-white/20 px-2 py-0.5 rounded-md border border-white/20">
                  {activeFlock.coop_name}
                </span>
                <span className="text-[10px] font-bold text-emerald-100">• {activeFlock.strain}</span>
              </div>
              <h4 className="text-xs font-black leading-tight text-white">{activeFlock.name}</h4>
              <p className="text-[11px] font-medium text-emerald-50 mt-0.5">
                Populasi: <strong className="text-white font-black">{currentPopulation} ekor</strong> (Umur {activeFlock.age_weeks} Mgg)
              </p>
            </div>
          </div>

          {/* Kandang Switcher Dropdown */}
          {flocks.length > 1 && (
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-white/90 text-slate-900 text-[11px] font-black rounded-xl px-2.5 py-1.5 outline-none cursor-pointer border border-white/40 shadow-xs"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id} className="bg-white text-slate-900 font-bold">
                  {f.coop_name} - {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* 2-COLUMN EGG PRODUCTION INPUT */}
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: TELUR UTUH (BUTIR & KG) */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-3xl shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200">
                <Egg className="w-3.5 h-3.5 fill-[#00684a]" />
              </div>
              <span className="text-xs font-black text-slate-800 uppercase">TELUR UTUH</span>
            </div>
            <span className="text-[9px] font-black text-[#00684a] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">Bagus</span>
          </div>

          {/* Stepper Butir */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center space-y-1.5 shadow-inner">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">JUMLAH BUTIR</span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => adjustPcs(-10)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-base flex items-center justify-center active:scale-95 transition-all hover:bg-slate-100 shadow-xs"
              >
                <Minus className="w-4 h-4 stroke-[3]" />
              </button>
              <input
                type="number"
                min="0"
                value={eggGoodPcs}
                onChange={(e) => setEggGoodPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-16 text-center text-xl font-black text-[#00684a] bg-transparent outline-none"
                required
              />
              <button
                type="button"
                onClick={() => adjustPcs(+10)}
                className="w-8 h-8 rounded-xl bg-[#00684a] text-white font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-xs hover:bg-emerald-800"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Total Kg Timbangan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1 shadow-inner">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">BERAT TIMBANGAN (KG)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={eggGoodKg}
                onChange={(e) => setEggGoodKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="108.5"
                className="w-full text-right text-base font-black text-amber-700 bg-white border border-amber-200 rounded-xl px-2.5 py-1 outline-none focus:border-amber-500"
                required
              />
              <span className="text-xs font-black text-slate-500">kg</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TELUR RETAK / CACAT */}
        <div className="bg-white p-3.5 border border-slate-200 rounded-3xl shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <span className="text-xs font-black text-slate-800 uppercase">TELUR RETAK</span>
            </div>
            <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">Cacat</span>
          </div>

          {/* Stepper Retak */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center space-y-1.5 shadow-inner">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">JUMLAH RETAK (BTR)</span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => adjustBadPcs(-1)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-base flex items-center justify-center active:scale-95 transition-all hover:bg-slate-100 shadow-xs"
              >
                <Minus className="w-4 h-4 stroke-[3]" />
              </button>
              <input
                type="number"
                min="0"
                value={eggBadPcs}
                onChange={(e) => setEggBadPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-16 text-center text-xl font-black text-amber-700 bg-transparent outline-none"
                required
              />
              <button
                type="button"
                onClick={() => adjustBadPcs(+1)}
                className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-xs hover:bg-amber-600"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Est. Weight Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center space-y-1 shadow-inner">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">ESTIMASI BERAT RETAK</span>
            <span className="text-sm font-black text-amber-700">
              ~{((Number(eggBadPcs) || 0) * 0.06).toFixed(2)} kg
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER BAR: LIVE GAUGE + SAVE BUTTON */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-400">Est. Hen-Day</span>
            <span className="text-base font-black text-white">{liveHd}%</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-amber-400">Rata2 Berat</span>
            <span className="text-base font-black text-white">{liveAvgWeight}g</span>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#00684a] hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 text-xs transition-all"
        >
          <Save className="w-4 h-4 stroke-[3]" />
          <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN'}</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="bg-[#00684a] text-white rounded-2xl p-3 text-center text-xs font-black shadow-lg animate-bounce">
          {successToast}
        </div>
      )}
    </form>
  );
};

