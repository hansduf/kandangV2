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
  Scale,
} from 'lucide-react';
import { SaveConfirmationModal } from '@/components/SaveConfirmationModal';

interface SleekProductionInputProps {
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onSave: (record: DailyRecord) => Promise<void>;
  onSuccessClose?: () => void;
  previousEggPcs?: number;
  existingRecords?: DailyRecord[];
}

export const SleekProductionInput: React.FC<SleekProductionInputProps> = ({
  flocks,
  activeFlockId,
  onSave,
  onSuccessClose,
  previousEggPcs = 0,
  existingRecords = [],
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];
  const currentPopulation = activeFlock?.current_population || 1000;

  const todayStr = new Date().toISOString().split('T')[0];
  const [recordDate, setRecordDate] = useState(todayStr);

  const [eggGoodPcs, setEggGoodPcs] = useState<number | ''>('');

  // Unified kg & ratio input — last edited determines which drives calculation
  const [manualKg, setManualKg] = useState<number | ''>('');
  const [eggsPerKg, setEggsPerKg] = useState<number>(16);
  const [lastEdited, setLastEdited] = useState<'kg' | 'ratio'>('ratio');

  const [eggBadPcs, setEggBadPcs] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto pre-populate if today already has a record
  useEffect(() => {
    const existing = existingRecords.find(
      (r) => r.record_date === recordDate && (r.flock_id === activeFlockId || !r.flock_id)
    );
    if (existing && existing.egg_good_pcs > 0 && eggGoodPcs === '') {
      setEggGoodPcs(existing.egg_good_pcs);
      if (existing.egg_good_kg > 0) {
        setManualKg(existing.egg_good_kg);
        setLastEdited('kg');
      }
      if (existing.egg_bad_pcs > 0) {
        setEggBadPcs(existing.egg_bad_pcs);
      }
      if (existing.notes) {
        setNotes(existing.notes);
      }
    }
  }, [recordDate, activeFlockId, existingRecords]);

  const goodPcsNum = Number(eggGoodPcs) || 0;

  // Auto-sync: if user edits Kg -> ratio auto-calculates, and vice versa
  let finalKg = 0;
  let finalRatio = eggsPerKg > 0 ? eggsPerKg : 16;
  let avgWeightG = 0;

  if (lastEdited === 'kg') {
    // User typed Kg manually → compute ratio from (pcs / kg)
    finalKg = Number(manualKg) || 0;
    if (goodPcsNum > 0 && finalKg > 0) {
      finalRatio = Number((goodPcsNum / finalKg).toFixed(2));
      avgWeightG = Number(((finalKg * 1000) / goodPcsNum).toFixed(1));
    }
  } else {
    // User typed ratio → compute Kg from (pcs / ratio)
    finalRatio = eggsPerKg > 0 ? eggsPerKg : 16;
    if (goodPcsNum > 0) {
      finalKg = Number((goodPcsNum / finalRatio).toFixed(2));
      avgWeightG = Number(((finalKg * 1000) / goodPcsNum).toFixed(1));
    }
  }

  const liveHd = currentPopulation > 0 ? ((goodPcsNum / currentPopulation) * 100).toFixed(1) : '0.0';

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

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlock?.id) return;
    if (goodPcsNum <= 0 && (!eggBadPcs || Number(eggBadPcs) <= 0)) {
      alert('Isi jumlah butir telur terlebih dahulu!');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!activeFlock?.id) return;

    setIsSubmitting(true);
    setSuccessToast('');

    try {
      const existing = existingRecords.find(
        (r) => r.record_date === recordDate && (r.flock_id === activeFlock?.id || !r.flock_id)
      );

      await onSave({
        flock_id: activeFlock.id,
        record_date: recordDate,
        egg_good_pcs: goodPcsNum,
        egg_good_kg: finalKg,
        egg_bad_pcs: Number(eggBadPcs) || 0,
        egg_bad_kg: Number(((Number(eggBadPcs) || 0) * (finalRatio > 0 ? 1 / finalRatio : 1 / 16)).toFixed(2)),
        mortality_pcs: existing?.mortality_pcs || 0,
        culling_pcs: existing?.culling_pcs || 0,
        feed_kg: existing?.feed_kg || 0,
        notes: notes.trim(),
      });

      setShowConfirmModal(false);
      setSuccessToast(`✅ CATATAN PRODUKSI ${activeFlock.coop_name.toUpperCase()} BERHASIL DISIMPAN!`);
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
    <form onSubmit={handleOpenConfirm} className="space-y-3.5">
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

      {/* 2-COLUMN BALANCED EGG PRODUCTION INPUT */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* LEFT COLUMN: TELUR UTUH */}
        <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-3xl shadow-sm space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200 shrink-0">
                <Egg className="w-3.5 h-3.5 fill-[#00684a]" />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-tight">TELUR UTUH</span>
            </div>
            <span className="text-[9px] font-black text-[#00684a] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">Bagus</span>
          </div>

          {/* Stepper Butir */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 sm:p-2.5 text-center space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider">JUMLAH BUTIR</span>
              {previousEggPcs > 0 && (
                <button
                  type="button"
                  onClick={usePreviousValue}
                  className="text-[9px] sm:text-[10px] font-bold text-slate-400 hover:text-[#00684a] flex items-center gap-0.5 transition-colors"
                  title="Gunakan jumlah kemarin"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Kemarin ({previousEggPcs})</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => adjustPcs(-10)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center active:scale-95 transition-all hover:bg-slate-100 shadow-2xs shrink-0"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <input
                type="number"
                min="0"
                value={eggGoodPcs}
                onChange={(e) => setEggGoodPcs(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full text-center text-lg sm:text-xl font-black text-[#00684a] bg-transparent outline-none"
                required
              />
              <button
                type="button"
                onClick={() => adjustPcs(+10)}
                className="w-8 h-8 rounded-xl bg-[#00684a] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-all shadow-xs hover:bg-emerald-800 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <span className="block text-[9.5px] sm:text-[10px] font-semibold text-slate-400 truncate">
              {previousEggPcs > 0 ? (
                <>Terakhir: <strong className="text-slate-500">{previousEggPcs} btr</strong></>
              ) : (
                'Kondisi prima'
              )}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: TELUR RETAK */}
        <div className="bg-white p-3 sm:p-3.5 border border-slate-200 rounded-3xl shadow-sm space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-tight">TELUR RETAK</span>
            </div>
            <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">Cacat</span>
          </div>

          {/* Stepper Retak */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 sm:p-2.5 text-center space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] sm:text-[9px] font-black text-slate-500 uppercase tracking-wider">JUMLAH RETAK</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-700">Abnormal</span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => adjustBadPcs(-1)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center active:scale-95 transition-all hover:bg-slate-100 shadow-2xs shrink-0"
              >
                <Minus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <input
                type="number"
                min="0"
                value={eggBadPcs}
                onChange={(e) => setEggBadPcs(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full text-center text-lg sm:text-xl font-black text-amber-700 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => adjustBadPcs(+1)}
                className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center active:scale-95 transition-all shadow-xs hover:bg-amber-600 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <span className="block text-[9.5px] sm:text-[10px] font-semibold text-amber-600 truncate">
              Est. Berat: ~{((Number(eggBadPcs) || 0) * (finalRatio > 0 ? 1 / finalRatio : 1 / 16)).toFixed(2)} kg
            </span>
          </div>
        </div>
      </div>

      {/* BERAT & KILOAN TIMBANGAN (FULL-WIDTH BALANCED CARD) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[#00684a]" />
            <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
              Berat & Rasio Timbangan
            </span>
          </div>
          <span className="text-[9.5px] font-bold text-slate-400">
            Otomatis sinkron kg & rasio
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Box Total Kg */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 sm:p-2.5 space-y-1 shadow-inner">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
              Total Kg (Timbangan)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualKg}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  setManualKg(v);
                  setLastEdited('kg');
                }}
                placeholder="e.g. 10.5"
                className="w-full text-sm font-black text-[#00684a] bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#00684a]"
              />
              <span className="text-xs font-black text-slate-500">kg</span>
            </div>
          </div>

          {/* Box Rasio btr/kg */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 sm:p-2.5 space-y-1 shadow-inner">
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
              Rasio (Isi per 1 Kg)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="1"
                value={eggsPerKg}
                onChange={(e) => {
                  const v = Number(e.target.value) || 16;
                  setEggsPerKg(v);
                  setLastEdited('ratio');
                }}
                className="w-full text-sm font-black text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-center outline-none focus:border-[#00684a]"
              />
              <span className="text-xs font-black text-slate-500">btr/kg</span>
            </div>
          </div>
        </div>

        {/* Live Calculation Result Badge */}
        {goodPcsNum > 0 && finalKg > 0 && (
          <div className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1">
              <span>⚖️ Rata-rata:</span>
              <span>{finalRatio.toFixed(1)} btr/kg ({avgWeightG}g/butir)</span>
            </span>
            <span className="text-[#00684a] font-extrabold">{finalKg} kg total</span>
          </div>
        )}
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
            <span className="block text-[9px] font-black uppercase tracking-wider text-amber-400">Rata2 Weight</span>
            <span className="text-base font-black text-white">{avgWeightG}g</span>
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

      {/* Confirmation Modal */}
      <SaveConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={isSubmitting}
        title="Konfirmasi Catatan Produksi Telur"
        coopName={activeFlock?.coop_name || 'Kandang'}
        flockName={activeFlock?.name}
        recordDate={recordDate}
        items={[
          { label: 'Telur Utuh', value: `${goodPcsNum.toLocaleString('id-ID')} butir`, highlight: true },
          { label: 'Berat Telur Utuh', value: `${finalKg} kg` },
          { label: 'Telur Retak / Rusak', value: `${Number(eggBadPcs) || 0} butir` },
          { label: 'Est. Hen-Day', value: `${liveHd}%` },
          { label: 'Rata-rata Butir/Kg', value: `${finalRatio.toFixed(1)} btr/kg (${avgWeightG}g/btr)` },
        ]}
      />
    </form>
  );
};

