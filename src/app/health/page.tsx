'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { HealthRecordForm } from '@/components/HealthRecordForm';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { fetchFlocks, fetchHealthRecords, saveHealthRecord, saveDailyRecord, createFlock } from '@/lib/supabase';
import { Flock, HealthRecord, DailyRecord } from '@/types/database';
import { Syringe, Calendar, FileText } from 'lucide-react';

export default function HealthPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [healthList, setHealthList] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);

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

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  const categoryBadgeColor = (cat: string) => {
    const catLower = cat.toLowerCase();
    if (catLower.includes('vaksin')) return 'bg-emerald-50 text-[#00684a] border-emerald-200';
    if (catLower.includes('obat')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (catLower.includes('vitamin')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
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
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Obat, Vaksin & Vitamin</h2>
            <p className="text-xs font-semibold text-slate-500">Pencatatan & timeline kesehatan ayam</p>
          </div>
        </div>

        {!loading && activeFlockId && (() => {
          const activeFlock = flocks.find((f) => f.id === activeFlockId);
          return (
            <HealthRecordForm
              flockId={activeFlockId}
              coopName={activeFlock?.coop_name}
              flockName={activeFlock?.name}
              onSave={handleSaveHealth}
            />
          );
        })()}

        {/* Timeline Records */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Timeline Penanganan ({healthList.length})
          </h3>

          <div className="space-y-3">
            {healthList.map((h) => (
              <div key={h.id || h.record_date + h.item_name} className="bg-white p-4 rounded-3xl space-y-2 border border-slate-200 shadow-md">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${categoryBadgeColor(
                      h.category
                    )}`}
                  >
                    {h.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{h.record_date}</span>
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-900">{h.item_name}</h4>

                <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
                  {h.dosage && <span>Dosis: <strong className="text-[#00684a] font-bold">{h.dosage}</strong></span>}
                  {h.method && <span>Metode: <strong className="text-amber-700 font-bold">{h.method}</strong></span>}
                </div>

                {h.notes && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-1.5 mt-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{h.notes}</span>
                  </p>
                )}
              </div>
            ))}

            {healthList.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs font-semibold bg-white rounded-3xl p-4 border border-slate-200">
                Belum ada catatan kesehatan untuk angkatan ini.
              </div>
            )}
          </div>
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

