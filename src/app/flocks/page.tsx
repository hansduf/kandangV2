'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { fetchFlocks, createFlock } from '@/lib/supabase';
import { Flock } from '@/types/database';
import { Layers, Plus, Calendar, Home, Users, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Daftar Angkatan Ayam</h2>
              <p className="text-xs font-semibold text-slate-400">Kelola multi-angkatan & kandang</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="space-y-3.5">
          {flocks.map((f) => (
            <div
              key={f.id}
              className={`glass-card p-4 space-y-3.5 border transition-all duration-300 ${
                f.id === activeFlockId
                  ? 'border-emerald-500/60 shadow-xl shadow-emerald-500/10 scale-[1.01]'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    {f.coop_name}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{f.strain}</span>
                </div>
                <button
                  onClick={() => setActiveFlockId(f.id)}
                  className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                    f.id === activeFlockId
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {f.id === activeFlockId ? '✓ Aktif' : 'Pilih Kandang'}
                </button>
              </div>

              <div>
                <h3 className="text-base font-black text-white">{f.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Chick-in: {f.chick_in_date} (Umur {f.age_weeks} Minggu)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Populasi Awal</span>
                  <span className="font-black text-slate-200">{f.initial_population} ekor</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Populasi Saat Ini</span>
                  <span className="font-black text-emerald-400">{f.current_population} ekor</span>
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

