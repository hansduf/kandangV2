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
  const [coopName, setCoopName] = useState('');
  const [strain, setStrain] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [chickInDate, setChickInDate] = useState(today);
  const [initialPop, setInitialPop] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFlock({
        name,
        coop_name: coopName.trim() || 'Kandang A',
        strain: strain.trim() || '-',
        capacity: Number(capacity) || Number(initialPop) || 0,
        chick_in_date: chickInDate,
        initial_population: Number(initialPop) || 0,
      });
      onClose();
    } catch (err) {
      alert('Gagal menambah angkatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Tambah Angkatan Baru</h3>
              <p className="text-[11px] font-semibold text-slate-500">Pendaftaran kandang baru</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 border border-slate-200">
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase mb-1">Nama Angkatan / Periode</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Angkatan 13 - Batch Sept"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Kandang</label>
              <input
                type="text"
                value={coopName}
                onChange={(e) => setCoopName(e.target.value)}
                placeholder="e.g. Kandang A"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenis / Strain Ayam</label>
              <input
                type="text"
                value={strain}
                onChange={(e) => setStrain(e.target.value)}
                placeholder="Ketuk & isi manual..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kapasitas Kandang</label>
              <input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2500 ekor"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#00684a] outline-none focus:border-[#00684a]"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Populasi Awal</label>
              <input
                type="number"
                min="0"
                value={initialPop}
                onChange={(e) => setInitialPop(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2000 ekor"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#00684a] outline-none focus:border-[#00684a]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tgl Chick-In</label>
            <input
              type="date"
              value={chickInDate}
              onChange={(e) => setChickInDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? 'MENYIMPAN...' : 'SIMPAN ANGKATAN BARU'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

