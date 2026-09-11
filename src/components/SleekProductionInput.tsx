'use client';

import React, { useState, useEffect } from 'react';
import { DailyRecord, Flock } from '@/types/database';
import {
  Egg,
  AlertTriangle,
  Plus,
  Minus,
  Save,
  RotateCcw,
  Settings2,
} from 'lucide-react';

interface SleekProductionInputProps {
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onSave: (record: DailyRecord) => Promise<void>;
  onSuccessClose?: () => void;
  previousEggPcs?: number;
}

export const SleekProductionInput: React.FC<SleekProductionInputProps> = ({
  flocks,
  activeFlockId,
  onSave,
  onSuccessClose,
  previousEggPcs = 0,
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];
  const currentPopulation = activeFlock?.current_population || 1000;

  const todayStr = new Date().toISOString().split('T')[0];
  const [recordDate, setRecordDate] = useState(todayStr);

  const [eggGoodPcs, setEggGoodPcs] = useState<number | ''>('');
  const [eggsPerKg, setEggsPerKg] = useState<number>(16); // Default 16 btr per kg

  const [eggBadPcs, setEggBadPcs] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Live Calculators
  const goodPcsNum = Number(eggGoodPcs) || 0;
  const ratioNum = Number(eggsPerKg) > 0 ? Number(eggsPerKg) : 16;
  const calculatedKg = Number((goodPcsNum / ratioNum).toFixed(2));

  const liveHd = currentPopulation > 0 ? ((goodPcsNum / currentPopulation) * 100).toFixed(1) : '0.0';
  const liveAvgWeight = goodPcsNum > 0 ? ((calculatedKg * 1000) / goodPcsNum).toFixed(1) : '0.0';

  const adjustPcs = (amount: number) => {
    const current = Number(eggGoodPcs) || 0;
    const nextVal = Math.max(0, current + amount);
    setEggGoodPcs(nextVal > 0 ? nextVal : '');
  };

  const adjustBadPcs = (amount: number) => {
    const current = Number(eggBadPcs) || 0;
    const nextVal = Math.max(0, current + amount);
    setEggBadPcs(nextVal > 0 ? nextVal : '');
  };

  const usePreviousValue = () => {
    if (previousEggPcs > 0) {
      setEggGoodPcs(previousEggPcs);
    }
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
        egg_good_kg: calculatedKg,
        egg_bad_pcs: Number(eggBadPcs) || 0,
        egg_bad_kg: Number(((Number(eggBadPcs) || 0) * (1 / ratioNum)).toFixed(2)),
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
      {/* TANGGAL PENCATATAN */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Tanggal Pencatatan</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-xs font-black rounded-xl px-3 py-1.5 outline-none focus:border-[#00684a]"
          required
        />
      </div>

      {/* 2-COLUMN EGG PRODUCTION INPUT */}
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: TELUR UTUH (BUTIR & RASIO PER KG) */}
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
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">JUMLAH BUTIR</span>
              {previousEggPcs > 0 && (
                <button
                  type="button"
                  onClick={usePreviousValue}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#00684a] flex items-center gap-1 transition-colors"
                  title="Gunakan jumlah catatan sebelumnya"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Sama kemarin ({previousEggPcs.toLocaleString('id-ID')} btr)</span>
                </button>
              )}
            </div>

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
                placeholder="0"
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
            
            {/* Tracking text abu-abu jika ada record kemarin */}
            {previousEggPcs > 0 && (
              <span className="block text-[10px] font-semibold text-slate-400">
                Terakhir: <strong className="text-slate-500 font-bold">{previousEggPcs.toLocaleString('id-ID')} btr</strong>
              </span>
            )}
          </div>

          {/* Pengaturan Rasio Telur per 1 Kg */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Settings2 className="w-3 h-3 text-slate-400" />
                ISI PER 1 KG
              </span>
              <span className="text-[10px] font-black text-[#00684a]">{calculatedKg} kg</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="1"
                value={eggsPerKg}
                onChange={(e) => setEggsPerKg(Number(e.target.value) || 16)}
                className="w-full text-center text-xs font-black text-slate-900 bg-white border border-slate-300 rounded-xl px-2 py-1 outline-none focus:border-[#00684a]"
                required
              />
              <span className="text-[10px] font-bold text-slate-500 shrink-0">btr/kg</span>
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
                placeholder="0"
                className="w-16 text-center text-xl font-black text-amber-700 bg-transparent outline-none"
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
              ~{((Number(eggBadPcs) || 0) * (1 / ratioNum)).toFixed(2)} kg
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
