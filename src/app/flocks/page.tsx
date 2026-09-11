'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { fetchFlocks, createFlock, updateFlock, deleteFlock, saveDailyRecord, saveHealthRecord } from '@/lib/supabase';
import { Flock, DailyRecord, HealthRecord } from '@/types/database';
import { Layers, Plus, Edit2, Trash2, Home } from 'lucide-react';

export default function FlocksPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

  useEffect(() => {
    loadFlocks();
  }, []);

  const loadFlocks = async () => {
    try {
      const data = await fetchFlocks();
      setFlocks(data);
      if (data.length > 0 && !activeFlockId) {
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
    await loadFlocks();
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const handleUpdateFlock = async (id: string, flockData: Partial<Flock>) => {
    const updated = await updateFlock(id, flockData);
    await loadFlocks();
    setEditingFlock(null);
    return updated;
  };

  const handleDeleteFlock = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus/mengarsip kandang "${name}"?`)) {
      await deleteFlock(id);
      await loadFlocks();
    }
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
        onOpenNewFlockModal={() => {
          setEditingFlock(null);
          setIsModalOpen(true);
        }}
      />

      <main className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Daftar Angkatan & Kandang</h2>
              <p className="text-xs font-semibold text-slate-500">Kelola data multi-angkatan & kandang</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingFlock(null);
              setIsModalOpen(true);
            }}
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
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingFlock(f);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-[#00684a] hover:bg-emerald-50 transition-colors border border-slate-200"
                    title="Edit Kandang"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFlock(f.id, f.name)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
                    title="Hapus Kandang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveFlockId(f.id)}
                    className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                      f.id === activeFlockId
                        ? 'bg-[#00684a] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.id === activeFlockId ? '✓ Aktif' : 'Pilih'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">{f.name}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Chick-in: {f.chick_in_date} (Umur {f.age_weeks} Minggu)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Kapasitas</span>
                  <span className="font-black text-slate-900">{(f.capacity || f.initial_population || 0).toLocaleString('id-ID')} ekor</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Pop. Awal</span>
                  <span className="font-black text-slate-900">{f.initial_population.toLocaleString('id-ID')} ekor</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Pop. Saat Ini</span>
                  <span className="font-black text-[#00684a]">{f.current_population.toLocaleString('id-ID')} ekor</span>
                </div>
              </div>
            </div>
          ))}

          {flocks.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-3xl p-6 border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00684a] mx-auto flex items-center justify-center border border-emerald-200">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Belum ada kandang terdaftar</h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">Tambahkan kandang/angkatan baru untuk memulai pencatatan harian.</p>
              </div>
              <button
                onClick={() => {
                  setEditingFlock(null);
                  setIsModalOpen(true);
                }}
                className="bg-[#00684a] hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-2xl text-xs inline-flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Daftarkan Kandang Pertama</span>
              </button>
            </div>
          )}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingFlock(null);
        }}
        flockToEdit={editingFlock}
        onCreateFlock={handleCreateFlock}
        onUpdateFlock={handleUpdateFlock}
      />
    </div>
  );
}
