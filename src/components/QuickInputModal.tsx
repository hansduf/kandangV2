'use client';

import React, { useState } from 'react';
import { DailyRecord, HealthRecord, Flock } from '@/types/database';
import { SleekProductionInput } from '@/components/SleekProductionInput';
import { GiantStepperInput } from '@/components/GiantStepperInput';
import { SaveConfirmationModal, ConfirmationSummaryItem } from '@/components/SaveConfirmationModal';
import {
  X,
  Egg,
  Syringe,
  Skull,
  Save,
  Pill,
  ShieldAlert,
  Sparkles,
  Home,
  Users,
  AlertTriangle,
  Wheat,
  Scale,
  CheckCircle2,
} from 'lucide-react';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onSaveDaily: (record: DailyRecord) => Promise<void>;
  onSaveHealth: (record: HealthRecord) => Promise<void>;
  onSaveFeed?: (record: { flock_id: string; record_date: string; feed_morning_kg?: number; feed_afternoon_kg?: number; feed_kg: number; notes?: string }) => Promise<void>;
  previousEggPcs?: number;
  existingRecords?: DailyRecord[];
  initialTab?: 'daily' | 'feed' | 'health' | 'mortality';
  initialHealthCategory?: 'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan';
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({
  isOpen,
  onClose,
  flocks,
  activeFlockId,
  onSelectFlock,
  onSaveDaily,
  onSaveHealth,
  onSaveFeed,
  previousEggPcs = 0,
  existingRecords = [],
  initialTab = 'daily',
  initialHealthCategory = 'Vaksin',
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'daily' | 'feed' | 'health' | 'mortality'>(initialTab);

  // Health State
  const [recordDate, setRecordDate] = useState(todayStr);
  const [healthCategory, setHealthCategory] = useState<'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'>(initialHealthCategory);

  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialHealthCategory) setHealthCategory(initialHealthCategory);
    }
  }, [isOpen, initialTab, initialHealthCategory]);

  const [healthItemName, setHealthItemName] = useState('');
  const [healthDosage, setHealthDosage] = useState('');
  const [vaccinatedBirdsCount, setVaccinatedBirdsCount] = useState<number | ''>('');
  const [healthMethod, setHealthMethod] = useState('Air Minum');
  const [healthNotes, setHealthNotes] = useState('');

  // Mortality State
  const [mortalityPcs, setMortalityPcs] = useState<number | ''>('');
  const [cullingPcs, setCullingPcs] = useState<number | ''>('');

  // Feed State
  const [feedDate, setFeedDate] = useState(todayStr);
  const [feedMorningKg, setFeedMorningKg] = useState<number | ''>('');
  const [feedAfternoonKg, setFeedAfternoonKg] = useState<number | ''>('');
  const [feedTotalKg, setFeedTotalKg] = useState<number | ''>('');
  const [feedNotes, setFeedNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    categoryBadge?: string;
    items: ConfirmationSummaryItem[];
    action: () => Promise<void>;
  } | null>(null);

  // Auto pre-populate feed if record exists
  React.useEffect(() => {
    const existing = existingRecords.find(
      (r) => r.record_date === feedDate && (r.flock_id === activeFlock?.id || !r.flock_id)
    );
    if (existing && existing.feed_kg > 0 && feedTotalKg === '' && feedMorningKg === '' && feedAfternoonKg === '') {
      setFeedTotalKg(existing.feed_kg);
      if (existing.feed_morning_kg) setFeedMorningKg(existing.feed_morning_kg);
      if (existing.feed_afternoon_kg) setFeedAfternoonKg(existing.feed_afternoon_kg);
    }
  }, [feedDate, activeFlock?.id, existingRecords, activeTab]);

  // Auto pre-populate mortality if record exists
  React.useEffect(() => {
    const existing = existingRecords.find(
      (r) => r.record_date === recordDate && (r.flock_id === activeFlock?.id || !r.flock_id)
    );
    if (existing) {
      if (existing.mortality_pcs > 0 && mortalityPcs === '') {
        setMortalityPcs(existing.mortality_pcs);
      }
      if (existing.culling_pcs > 0 && cullingPcs === '') {
        setCullingPcs(existing.culling_pcs);
      }
    }
  }, [recordDate, activeFlock?.id, existingRecords, activeTab]);

  if (!isOpen) return null;

  const currentPopulation = activeFlock?.current_population || 0;

  // Real-time Feed & FCR Computations
  const morningNum = Number(feedMorningKg) || 0;
  const afternoonNum = Number(feedAfternoonKg) || 0;
  const computedFeedSum = Number((morningNum + afternoonNum).toFixed(2));
  const effectiveFeedTotal = feedTotalKg !== '' ? Number(feedTotalKg) || 0 : (computedFeedSum > 0 ? computedFeedSum : 0);

  const currentFeedRecord = existingRecords.find(
    (r) => r.record_date === feedDate && (r.flock_id === activeFlock?.id || !r.flock_id)
  );
  const existingGoodKg = currentFeedRecord?.egg_good_kg || 0;
  const existingBadKg = currentFeedRecord?.egg_bad_kg || 0;
  const existingBadPcs = currentFeedRecord?.egg_bad_pcs || 0;
  const existingGoodPcs = currentFeedRecord?.egg_good_pcs || 0;
  let totalEggKgToday = existingGoodKg + existingBadKg;
  if (existingBadKg === 0 && existingBadPcs > 0 && existingGoodPcs > 0 && existingGoodKg > 0) {
    totalEggKgToday += (existingBadPcs * (existingGoodKg / existingGoodPcs));
  }
  const totalEggPcsToday = existingGoodPcs + existingBadPcs;

  const liveFeedIntake = currentPopulation > 0 && effectiveFeedTotal > 0 
    ? Number(((effectiveFeedTotal * 1000) / currentPopulation).toFixed(1)) 
    : 0;

  const liveFcr = totalEggKgToday > 0 && effectiveFeedTotal > 0 
    ? Number((effectiveFeedTotal / totalEggKgToday).toFixed(2)) 
    : null;

  const executeSaveHealth = async () => {
    if (!activeFlock?.id) return;
    setIsSubmitting(true);
    try {
      await onSaveHealth({
        flock_id: activeFlock.id,
        record_date: recordDate,
        category: healthCategory,
        item_name: healthItemName.trim(),
        dosage: healthDosage.trim(),
        vaccinated_birds_count: Number(vaccinatedBirdsCount) || currentPopulation,
        method: healthMethod,
        notes: healthNotes.trim(),
      });
      setShowConfirmModal(false);
      setToastMessage(`✅ ${healthCategory.toUpperCase()} ${activeFlock.coop_name.toUpperCase()} BERHASIL DISIMPAN!`);
      setTimeout(() => {
        setToastMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      alert('Gagal menyimpan data kesehatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHealthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthItemName.trim()) {
      alert('Pilih atau isi nama obat/vaksin!');
      return;
    }
    if (!activeFlock?.id) return;

    setConfirmConfig({
      title: `Konfirmasi Catatan ${healthCategory}`,
      categoryBadge: healthCategory,
      items: [
        { label: 'Nama Obat / Vaksin', value: healthItemName.trim(), highlight: true },
        { label: 'Dosis', value: healthDosage.trim() || '-' },
        { label: 'Jumlah Ayam Ditangani', value: `${(Number(vaccinatedBirdsCount) || currentPopulation).toLocaleString('id-ID')} ekor` },
        { label: 'Metode Aplikasi', value: healthMethod },
        ...(healthNotes.trim() ? [{ label: 'Catatan SOP', value: healthNotes.trim() }] : []),
      ],
      action: executeSaveHealth,
    });
    setShowConfirmModal(true);
  };

  const executeSaveMortality = async () => {
    if (!activeFlock?.id) return;
    setIsSubmitting(true);
    try {
      const existing = existingRecords.find(
        (r) => r.record_date === recordDate && (r.flock_id === activeFlock?.id || !r.flock_id)
      );

      await onSaveDaily({
        flock_id: activeFlock.id,
        record_date: recordDate,
        egg_good_pcs: existing?.egg_good_pcs || 0,
        egg_good_kg: existing?.egg_good_kg || 0,
        egg_bad_pcs: existing?.egg_bad_pcs || 0,
        egg_bad_kg: existing?.egg_bad_kg || 0,
        mortality_pcs: Number(mortalityPcs) || 0,
        culling_pcs: Number(cullingPcs) || 0,
        feed_kg: existing?.feed_kg || 0,
        notes: existing?.notes ? `${existing.notes}; Kematian` : 'Kematian/Afkir',
      });
      setShowConfirmModal(false);
      setToastMessage(`✅ KEMATIAN ${activeFlock.coop_name.toUpperCase()} BERHASIL DISIMPAN!`);
      setTimeout(() => {
        setToastMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      alert('Gagal menyimpan data kematian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMortalitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlock?.id) return;
    const mortNum = Number(mortalityPcs) || 0;
    const cullNum = Number(cullingPcs) || 0;
    if (mortNum <= 0 && cullNum <= 0) {
      alert('Isi jumlah kematian atau afkir terlebih dahulu!');
      return;
    }

    setConfirmConfig({
      title: 'Konfirmasi Catatan Kematian / Afkir',
      categoryBadge: 'Mortalitas',
      items: [
        { label: 'Ayam Mati Hari Ini', value: `${mortNum} ekor`, highlight: true, color: 'text-rose-600' },
        { label: 'Ayam Afkir / Culling', value: `${cullNum} ekor`, color: 'text-amber-700' },
        { label: 'Populasi Saat Ini', value: `${currentPopulation.toLocaleString('id-ID')} ekor` },
        { label: 'Est. Sisa Populasi', value: `${Math.max(0, currentPopulation - mortNum - cullNum).toLocaleString('id-ID')} ekor` },
      ],
      action: executeSaveMortality,
    });
    setShowConfirmModal(true);
  };

  const executeSaveFeed = async () => {
    if (!activeFlock?.id) return;
    setIsSubmitting(true);
    try {
      if (onSaveFeed) {
        await onSaveFeed({
          flock_id: activeFlock.id,
          record_date: feedDate,
          feed_morning_kg: morningNum > 0 ? morningNum : undefined,
          feed_afternoon_kg: afternoonNum > 0 ? afternoonNum : undefined,
          feed_kg: effectiveFeedTotal,
          notes: feedNotes.trim(),
        });
      } else {
        const existing = existingRecords.find(
          (r) => r.record_date === feedDate && (r.flock_id === activeFlock?.id || !r.flock_id)
        );
        await onSaveDaily({
          flock_id: activeFlock.id,
          record_date: feedDate,
          egg_good_pcs: existing?.egg_good_pcs || 0,
          egg_good_kg: existing?.egg_good_kg || 0,
          egg_bad_pcs: existing?.egg_bad_pcs || 0,
          egg_bad_kg: existing?.egg_bad_kg || 0,
          mortality_pcs: existing?.mortality_pcs || 0,
          culling_pcs: existing?.culling_pcs || 0,
          feed_kg: effectiveFeedTotal,
          feed_morning_kg: morningNum > 0 ? morningNum : undefined,
          feed_afternoon_kg: afternoonNum > 0 ? afternoonNum : undefined,
          notes: feedNotes.trim() || existing?.notes || '',
        });
      }
      setShowConfirmModal(false);
      setToastMessage(`✅ PAKAN ${activeFlock.coop_name.toUpperCase()} BERHASIL DISIMPAN!`);
      setTimeout(() => {
        setToastMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      alert('Gagal menyimpan data pakan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlock?.id) return;
    if (effectiveFeedTotal <= 0) {
      alert('Masukkan jumlah pakan terlebih dahulu!');
      return;
    }

    setConfirmConfig({
      title: 'Konfirmasi Catatan Pemberian Pakan',
      categoryBadge: 'Pakan',
      items: [
        { label: 'Tanggal', value: feedDate },
        { label: 'Kandang', value: `${activeFlock.coop_name} (${activeFlock.name})` },
        { label: 'Pakan Pagi', value: morningNum > 0 ? `${morningNum} kg` : '-' },
        { label: 'Pakan Sore', value: afternoonNum > 0 ? `${afternoonNum} kg` : '-' },
        { label: 'Total Pakan', value: `${effectiveFeedTotal} kg (~${(effectiveFeedTotal / 50).toFixed(2)} Sak)`, highlight: true },
        { label: 'Porsi Makan (Feed Intake)', value: `${liveFeedIntake} g/ekor/hari` },
        { label: 'FCR Hari Ini', value: liveFcr ? `${liveFcr}` : 'Menunggu panen telur sore' },
      ],
      action: executeSaveFeed,
    });
    setShowConfirmModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-4 space-y-3.5 animate-in slide-in-from-bottom duration-300">
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">PENCATATAN HARIAN KANDANG</h3>
            <p className="text-[11px] font-semibold text-slate-500">Isi data produksi, obat, atau kematian</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors border border-slate-200"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* COMPACT CLEAN COOP SELECTOR BAR (No duplicate giant cards) */}
        {activeFlock && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-[#00684a]" />
              <div className="flex items-center gap-1.5">
                {flocks.length > 1 ? (
                  <select
                    value={activeFlockId}
                    onChange={(e) => onSelectFlock(e.target.value)}
                    className="bg-white text-slate-900 text-xs font-black rounded-lg px-2 py-0.5 outline-none cursor-pointer border border-emerald-300"
                  >
                    {flocks.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.coop_name} ({f.name})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-black text-[#00684a]">{activeFlock.coop_name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-black text-[#00684a] bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
              <Users className="w-3 h-3 text-emerald-600" />
              <span>Populasi: {currentPopulation.toLocaleString('id-ID')} ekor</span>
            </div>
          </div>
        )}

        {/* 4 OPERATIONAL TABS */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {[
            { id: 'daily', label: 'Telur', icon: Egg },
            { id: 'feed', label: 'Pakan', icon: Wheat },
            { id: 'health', label: 'Vaksin/Obat', icon: Syringe },
            { id: 'mortality', label: 'Kematian', icon: Skull },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 flex items-center justify-center gap-1 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                  isSelected
                    ? 'bg-[#00684a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-[#00684a] text-white rounded-2xl p-3 text-center text-xs font-black shadow-lg animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* TAB 1: PRODUKSI TELUR */}
        {activeTab === 'daily' && (
          <SleekProductionInput
            flocks={flocks}
            activeFlockId={activeFlockId}
            onSelectFlock={onSelectFlock}
            onSave={onSaveDaily}
            onSuccessClose={onClose}
            previousEggPcs={previousEggPcs}
            existingRecords={existingRecords}
          />
        )}

        {/* TAB 2: CATAT PAKAN (FCR & FEED INTAKE) */}
        {activeTab === 'feed' && (
          <form onSubmit={handleSaveFeedSubmit} className="space-y-3">
            {/* Tanggal & Info Kandang */}
            <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>📅 Tanggal:</span>
                <input
                  type="date"
                  value={feedDate}
                  onChange={(e) => setFeedDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 outline-none focus:border-[#00684a]"
                  required
                />
              </div>
              <div className="text-[11px] font-black text-[#00684a]">
                {currentPopulation.toLocaleString('id-ID')} ekor ayam
              </div>
            </div>

            {/* Input Pagi & Sore (Opsi B) */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rincian Pemberian Pakan</span>
                </span>
                <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                  Pagi &amp; Sore Dijumlahkan
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Pakan Pagi */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600">🌅 Pakan Pagi (Kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={feedMorningKg}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Number(e.target.value);
                      setFeedMorningKg(v);
                      const aft = Number(feedAfternoonKg) || 0;
                      const mor = Number(v) || 0;
                      if (mor + aft > 0) setFeedTotalKg(Number((mor + aft).toFixed(2)));
                    }}
                    placeholder="0.0"
                    className="w-full text-base font-black text-amber-900 bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <div className="flex gap-1 pt-1">
                    {[0.5, 1, 5].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = Number(feedMorningKg) || 0;
                          const next = Number((curr + amt).toFixed(2));
                          setFeedMorningKg(next);
                          const aft = Number(feedAfternoonKg) || 0;
                          setFeedTotalKg(Number((next + aft).toFixed(2)));
                        }}
                        className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded hover:bg-amber-200 active:scale-95"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pakan Sore */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600">🌇 Pakan Sore (Kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={feedAfternoonKg}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : Number(e.target.value);
                      setFeedAfternoonKg(v);
                      const mor = Number(feedMorningKg) || 0;
                      const aft = Number(v) || 0;
                      if (mor + aft > 0) setFeedTotalKg(Number((mor + aft).toFixed(2)));
                    }}
                    placeholder="0.0"
                    className="w-full text-base font-black text-amber-900 bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <div className="flex gap-1 pt-1">
                    {[0.5, 1, 5].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const curr = Number(feedAfternoonKg) || 0;
                          const next = Number((curr + amt).toFixed(2));
                          setFeedAfternoonKg(next);
                          const mor = Number(feedMorningKg) || 0;
                          setFeedTotalKg(Number((mor + next).toFixed(2)));
                        }}
                        className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded hover:bg-amber-200 active:scale-95"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Pakan Hari Ini */}
              <div className="bg-white p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-600 uppercase">Total Pakan Hari Ini</span>
                  <span className="text-[9.5px] font-semibold text-slate-400">
                    ~{(effectiveFeedTotal / 50).toFixed(2)} Sak (@50kg)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={feedTotalKg}
                    onChange={(e) => setFeedTotalKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.0"
                    className="w-24 text-right text-lg font-black text-amber-900 bg-transparent outline-none border-b-2 border-amber-400 focus:border-amber-600"
                    required
                  />
                  <span className="text-xs font-black text-amber-800">kg</span>
                </div>
              </div>
            </div>

            {/* LIVE SMART CALCULATION BANNER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white space-y-2 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-black tracking-wide text-slate-200">Kalkulasi Otomatis Sistem</span>
                </div>
                <span className="text-[9.5px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  Real-Time
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {/* Feed Intake */}
                <div>
                  <span className="block text-[9px] font-extrabold uppercase text-slate-400">Porsi Makan (Feed Intake)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-white">{liveFeedIntake}</span>
                    <span className="text-[10px] font-bold text-slate-400">g / ekor</span>
                  </div>
                  <span className={`inline-block text-[8.5px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                    liveFeedIntake === 0
                      ? 'text-slate-400 bg-slate-800'
                      : liveFeedIntake >= 105 && liveFeedIntake <= 125
                      ? 'text-emerald-300 bg-emerald-900/60'
                      : liveFeedIntake < 105
                      ? 'text-amber-300 bg-amber-900/60'
                      : 'text-rose-300 bg-rose-900/60'
                  }`}>
                    {liveFeedIntake === 0
                      ? 'Isi jumlah pakan'
                      : liveFeedIntake >= 105 && liveFeedIntake <= 125
                      ? '🟢 Porsi Ideal'
                      : liveFeedIntake < 105
                      ? '🟡 Porsi Rendah'
                      : '🔴 Porsi Tinggi / Tercecer?'}
                  </span>
                </div>

                {/* FCR */}
                <div>
                  <span className="block text-[9px] font-extrabold uppercase text-slate-400">FCR Hari Ini</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    {liveFcr ? (
                      <>
                        <span className="text-base font-black text-emerald-400">{liveFcr}</span>
                        <span className="text-[10px] font-bold text-slate-400">rasio</span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 mt-1">Belum panen</span>
                    )}
                  </div>
                  <span className="block text-[9px] font-semibold text-slate-400 mt-1 truncate">
                    {totalEggKgToday > 0 ? (
                      `${totalEggPcsToday} btr (${totalEggKgToday.toFixed(2)} kg)`
                    ) : (
                      'Menunggu panen sore'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Pakan (Opsional)</label>
              <textarea
                rows={2}
                value={feedNotes}
                onChange={(e) => setFeedNotes(e.target.value)}
                placeholder="Merk pakan, batch ransum, atau kondisi talang..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00684a]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-98 text-white font-black py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm transition-all"
            >
              <Save className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN CATATAN PAKAN'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: OBAT & VAKSIN */}
        {activeTab === 'health' && (
          <form onSubmit={handleSaveHealthSubmit} className="space-y-3.5">
            {/* Tanggal Aplikasi */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Tanggal Aplikasi</label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs font-black rounded-xl px-3 py-1.5 outline-none focus:border-[#00684a]"
                required
              />
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { cat: 'Vaksin', icon: Syringe },
                { cat: 'Obat', icon: Pill },
                { cat: 'Vitamin', icon: Sparkles },
                { cat: 'Desinfektan', icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = healthCategory === item.cat;
                return (
                  <button
                    key={item.cat}
                    type="button"
                    onClick={() => {
                      setHealthCategory(item.cat as any);
                      setHealthItemName('');
                      setHealthDosage('');
                    }}
                    className={`py-2.5 px-3 rounded-2xl flex items-center gap-2 font-black text-xs transition-all border ${
                      isSelected
                        ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.cat}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl space-y-3">
              {/* NAMA ITEM PER KATEGORI */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                  Nama {healthCategory}
                </label>
                <input
                  type="text"
                  value={healthItemName}
                  onChange={(e) => setHealthItemName(e.target.value)}
                  placeholder={
                    healthCategory === 'Vaksin'
                      ? 'e.g. Vaksin ND-IB / AI (Flu Burung)...'
                      : healthCategory === 'Obat'
                      ? 'e.g. Koleridin / Amprolium...'
                      : healthCategory === 'Vitamin'
                      ? 'e.g. Egg Stimulant / Vita Stress...'
                      : 'e.g. Medisep / BKT Desinfektan...'
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  required
                />
              </div>

              {/* DYNAMIC FORM FIELDS BASED ON CATEGORY */}
              {healthCategory === 'Vaksin' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis / Kemasan</label>
                      <input
                        type="text"
                        value={healthDosage}
                        onChange={(e) => setHealthDosage(e.target.value)}
                        placeholder="e.g. 1 dosis/ekor"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jumlah Ayam (Ekor)</label>
                      <input
                        type="number"
                        min="0"
                        value={vaccinatedBirdsCount}
                        onChange={(e) => setVaccinatedBirdsCount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`e.g. ${currentPopulation || 2000}`}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-[#00684a] outline-none focus:border-[#00684a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metode Vaksinasi</label>
                    <select
                      value={healthMethod}
                      onChange={(e) => setHealthMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    >
                      <option value="Tetes Mata">Tetes Mata (Ocular)</option>
                      <option value="Air Minum">Air Minum (Drinking Water)</option>
                      <option value="Injeksi / Suntik">Injeksi / Suntik (Intramuskular)</option>
                      <option value="Spray / Fogging">Spray / Semprot Halus</option>
                      <option value="Tetes Mulut">Tetes Mulut (Oral)</option>
                    </select>
                  </div>
                </>
              )}

              {healthCategory === 'Obat' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis Pemakaian</label>
                      <input
                        type="text"
                        value={healthDosage}
                        onChange={(e) => setHealthDosage(e.target.value)}
                        placeholder="e.g. 100g / 200L Air"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jml Ayam Diobati</label>
                      <input
                        type="number"
                        min="0"
                        value={vaccinatedBirdsCount}
                        onChange={(e) => setVaccinatedBirdsCount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`e.g. ${currentPopulation || 2000}`}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-700 outline-none focus:border-[#00684a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metode Pengobatan</label>
                    <select
                      value={healthMethod}
                      onChange={(e) => setHealthMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    >
                      <option value="Air Minum">Air Minum (Melalui Tanki Minum)</option>
                      <option value="Campur Pakan">Campur Pakan (Feed Premix)</option>
                      <option value="Injeksi / Suntik">Injeksi / Suntik Langsung</option>
                      <option value="Tetes Mulut">Tetes Mulut (Individu)</option>
                    </select>
                  </div>
                </>
              )}

              {healthCategory === 'Vitamin' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis Vitamin</label>
                      <input
                        type="text"
                        value={healthDosage}
                        onChange={(e) => setHealthDosage(e.target.value)}
                        placeholder="e.g. 500g / 1000L Air"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Populasi</label>
                      <input
                        type="number"
                        min="0"
                        value={vaccinatedBirdsCount}
                        onChange={(e) => setVaccinatedBirdsCount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={`e.g. ${currentPopulation || 2000}`}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-amber-700 outline-none focus:border-[#00684a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metode Pemberian</label>
                    <select
                      value={healthMethod}
                      onChange={(e) => setHealthMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    >
                      <option value="Air Minum">Air Minum (Pengenceran Air)</option>
                      <option value="Campur Pakan">Campur Pakan (Top Dressing)</option>
                    </select>
                  </div>
                </>
              )}

              {healthCategory === 'Desinfektan' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cakupan / Area Disinfeksi</label>
                    <select
                      value={healthMethod}
                      onChange={(e) => setHealthMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    >
                      <option value="Seluruh Kandang">Seluruh Kandang (Internal & Eksternal)</option>
                      <option value="Area Tirai & Dinding">Area Tirai, Dinding & Litter</option>
                      <option value="Tempat Minum & Pakan">Tempat Minum & Tempat Pakan</option>
                      <option value="Halaman & Akses Masuk">Halaman Kandang & Akses Kendaraan</option>
                      <option value="Celup Sepatu / Dip Tank">Dip Tank / Celup Sepatu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis / Konsentrasi Semprot</label>
                    <input
                      type="text"
                      value={healthDosage}
                      onChange={(e) => setHealthDosage(e.target.value)}
                      placeholder="e.g. 10 ml / Liter Air (Dosis Semprot)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Tambahan & Pelaksanaan</label>
                <textarea
                  rows={2}
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  placeholder="Catatan tim pelaksana, cuaca, atau kondisi kandang..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00684a]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-98 text-white font-black py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Save className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'MENYIMPAN...' : `SIMPAN ${healthCategory.toUpperCase()}`}</span>
            </button>
          </form>
        )}

        {/* TAB 3: KEMATIAN & AFKIR */}
        {activeTab === 'mortality' && (
          <form onSubmit={handleSaveMortalitySubmit} className="space-y-3.5">
            <GiantStepperInput
              label="Ayam Mati (Ekor)"
              sublabel="Jumlah ekor ayam mati"
              value={mortalityPcs}
              onChange={setMortalityPcs}
              unit="Ekor"
              icon={Skull}
              colorTheme="rose"
              stepOptions={[1, 5]}
            />

            <GiantStepperInput
              label="Ayam Afkir (Cull)"
              sublabel="Jumlah ekor dikeluarin/afkir"
              value={cullingPcs}
              onChange={setCullingPcs}
              unit="Ekor"
              icon={AlertTriangle}
              colorTheme="amber"
              stepOptions={[1, 5]}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Save className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN KEMATIAN'}</span>
            </button>
          </form>
        )}

        {/* Save Confirmation Modal */}
        {confirmConfig && (
          <SaveConfirmationModal
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={confirmConfig.action}
            isSubmitting={isSubmitting}
            title={confirmConfig.title}
            categoryBadge={confirmConfig.categoryBadge}
            coopName={activeFlock?.coop_name || 'Kandang'}
            flockName={activeFlock?.name}
            recordDate={recordDate}
            items={confirmConfig.items}
          />
        )}
      </div>
    </div>
  );
};
