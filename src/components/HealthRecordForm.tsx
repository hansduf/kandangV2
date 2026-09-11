'use client';

import React, { useState, useEffect } from 'react';
import { HealthRecord } from '@/types/database';
import {
  fetchCustomCategories,
  saveCustomCategory,
  fetchCategoryPresets,
  saveCategoryPreset,
} from '@/lib/supabase';
import { Syringe, Save, Pill, ShieldAlert, Sparkles, Plus, Tag } from 'lucide-react';

interface HealthRecordFormProps {
  flockId: string;
  onSave: (record: HealthRecord) => Promise<void>;
}

export const HealthRecordForm: React.FC<HealthRecordFormProps> = ({ flockId, onSave }) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  // Dynamic Categories State
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('Vaksin');
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Dynamic Presets State
  const [presets, setPresets] = useState<string[]>([]);
  const [itemName, setItemName] = useState('');
  const [newPresetInput, setNewPresetInput] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);

  const [dosage, setDosage] = useState('');
  const [vaccinatedBirdsCount, setVaccinatedBirdsCount] = useState<number | ''>('');
  const [method, setMethod] = useState('Air Minum');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const cats = fetchCustomCategories();
    setCategories(cats);
    if (cats.length > 0 && !cats.includes(category)) {
      setCategory(cats[0]);
    }
  }, []);

  useEffect(() => {
    if (category) {
      const p = fetchCategoryPresets(category);
      setPresets(p);
    }
  }, [category]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const updated = saveCustomCategory(newCatInput);
    setCategories(updated);
    setCategory(newCatInput.trim());
    setNewCatInput('');
    setShowAddCat(false);
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetInput.trim()) return;
    const updated = saveCategoryPreset(category, newPresetInput);
    setPresets(updated);
    setItemName(newPresetInput.trim());
    setNewPresetInput('');
    setShowAddPreset(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Pilih atau ketik nama obat/vaksin!');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      // Auto-save new preset if not in list
      saveCategoryPreset(category, itemName);

      await onSave({
        flock_id: flockId,
        record_date: date,
        category: category as any,
        item_name: itemName.trim(),
        dosage: dosage.trim(),
        vaccinated_birds_count: Number(vaccinatedBirdsCount) || 0,
        method,
        notes: notes.trim(),
      });

      setSuccessMessage(`✅ DATA ${category.toUpperCase()} BERHASIL DISIMPAN!`);
      setItemName('');
      setDosage('');
      setVaccinatedBirdsCount('');
      setNotes('');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      alert('Gagal menyimpan data kesehatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    if (cat.toLowerCase().includes('vaksin')) return Syringe;
    if (cat.toLowerCase().includes('obat')) return Pill;
    if (cat.toLowerCase().includes('vitamin')) return Sparkles;
    if (cat.toLowerCase().includes('desinfektan')) return ShieldAlert;
    return Tag;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {/* Visual Category Selection Grid */}
      <div className="bg-white p-4 border border-slate-200 rounded-3xl shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black text-slate-800 uppercase">PILIH / TAMBAH KATEGORI</label>
          <button
            type="button"
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-[11px] font-bold text-[#00684a] flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kategori Baru</span>
          </button>
        </div>

        {/* Dynamic Category Add Form */}
        {showAddCat && (
          <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="Nama Kategori Baru..."
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="bg-[#00684a] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
            >
              Simpan
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            const isSelected = category === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setItemName('');
                }}
                className={`py-2.5 px-3 rounded-2xl flex items-center gap-2 font-black text-xs transition-all border ${
                  isSelected
                    ? 'bg-[#00684a] text-white border-[#00684a] shadow-md scale-102'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="bg-white p-4 border border-slate-200 rounded-3xl shadow-md space-y-3.5">
        <div>
          <label className="block text-xs font-black text-slate-800 uppercase mb-1">Tanggal Treatment</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
            required
          />
        </div>

        {/* Preset Name Pills & Add Preset */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-slate-800 uppercase">Nama {category}</label>
            <button
              type="button"
              onClick={() => setShowAddPreset(!showAddPreset)}
              className="text-[10px] font-bold text-[#00684a] flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Preset</span>
            </button>
          </div>

          {showAddPreset && (
            <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 mb-2">
              <input
                type="text"
                value={newPresetInput}
                onChange={(e) => setNewPresetInput(e.target.value)}
                placeholder={`Item baru untuk ${category}...`}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={handleAddPreset}
                className="bg-[#00684a] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
              >
                Simpan
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mb-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setItemName(preset)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all border ${
                  itemName === preset
                    ? 'bg-[#00684a] text-white border-[#00684a] font-black shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
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
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dosis Pemakaian</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 100g / 200L Air"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jml Ayam (Ekor)</label>
            <input
              type="number"
              min="0"
              value={vaccinatedBirdsCount}
              onChange={(e) => setVaccinatedBirdsCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 2000"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#00684a] outline-none focus:border-[#00684a]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tatacara / Metode Aplikasi</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
          >
            <option value="Air Minum">Air Minum (Minuman Kandang)</option>
            <option value="Injeksi / Suntik">Injeksi / Suntik (Intramuskular)</option>
            <option value="Tetes Mata">Tetes Mata (Ocular)</option>
            <option value="Campur Pakan">Campur Pakan (Feed Premix)</option>
            <option value="Semprot / Fogging">Semprot / Fogging Disinfeksi</option>
            <option value="Tetes Mulut">Tetes Mulut (Oral Drop)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan / Gejala (Opsional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Ayam ngorok 5 ekor..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#00684a]"
          />
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-[#00684a] text-white rounded-2xl p-4 text-center text-xs font-black shadow-lg animate-bounce">
          {successMessage}
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-4 rounded-3xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
      >
        <Save className="w-5 h-5 stroke-[3]" />
        <span>{isSubmitting ? 'MENYIMPAN...' : `SIMPAN DATA ${category.toUpperCase()}`}</span>
      </button>
    </form>
  );
};

