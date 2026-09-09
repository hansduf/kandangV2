'use client';

import React from 'react';
import { Egg, Layers, Plus } from 'lucide-react';
import { Flock } from '@/types/database';

interface NavbarProps {
  flocks: Flock[];
  activeFlockId: string;
  onSelectFlock: (id: string) => void;
  onOpenNewFlockModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  flocks,
  activeFlockId,
  onSelectFlock,
  onOpenNewFlockModal,
}) => {
  const activeFlock = flocks.find((f) => f.id === activeFlockId) || flocks[0];

  return (
    <header className="sticky top-0 z-40 w-full nav-blur border-b border-slate-200 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
            <Egg className="w-5 h-5 fill-emerald-100" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">KandangKu</h1>
            <p className="text-xs font-medium text-emerald-600">Catatan Ayam Petelur</p>
          </div>
        </div>

        {/* Flock Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200">
            <Layers className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none pr-1 cursor-pointer max-w-[120px] truncate"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Flock Button */}
          <button
            onClick={onOpenNewFlockModal}
            className="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors"
            title="Tambah Angkatan Baru"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
