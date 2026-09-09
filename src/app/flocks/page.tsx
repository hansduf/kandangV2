'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { fetchFlocks, createFlock, saveDailyRecord, saveHealthRecord } from '@/lib/supabase';
import { Flock, DailyRecord, HealthRecord } from '@/types/database';
import { Layers, Plus } from 'lucide-react';

export default function FlocksPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

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

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
    await loadFlocks();
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    await loadFlocks();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Daftar Angkatan Ayam</h2>
              <p className="text-xs font-semibold text-slate-500">Kelola multi-angkatan & kandang</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="space-y-3.5">
          {flocks.map((f) => (
            <div
              key={f.id}
              className={`bg-white p-4 rounded-3xl space-y-3.5 border transition-all duration-300 ${
                f.id === activeFlockId
                  ? 'border-[#00684a] shadow-md ring-2 ring-[#00684a]/10 scale-[1.01]'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-[#00684a] border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    {f.coop_name}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{f.strain}</span>
                </div>
                <button
                  onClick={() => setActiveFlockId(f.id)}
                  className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                    f.id === activeFlockId
                      ? 'bg-[#00684a] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.id === activeFlockId ? '✓ Aktif' : 'Pilih Kandang'}
                </button>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">{f.name}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Chick-in: {f.chick_in_date} (Umur {f.age_weeks} Minggu)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Populasi Awal</span>
                  <span className="font-black text-slate-900">{f.initial_population} ekor</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Populasi Saat Ini</span>
                  <span className="font-black text-[#00684a]">{f.current_population} ekor</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav onOpenQuickInput={() => setIsQuickInputOpen(true)} />

      <QuickInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onSaveDaily={handleSaveDaily}
        onSaveHealth={handleSaveHealth}
      />

      <FlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}

