'use client';

import React, { useState } from 'react';
import { DailyRecord, HealthRecord, Flock } from '@/types/database';
import { SleekProductionInput } from '@/components/SleekProductionInput';
import { GiantStepperInput } from '@/components/GiantStepperInput';
import {
  X,
  Egg,
  Syringe,
  Skull,
  Save,
  Pill,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onSaveDaily: (record: DailyRecord) => Promise<void>;
  onSaveHealth: (record: HealthRecord) => Promise<void>;
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({
  isOpen,
  onClose,
  flocks,
  activeFlockId,
  onSelectFlock,
  onSaveDaily,
  onSaveHealth,
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'daily' | 'health' | 'mortality'>('daily');

  // Health State
  const [recordDate, setRecordDate] = useState(todayStr);
  const [healthCategory, setHealthCategory] = useState<'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'>('Vaksin');
  const [healthItemName, setHealthItemName] = useState('');
  const [healthDosage, setHealthDosage] = useState('');
  const [healthMethod, setHealthMethod] = useState('Air Minum');
  const [healthNotes, setHealthNotes] = useState('');

  // Mortality State
  const [mortalityPcs, setMortalityPcs] = useState<number | ''>(0);
  const [cullingPcs, setCullingPcs] = useState<number | ''>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveHealthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthItemName.trim()) {
      alert('Pilih atau isi nama obat/vaksin!');
      return;
    }
    if (!activeFlock?.id) return;

    setIsSubmitting(true);
    try {
      await onSaveHealth({
        flock_id: activeFlock.id,
        record_date: recordDate,
        category: healthCategory,
        item_name: healthItemName.trim(),
        dosage: healthDosage.trim(),
        method: healthMethod,
        notes: healthNotes.trim(),
      });
      setToastMessage(`✅ ${healthCategory.toUpperCase()} BERHASIL DISIMPAN!`);
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

  const handleSaveMortalitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlock?.id) return;

    setIsSubmitting(true);
    try {
      await onSaveDaily({
        flock_id: activeFlock.id,
        record_date: recordDate,
        egg_good_pcs: 0,
        egg_good_kg: 0,
        egg_bad_pcs: 0,
        egg_bad_kg: 0,
        mortality_pcs: Number(mortalityPcs) || 0,
        culling_pcs: Number(cullingPcs) || 0,
        feed_kg: 0,
        notes: 'Kematian/Afkir',
      });
      setToastMessage('✅ KEMATIAN BERHASIL DISIMPAN!');
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-100 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border-t-2 border-slate-200 p-3.5 space-y-3 animate-in slide-in-from-bottom duration-300">
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">PENCATATAN HARIAN KANDANG</h3>
            <p className="text-[11px] font-semibold text-slate-500">Isi data produksi, obat, atau kematian</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* 3 OPERATIONAL TABS ONLY (NO TAMBAH KANDANG TAB HERE) */}
        <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          {[
            { id: 'daily', label: 'Produksi', icon: Egg },
            { id: 'health', label: 'Obat / Vaksin', icon: Syringe },
            { id: 'mortality', label: 'Kematian', icon: Skull },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-black transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-700 text-white rounded-xl p-3 text-center text-xs font-black shadow-md animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* TAB 1: PRODUKSI TELUR & PAKAN (COMPACT SLEEK GRID) */}
        {activeTab === 'daily' && (
          <SleekProductionInput
            flocks={flocks}
            activeFlockId={activeFlockId}
            onSelectFlock={onSelectFlock}
            onSave={onSaveDaily}
            onSuccessClose={onClose}
          />
        )}

        {/* TAB 2: OBAT & VAKSIN */}
        {activeTab === 'health' && (
          <form onSubmit={handleSaveHealthSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { cat: 'Vaksin', icon: Syringe, color: 'bg-emerald-600' },
                { cat: 'Obat', icon: Pill, color: 'bg-rose-600' },
                { cat: 'Vitamin', icon: Sparkles, color: 'bg-amber-600' },
                { cat: 'Desinfektan', icon: ShieldAlert, color: 'bg-blue-600' },
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
                    }}
                    className={`py-2 px-2 rounded-xl flex items-center gap-2 font-black text-xs transition-all border-2 ${
                      isSelected
                        ? `${item.color} text-white border-transparent shadow-xs`
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.cat}</span>
                  </button>
                );
              })}
            </div>

            <div className="stat-card p-3 border border-slate-200 space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase">Nama {healthCategory}</label>
              <input
                type="text"
                value={healthItemName}
                onChange={(e) => setHealthItemName(e.target.value)}
                placeholder={`Contoh: Vaksin ND-IB / Egg Stimulant...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Dosis</label>
                  <input
                    type="text"
                    value={healthDosage}
                    onChange={(e) => setHealthDosage(e.target.value)}
                    placeholder="100g / 200L Air"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Metode</label>
                  <select
                    value={healthMethod}
                    onChange={(e) => setHealthMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none"
                  >
                    <option value="Air Minum">Air Minum</option>
                    <option value="Injeksi">Suntik</option>
                    <option value="Tetes Mata">Tetes Mata</option>
                    <option value="Pakan">Campur Pakan</option>
                    <option value="Semprot">Semprot</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'MENYIMPAN...' : `SIMPAN ${healthCategory.toUpperCase()}`}</span>
            </button>
          </form>
        )}

        {/* TAB 3: KEMATIAN & AFKIR */}
        {activeTab === 'mortality' && (
          <form onSubmit={handleSaveMortalitySubmit} className="space-y-3">
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
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN KEMATIAN'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
