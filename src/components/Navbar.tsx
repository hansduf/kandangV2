'use client';

import React from 'react';
import { Egg, Layers, Plus, Users, Crown, HardHat, RefreshCw, CloudCheck, CloudOff } from 'lucide-react';
import { Flock } from '@/types/database';
import { useProfile } from '@/context/ProfileContext';
import { useSync } from '@/context/SyncContext';

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
  const { isOnline, isSyncing, pendingCount, setIsSyncModalOpen } = useSync();

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
              Manajemen Ayam Petelur
            </p>
          </div>
        </div>

        {/* Right Actions: Sync Status, Profile Switcher & Add Flock (Owner only) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sync Status Mini Icon Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all relative active:scale-95 shadow-xs ${
              !isOnline
                ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                : pendingCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                : 'bg-emerald-50/80 border-emerald-200 text-[#00684a] hover:bg-emerald-100/70'
            }`}
            title={!isOnline ? 'Offline - Data tersimpan di HP' : pendingCount > 0 ? `${pendingCount} Data siap disinkronkan` : 'Tersinkron Penuh'}
            aria-label="Status Sinkronisasi"
          >
            {!isOnline ? (
              <CloudOff className="w-4 h-4 stroke-[2.3]" />
            ) : isSyncing ? (
              <RefreshCw className="w-4 h-4 stroke-[2.3] animate-spin text-blue-600" />
            ) : pendingCount > 0 ? (
              <RefreshCw className="w-4 h-4 stroke-[2.3] text-blue-600" />
            ) : (
              <CloudCheck className="w-4 h-4 stroke-[2.3]" />
            )}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs border border-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {/* Active Profile Pill / Switcher Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-2.5 py-1.5 rounded-2xl border bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 text-xs font-black"
            title="Ganti Profil Pengguna"
          >
            <div className="w-5 h-5 rounded-lg bg-[#00684a] flex items-center justify-center text-white text-[10px] font-black uppercase">
              {activeProfile?.name ? activeProfile.name.charAt(0) : 'U'}
            </div>
            <span className="max-w-[70px] sm:max-w-[110px] truncate text-[11px] sm:text-xs">
              {activeProfile ? activeProfile.name : 'Pilih Akun'}
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


