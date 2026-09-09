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
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* BANNER INFORMASI KANDANG & ANGKATAN AKTIF */}
      {activeFlock && (
        <div className="bg-gradient-to-r from-emerald-900/80 via-teal-900/60 to-slate-900 rounded-2xl p-3.5 border border-emerald-500/30 text-white shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {activeFlock.coop_name}
                </span>
                <span className="text-[10px] font-bold text-slate-400">• {activeFlock.strain}</span>
              </div>
              <h4 className="text-xs font-black leading-tight text-white">{activeFlock.name}</h4>
              <p className="text-[11px] font-medium text-slate-300 mt-0.5">
                Populasi: <strong className="text-white font-black">{currentPopulation} ekor</strong> (Umur {activeFlock.age_weeks} Mgg)
              </p>
            </div>
          </div>

          {/* Kandang Switcher Dropdown */}
          {flocks.length > 1 && (
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-slate-800 text-white text-[11px] font-black rounded-xl px-2.5 py-1.5 outline-none cursor-pointer border border-slate-700 shadow-inner"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white font-bold">
                  {f.coop_name} - {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* COMPACT 2-COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: TELUR UTUH (BUTIR & KG) */}
        <div className="glass-card p-3.5 border border-slate-700/80 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Egg className="w-3.5 h-3.5 fill-emerald-300" />
              </div>
              <span className="text-xs font-black text-white uppercase">TELUR UTUH</span>
            </div>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">Bagus</span>
          </div>

          {/* Stepper Butir */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 text-center space-y-1.5 shadow-inner">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">JUMLAH BUTIR</span>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => adjustPcs(-10)}
                className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-black text-base flex items-center justify-center active:scale-95 transition-all hover:bg-slate-700"
              >
                <Minus className="w-4 h-4 stroke-[3]" />
              </button>
              <input
                type="number"
                min="0"
                value={eggGoodPcs}
                onChange={(e) => setEggGoodPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-16 text-center text-xl font-black text-emerald-400 bg-transparent outline-none"
                required
              />
              <button
                type="button"
                onClick={() => adjustPcs(+10)}
                className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-base flex items-center justify-center active:scale-95 transition-all shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Total Kg Timbangan */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 space-y-1 shadow-inner">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">BERAT TIMBANGAN (KG)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={eggGoodKg}
                onChange={(e) => setEggGoodKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="108.5"
                className="w-full text-right text-base font-black text-amber-400 bg-slate-900 border border-amber-500/30 rounded-xl px-2.5 py-1 outline-none focus:border-amber-400"
                required
              />
              <span className="text-xs font-black text-slate-400">kg</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TELUR RETAK & PAKAN */}
        <div className="flex flex-col gap-3">
          {/* Box Telur Retak */}
          <div className="glass-card p-3 border border-slate-700/80 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-white uppercase">TELUR RETAK</span>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-md">Cacat</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-2 shadow-inner">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustBadPcs(-1)}
                  className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-black flex items-center justify-center active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustBadPcs(+1)}
                  className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center active:scale-95 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={eggBadPcs}
                onChange={(e) => setEggBadPcs(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-12 text-center text-sm font-black text-amber-300 bg-slate-900 border border-amber-500/30 rounded-xl py-1 outline-none"
              />
            </div>
          </div>

          {/* Box Pakan Terpakai */}
          <div className="glass-card p-3 border border-slate-700/80 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-white uppercase">PAKAN (KG/SAK)</span>
              <span className="text-[9px] font-black text-blue-400 bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 rounded-md">Pakan</span>
            </div>

            {/* Quick Sak Pills */}
            <div className="grid grid-cols-2 gap-1.5">
              {[4, 5].map((sak) => (
                <button
                  key={sak}
                  type="button"
                  onClick={() => selectSakPakan(sak)}
                  className={`py-1 text-[10px] font-black rounded-xl border transition-all active:scale-95 ${
                    feedKgNum === sak * 50
                      ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {sak} Sak ({sak * 50}kg)
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                value={feedKg}
                onChange={(e) => setFeedKg(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="230"
                className="w-full text-right text-sm font-black text-blue-300 bg-slate-900 border border-blue-500/30 rounded-xl px-2.5 py-1.5 outline-none"
                required
              />
              <span className="text-xs font-black text-slate-400">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAR: LIVE GAUGE + SAVE BUTTON */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-400">Est. Hen-Day</span>
            <span className="text-base font-black text-white">{liveHd}%</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div>
            <span className="block text-[9px] font-black uppercase tracking-wider text-blue-400">FCR Pakan</span>
            <span className="text-base font-black text-white">{liveFcr}</span>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 text-xs transition-all"
        >
          <Save className="w-4 h-4 stroke-[3]" />
          <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN'}</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="bg-emerald-500 text-slate-950 rounded-2xl p-3 text-center text-xs font-black shadow-lg shadow-emerald-500/30 animate-bounce">
          {successToast}
        </div>
      )}
    </form>
  );
};

