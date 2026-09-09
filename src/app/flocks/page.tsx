'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { fetchFlocks, createFlock } from '@/lib/supabase';
import { Flock } from '@/types/database';
import { Layers, Plus, Calendar, Home, Users } from 'lucide-react';

export default function FlocksPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadFlocks();
  }, []);

  const loadFlocks = async () => {
    try {
      const data = await fetchFlocks();
      setFlocks(data);
      if (data.length > 0) {
        setActiveFlockId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Angkatan Ayam</h2>
              <p className="text-xs font-medium text-slate-500">Kelola multi-angkatan & kandang</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="space-y-3">
          {flocks.map((f) => (
            <div
              key={f.id}
              className={`stat-card p-4 space-y-3 border-2 transition-all ${
                f.id === activeFlockId ? 'border-emerald-500 shadow-md' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {f.coop_name}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{f.strain}</span>
                </div>
                <button
                  onClick={() => setActiveFlockId(f.id)}
                  className={`text-xs font-extrabold px-3 py-1 rounded-xl transition-all ${
                    f.id === activeFlockId
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.id === activeFlockId ? '✓ Aktif Ditampilkan' : 'Pilih Kandang ini'}
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{f.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Chick-in: {f.chick_in_date} (Umur {f.age_weeks} Minggu)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400">Populasi Awal</span>
                  <span className="font-bold text-slate-800">{f.initial_population} ekor</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400">Populasi Saat Ini</span>
                  <span className="font-bold text-emerald-600">{f.current_population} ekor</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />

      <FlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}
