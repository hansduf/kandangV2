'use client';

import React from 'react';
import { Egg, Layers, Plus, Users, Crown, HardHat, RefreshCw } from 'lucide-react';
import { Flock } from '@/types/database';
import { useProfile } from '@/context/ProfileContext';

interface NavbarProps {
  flocks?: Flock[];
  activeFlockId?: string;
  onSelectFlock?: (id: string) => void;
  onOpenNewFlockModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewFlockModal,
}) => {
  const { activeProfile, isOwner, setIsProfileModalOpen } = useProfile();

  return (
    <header className="sticky top-0 z-40 w-full nav-blur px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#00684a] flex items-center justify-center text-white shadow-md shadow-[#00684a]/20">
            <Egg className="w-4 h-4 sm:w-5 sm:h-5 fill-white/30" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Kandang<span className="text-[#00684a]">Ku</span></h1>
              <span className="text-[9px] sm:text-[10px] font-extrabold bg-emerald-100 text-[#00684a] px-1.5 py-0.2 rounded-md uppercase">v2</span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
              {isOwner ? 'Mode Pemilik' : 'Mode Pekerja'}
            </p>
          </div>
        </div>

        {/* Right Actions: Profile Switcher & Add Flock (Owner only) */}
        <div className="flex items-center gap-2">
          {/* Active Profile Pill / Switcher Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-2xl border flex items-center gap-1.5 transition-all shadow-xs active:scale-95 text-xs font-black ${
              isOwner
                ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/80'
                : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/80'
            }`}
            title="Ganti Profil Pengguna"
          >
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-white text-[11px] font-black ${
              isOwner ? 'bg-[#00684a]' : 'bg-blue-600'
            }`}>
              {isOwner ? <Crown className="w-3.5 h-3.5 text-amber-300" /> : <HardHat className="w-3.5 h-3.5 text-amber-300" />}
            </div>
            <span className="max-w-[70px] sm:max-w-[90px] truncate text-[11px] sm:text-xs">
              {activeProfile ? activeProfile.name : 'Pilih Profil'}
            </span>
            <RefreshCw className="w-3 h-3 text-slate-400 stroke-[2.5]" />
          </button>

          {/* Add Flock Action Button (Owner Only) */}
          {isOwner && (
            <button
              onClick={onOpenNewFlockModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-[#e6f4ed] hover:bg-[#d2ede0] active:scale-95 text-[#00684a] flex items-center gap-1 transition-all shadow-xs border border-emerald-200 text-xs font-black"
              title="Tambah Kandang / Angkatan"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Tambah Kandang</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


