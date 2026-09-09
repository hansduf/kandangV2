'use client';

import React from 'react';
import { Egg, Layers, Plus, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full nav-blur px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 border border-white/20">
              <Egg className="w-5 h-5 fill-emerald-100/40 animate-pulse-glow" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-base font-black text-white tracking-tight">Kandang<span className="text-emerald-400">Ku</span></h1>
              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-md uppercase">v2</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">Manajemen Ayam Petelur</p>
          </div>
        </div>

        {/* Flock Selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center bg-slate-800/80 hover:bg-slate-800 rounded-2xl px-3 py-1.5 border border-slate-700/80 transition-all shadow-inner">
            <Layers className="w-4 h-4 text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={activeFlockId}
              onChange={(e) => onSelectFlock(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer max-w-[125px] truncate"
            >
              {flocks.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white font-medium">
                  {f.coop_name} - {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Flock Button */}
          <button
            onClick={onOpenNewFlockModal}
            className="w-9 h-9 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-all shadow-md"
            title="Tambah Kandang / Angkatan"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </header>
  );
};

