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
    <header className="sticky top-0 z-40 w-full nav-blur px-4 py-3 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#00684a] flex items-center justify-center text-white shadow-md shadow-[#00684a]/20">
            <Egg className="w-5 h-5 fill-white/30" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-base font-black text-slate-900 tracking-tight">Kandang<span className="text-[#00684a]">Ku</span></h1>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-[#00684a] px-1.5 py-0.2 rounded-md uppercase">v2</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Manajemen Ayam Petelur</p>
          </div>
        </div>

        {/* Flock Selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center bg-slate-100 rounded-2xl px-3 py-1.5 border border-slate-200 shadow-inner">
            <Layers className="w-4 h-4 text-[#00684a] mr-1.5 shrink-0" />
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer max-w-[125px] truncate"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id} className="bg-white text-slate-900 font-bold">
                  {f.coop_name} - {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Flock Button */}
          <button
            onClick={onOpenNewFlockModal}
            className="w-9 h-9 rounded-2xl bg-[#e6f4ed] hover:bg-[#d2ede0] active:scale-95 text-[#00684a] flex items-center justify-center transition-all shadow-xs border border-emerald-200"
            title="Tambah Kandang / Angkatan"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </header>
  );
};


