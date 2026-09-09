'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface FABButtonProps {
  onClick: () => void;
}

export const FABButton: React.FC<FABButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 p-4 rounded-3xl shadow-2xl shadow-emerald-500/40 flex items-center gap-2 transition-all duration-300 border border-white/40 animate-bounce"
      aria-label="Input Catatan Harian Cepat"
    >
      <Plus className="w-7 h-7 stroke-[3.5]" />
      <span className="text-xs font-black uppercase tracking-wider pr-1">Input Cepat</span>
    </button>
  );
};

