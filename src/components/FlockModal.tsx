'use client';

import React, { useState } from 'react';
import { Flock } from '@/types/database';
import { X, Layers, Plus } from 'lucide-react';

interface FlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFlock: (flock: Partial<Flock>) => Promise<Flock>;
}

export const FlockModal: React.FC<FlockModalProps> = ({ isOpen, onClose, onCreateFlock }) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [coopName, setCoopName] = useState('Kandang A');
  const [strain, setStrain] = useState('Isa Brown');
  const [chickInDate, setChickInDate] = useState(today);
  const [initialPop, setInitialPop] = useState<number | ''>(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFlock({
        name,
        coop_name: coopName,
        strain,
        chick_in_date: chickInDate,
        initial_population: Number(initialPop) || 1000,
      });
      onClose();
    } catch (err) {
      alert('Gagal menambah angkatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Tambah Angkatan Baru</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Angkatan / Periode</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Angkatan 13 - Batch Sept"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Kandang</label>
              <input
                type="text"
                value={coopName}
                onChange={(e) => setCoopName(e.target.value)}
                placeholder="Kandang A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jenis Strain Ayam</label>
              <select
                value={strain}
                onChange={(e) => setStrain(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Isa Brown">Isa Brown</option>
                <option value="Lohmann Brown">Lohmann Brown</option>
                <option value="Hy-Line Brown">Hy-Line Brown</option>
                <option value="Hisex Brown">Hisex Brown</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tgl Chick-In</label>
              <input
                type="date"
                value={chickInDate}
                onChange={(e) => setChickInDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Populasi Awal (Ekor)</label>
              <input
                type="number"
                value={initialPop}
                onChange={(e) => setInitialPop(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Angkatan Baru'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
