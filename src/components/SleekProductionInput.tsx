'use client';

import React, { useState } from 'react';
import { DailyRecord, Flock } from '@/types/database';
import {
  Egg,
  Wheat,
  AlertTriangle,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  TrendingUp,
  Scale,
  Home,
  Layers,
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
  const [feedKg, setFeedKg] = useState<number | ''>(230);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Live Calculators
  const goodPcsNum = Number(eggGoodPcs) || 0;
  const goodKgNum = Number(eggGoodKg) || 0;
  const feedKgNum = Number(feedKg) || 0;

  const liveHd = currentPopulation > 0 ? ((goodPcsNum / currentPopulation) * 100).toFixed(1) : '0.0';
  const liveFcr = goodKgNum > 0 ? (feedKgNum / goodKgNum).toFixed(2) : '0.00';

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

  const selectSakPakan = (sakCount: number) => {
    setFeedKg(sakCount * 50);
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
        feed_kg: Number(feedKg) || 0,
        notes: notes.trim(),
      });

      setSuccessToast('✅ CATATAN HARIAN BERHASIL DISIMPAN!');
      setTimeout(() => {
        setSuccessToast('');
        if (onSuccessClose) onSuccessClose();
      }, 1200);
    } catch (err) {
      alert('Gagal menyimpan catatan harian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* BANNER INFORMASI KANDANG & ANGKATAN AKTIF */}
      {activeFlock && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-2xl p-3 text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-emerald-200">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-300">
                  {activeFlock.coop_name}
                </span>
                <span className="text-[10px] font-semibold text-emerald-200">• {activeFlock.strain}</span>
              </div>
              <h4 className="text-xs font-black leading-tight text-white">{activeFlock.name}</h4>
              <p className="text-[10px] font-medium text-emerald-100">
                Populasi: <strong className="text-white font-bold">{currentPopulation} ekor</strong> (Umur {activeFlock.age_weeks} Mgg)
              </p>
            </div>
          </div>

          {/* Kandang Switcher Dropdown */}
          {flocks.length > 1 && (
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-white/20 text-white text-[11px] font-bold rounded-xl px-2 py-1 outline-none cursor-pointer border border-white/30"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id} className="text-slate-900 font-bold">
                  {f.coop_name} - {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* COMPACT 2-COLUMN GRID LAYOUT (PAS 1 LAYAR HP) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* LEFT COLUMN: TELUR UTUH (BUTIR & KG) */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Egg className="w-3.5 h-3.5 fill-emerald-200" />
              </div>
              <span className="text-xs font-black text-slate-900 uppercase">TELUR UTUH</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">Bagus</span>
          </div>

          {/* Stepper Butir */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">JUMLAH BUTIR</span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => adjustPcs(-10)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-800 font-black text-base flex items-center justify-center active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                value={eggGoodPcs}
                onChange={(e) => setEggGoodPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-16 text-center text-xl font-black text-slate-900 bg-transparent outline-none"
                required
              />
              <button
                type="button"
                onClick={() => adjustPcs(+10)}
                className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-base flex items-center justify-center active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total Kg Timbangan */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">BERAT TIMBANGAN (KG)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={eggGoodKg}
                onChange={(e) => setEggGoodKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="108.5"
                className="w-full text-right text-base font-black text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2 py-1 outline-none"
                required
              />
              <span className="text-xs font-bold text-slate-500">kg</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TELUR RETAK & PAKAN */}
        <div className="flex flex-col gap-2.5">
          {/* Box Telur Retak */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-900 uppercase">TELUR RETAK</span>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded-md">Cacat</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => adjustBadPcs(-1)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold flex items-center justify-center active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustBadPcs(+1)}
                  className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={eggBadPcs}
                onChange={(e) => setEggBadPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-12 text-center text-sm font-black text-amber-900 bg-white border border-amber-300 rounded-lg py-0.5 outline-none"
              />
            </div>
          </div>

          {/* Box Pakan Terpakai */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-900 uppercase">PAKAN (KG/SAK)</span>
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded-md">Pakan</span>
            </div>

            {/* Quick Sak Pills */}
            <div className="grid grid-cols-2 gap-1">
              {[4, 5].map((sak) => (
                <button
                  key={sak}
                  type="button"
                  onClick={() => selectSakPakan(sak)}
                  className={`py-1 text-[10px] font-black rounded-lg border transition-all active:scale-95 ${
                    feedKgNum === sak * 50
                      ? 'bg-blue-600 text-white border-transparent'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {sak} Sak ({sak * 50}kg)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                value={feedKg}
                onChange={(e) => setFeedKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="230"
                className="w-full text-right text-sm font-black text-blue-900 bg-slate-50 border border-blue-300 rounded-lg px-2 py-1 outline-none"
                required
              />
              <span className="text-xs font-bold text-slate-500">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAR: LIVE GAUGE + SAVE BUTTON */}
      <div className="bg-slate-900 rounded-2xl p-2.5 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div>
            <span className="block text-[9px] font-bold uppercase text-emerald-400">Est. Hen-Day</span>
            <span className="text-sm font-black text-white">{liveHd}%</span>
          </div>
          <div className="h-5 w-[1px] bg-slate-700" />
          <div>
            <span className="block text-[9px] font-bold uppercase text-blue-400">FCR Pakan</span>
            <span className="text-sm font-black text-white">{liveFcr}</span>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 text-xs transition-all active:scale-95"
        >
          <Save className="w-4 h-4 stroke-[2.5]" />
          <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN'}</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="bg-emerald-700 text-white rounded-xl p-3 text-center text-xs font-black shadow-md animate-bounce">
          {successToast}
        </div>
      )}
    </form>
  );
};
