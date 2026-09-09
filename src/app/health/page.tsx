'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { HealthRecordForm } from '@/components/HealthRecordForm';
import { FlockModal } from '@/components/FlockModal';
import { fetchFlocks, fetchHealthRecords, saveHealthRecord, createFlock } from '@/lib/supabase';
import { Flock, HealthRecord } from '@/types/database';
import { Syringe, Calendar, FileText } from 'lucide-react';

export default function HealthPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [healthList, setHealthList] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadFlocks();
  }, []);

  useEffect(() => {
    if (activeFlockId) {
      loadHealth(activeFlockId);
    }
  }, [activeFlockId]);

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

  const loadHealth = async (flockId: string) => {
    try {
      const data = await fetchHealthRecords(flockId);
      setHealthList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
    await loadHealth(activeFlockId);
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const categoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Vaksin':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Obat':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Vitamin':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
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
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Obat, Vaksin & Vitamin</h2>
            <p className="text-xs font-semibold text-slate-400">Pencatatan & timeline kesehatan ayam</p>
          </div>
        </div>

        {!loading && activeFlockId && (
          <HealthRecordForm flockId={activeFlockId} onSave={handleSaveHealth} />
        )}

        {/* Timeline Records */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
            Timeline Penanganan ({healthList.length})
          </h3>

          <div className="space-y-3">
            {healthList.map((h) => (
              <div key={h.id || h.record_date + h.item_name} className="glass-card p-4 space-y-2 border border-slate-700/80 shadow-xl">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${categoryBadgeColor(
                      h.category
                    )}`}
                  >
                    {h.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{h.record_date}</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-white">{h.item_name}</h4>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                  {h.dosage && <span>Dosis: <strong className="text-emerald-400 font-bold">{h.dosage}</strong></span>}
                  {h.method && <span>Metode: <strong className="text-amber-400 font-bold">{h.method}</strong></span>}
                </div>

                {h.notes && (
                  <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-start gap-1.5 mt-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{h.notes}</span>
                  </p>
                )}
              </div>
            ))}

            {healthList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold glass-card p-4 border border-slate-800">
                Belum ada catatan kesehatan untuk angkatan ini.
              </div>
            )}
          </div>
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

