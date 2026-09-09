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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Obat':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Vitamin':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Obat, Vaksin & Vitamin</h2>
            <p className="text-xs font-medium text-slate-500">Pencatatan & timeline kesehatan ayam</p>
          </div>
        </div>

        {!loading && activeFlockId && (
          <HealthRecordForm flockId={activeFlockId} onSave={handleSaveHealth} />
        )}

        {/* Timeline Records */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Timeline Penanganan ({healthList.length})
          </h3>

          <div className="space-y-2.5">
            {healthList.map((h) => (
              <div key={h.id || h.record_date + h.item_name} className="stat-card p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadgeColor(
                      h.category
                    )}`}
                  >
                    {h.category}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{h.record_date}</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900">{h.item_name}</h4>

                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  {h.dosage && <span>Dosis: <strong>{h.dosage}</strong></span>}
                  {h.method && <span>Metode: <strong>{h.method}</strong></span>}
                </div>

                {h.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{h.notes}</span>
                  </p>
                )}
              </div>
            ))}

            {healthList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
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
