'use client';

import React, { useState } from 'react';
import { HealthRecord } from '@/types/database';
import { Syringe, Save, CheckCircle2, Pill, ShieldAlert, Sparkles } from 'lucide-react';

interface HealthRecordFormProps {
  flockId: string;
  onSave: (record: HealthRecord) => Promise<void>;
}

export const HealthRecordForm: React.FC<HealthRecordFormProps> = ({ flockId, onSave }) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'>('Vaksin');
  const [itemName, setItemName] = useState('');
  const [dosage, setDosage] = useState('');
  const [method, setMethod] = useState('Air Minum');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const categoryPresets = {
    Vaksin: ['Vaksin ND-IB', 'Vaksin AI (Flu Burung)', 'Vaksin Coryza', 'Vaksin Gumboro'],
    Obat: ['Antibiotik Koleridin', 'Obat Cacing', 'Amprolium (Berak Darah)', 'Enrofloxacin'],
    Vitamin: ['Egg Stimulant', 'Vita Stress', 'Fortevit', 'Mineral Layer'],
    Desinfektan: ['Medisep Semprot', 'BKT Desinfektan', 'Kapus Desinfektan'],
  }[category];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Pilih atau ketik nama obat/vaksin!');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      await onSave({
        flock_id: flockId,
        record_date: date,
        category,
        item_name: itemName.trim(),
        dosage: dosage.trim(),
        method,
        notes: notes.trim(),
      });

      setSuccessMessage('✅ DATA KESEHATAN BERHASIL DISIMPAN!');
      setItemName('');
      setDosage('');
      setNotes('');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      alert('Gagal menyimpan data kesehatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* Visual Category Selection Grid */}
      <div className="glass-card p-3.5 border border-slate-700/80 space-y-2">
        <label className="block text-xs font-black text-slate-300 uppercase mb-2">PILIH JENIS TREATMENT</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { cat: 'Vaksin', icon: Syringe, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
            { cat: 'Obat', icon: Pill, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
            { cat: 'Vitamin', icon: Sparkles, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
            { cat: 'Desinfektan', icon: ShieldAlert, color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = category === item.cat;

            return (
              <button
                key={item.cat}
                type="button"
                onClick={() => {
                  setCategory(item.cat as any);
                  setItemName('');
                }}
                className={`py-3 px-3 rounded-2xl flex items-center gap-2 font-black text-xs transition-all border ${
                  isSelected
                    ? `${item.color} shadow-lg shadow-emerald-500/10 scale-102`
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="glass-card p-4 border border-slate-700/80 space-y-3.5">
        <div>
          <label className="block text-xs font-black text-slate-300 uppercase mb-1">Tanggal Treatment</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
            required
          />
        </div>

        {/* Preset Name Pills */}
        <div>
          <label className="block text-xs font-black text-slate-300 uppercase mb-1.5">Nama {category}</label>
          
          <div className="flex flex-wrap gap-1.5 mb-2">
            {categoryPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setItemName(preset)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all border ${
                  itemName === preset
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder={`Atau ketik nama ${category} lain...`}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dosis</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 100g / 200L Air"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cara Pakai</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none"
            >
              <option value="Air Minum">Air Minum</option>
              <option value="Injeksi">Suntik (Injeksi)</option>
              <option value="Tetes Mata">Tetes Mata</option>
              <option value="Pakan">Campur Pakan</option>
              <option value="Semprot">Semprot Kandang</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan / Gejala (Opsional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Ayam ngorok 5 ekor..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs font-semibold text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-500 text-slate-950 rounded-2xl p-4 text-center text-xs font-black shadow-lg shadow-emerald-500/30 animate-bounce">
          {successMessage}
        </div>
      )}

      {/* GIANT SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-4 rounded-3xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all"
      >
        <Save className="w-5 h-5 stroke-[3]" />
        <span>{isSubmitting ? 'MENYIMPAN...' : `SIMPAN DATA ${category.toUpperCase()}`}</span>
      </button>
    </form>
  );
};

