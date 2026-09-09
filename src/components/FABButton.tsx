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
      className="fixed bottom-6 right-5 z-40 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/50 flex items-center gap-2 transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-emerald-300"
      aria-label="Input Catatan Harian"
    >
      <Plus className="w-8 h-8 stroke-[3]" />
      <span className="text-xs font-black uppercase tracking-wider pr-1 hidden sm:inline">Catat Harian</span>
    </button>
  );
};
