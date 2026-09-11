'use client';

import React, { useState, useEffect } from 'react';
import { Flock } from '@/types/database';
import { X, Layers, Plus, Save, LogOut } from 'lucide-react';

interface FlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  flockToEdit?: Flock | null;
  onCreateFlock?: (flock: Partial<Flock>) => Promise<Flock>;
  onUpdateFlock?: (id: string, flock: Partial<Flock>) => Promise<Flock>;
}

export const FlockModal: React.FC<FlockModalProps> = ({
  isOpen,
  onClose,
  flockToEdit,
  onCreateFlock,
  onUpdateFlock,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [coopName, setCoopName] = useState('');
  const [strain, setStrain] = useState('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [chickInDate, setChickInDate] = useState(today);
  const [chickOutDate, setChickOutDate] = useState('');
  const [initialPop, setInitialPop] = useState<number | ''>('');
  const [status, setStatus] = useState<'active' | 'archived' | 'checked_out'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (flockToEdit) {
      setName(flockToEdit.name || '');
      setCoopName(flockToEdit.coop_name || '');
      setStrain(flockToEdit.strain || '');
      setCapacity(flockToEdit.capacity || '');
      setChickInDate(flockToEdit.chick_in_date || today);
      setChickOutDate(flockToEdit.chick_out_date || '');
      setInitialPop(flockToEdit.initial_population || '');
      setStatus(flockToEdit.status || 'active');
    } else {
      setName('');
      setCoopName('');
      setStrain('');
      setCapacity('');
      setChickInDate(today);
      setChickOutDate('');
      setInitialPop('');
      setStatus('active');
    }
  }, [flockToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Flock> = {
        name: name.trim(),
        coop_name: coopName.trim() || 'Kandang A',
        strain: strain.trim() || '-',
        capacity: Number(capacity) || Number(initialPop) || 0,
        chick_in_date: chickInDate,
        chick_out_date: chickOutDate.trim() || null,
        initial_population: Number(initialPop) || 0,
        status: status,
      };

      if (flockToEdit && onUpdateFlock) {
        await onUpdateFlock(flockToEdit.id, payload);
      } else if (onCreateFlock) {
        await onCreateFlock(payload);
      }
      onClose();
    } catch (err) {
      alert('Gagal menyimpan data kandang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!flockToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isEdit ? 'Edit Data Kandang' : 'Tambah Angkatan Baru'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {isEdit ? 'Ubah rincian & status checkout' : 'Pendaftaran kandang baru'}
              </p>
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

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <span>Tgl Checkout</span>
                <span className="text-[9px] text-rose-600 font-black">Afkir Final</span>
              </label>
              <input
                type="date"
                value={chickOutDate}
                onChange={(e) => {
                  setChickOutDate(e.target.value);
                  if (e.target.value) setStatus('checked_out');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-700 outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Operational Kandang</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
              >
                <option value="active">🟢 Aktif (Sedang Berproduksi)</option>
                <option value="checked_out">🔴 Checkout (Afkir Final / Peremajaan)</option>
                <option value="archived">📦 Arsip / Selesai</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all"
          >
            {isEdit ? <Save className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[3]" />}
            <span>{isSubmitting ? 'MENYIMPAN...' : isEdit ? 'SIMPAN PERUBAHAN' : 'SIMPAN ANGKATAN BARU'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
