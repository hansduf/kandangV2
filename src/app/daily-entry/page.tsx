'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { SleekProductionInput } from '@/components/SleekProductionInput';
import { FlockModal } from '@/components/FlockModal';
import { QuickInputModal } from '@/components/QuickInputModal';
import { fetchFlocks, saveDailyRecord, saveHealthRecord, createFlock } from '@/lib/supabase';
import { Flock, DailyRecord, HealthRecord } from '@/types/database';
import { Egg } from 'lucide-react';

export default function DailyEntryPage() {
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);
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

  const handleSaveDaily = async (record: DailyRecord) => {
    await saveDailyRecord(record);
  };

  const handleSaveHealth = async (record: HealthRecord) => {
    await saveHealthRecord(record);
  };

  const handleCreateFlock = async (flockData: Partial<Flock>) => {
    const newFlock = await createFlock(flockData);
    setFlocks((prev) => [newFlock, ...prev]);
    setActiveFlockId(newFlock.id);
    return newFlock;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <Navbar
        flocks={flocks}
        activeFlockId={activeFlockId}
        onSelectFlock={setActiveFlockId}
        onOpenNewFlockModal={() => setIsFlockModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
            <Egg className="w-5 h-5 fill-[#00684a]" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Input Produksi Telur</h2>
            <p className="text-xs font-semibold text-slate-500">Catat hasil panen & konsumsi pakan</p>
          </div>
        </div>

        {!loading && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
            <SleekProductionInput
              flocks={flocks}
              activeFlockId={activeFlockId}
              onSelectFlock={setActiveFlockId}
              onSave={handleSaveDaily}
            />
          </div>
        )}
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
        isOpen={isFlockModalOpen}
        onClose={() => setIsFlockModalOpen(false)}
        onCreateFlock={handleCreateFlock}
      />
    </div>
  );
}

