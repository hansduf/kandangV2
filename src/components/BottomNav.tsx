'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, TrendingUp, Plus, Droplet, Layers } from 'lucide-react';

interface BottomNavProps {
  onOpenQuickInput?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenQuickInput }) => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] px-3 py-1.5">
      <div className="max-w-md mx-auto flex items-end justify-between relative">
        
        {/* Item 1: Beranda */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            pathname === '/' ? 'text-[#00684a] font-black' : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <LayoutGrid className={`w-6 h-6 mb-1 ${pathname === '/' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] leading-tight font-black tracking-tight">Beranda</span>
        </Link>

        {/* Item 2: Analitik */}
        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            pathname === '/reports' ? 'text-[#00684a] font-black' : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <TrendingUp className={`w-6 h-6 mb-1 ${pathname === '/reports' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] leading-tight font-black tracking-tight">Analitik</span>
        </Link>

        {/* Item 3 (CENTER): Big Green Floating Circular "Catat (+)" Button */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5 relative z-10">
          <button
            onClick={onOpenQuickInput}
            className="w-14 h-14 rounded-full bg-[#00684a] hover:bg-[#00523a] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#00684a]/30 transition-all border-4 border-white"
            aria-label="Catat Data Harian"
          >
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </button>
          <span className="text-[11px] leading-tight font-black tracking-tight text-slate-700 mt-1">Catat</span>
        </div>

        {/* Item 4: Produksi */}
        <Link
          href="/daily-entry"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            pathname === '/daily-entry' ? 'text-[#00684a] font-black' : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <Droplet className={`w-6 h-6 mb-1 ${pathname === '/daily-entry' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] leading-tight font-black tracking-tight">Produksi</span>
        </Link>

        {/* Item 5: Kandang */}
        <Link
          href="/flocks"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            pathname === '/flocks' ? 'text-[#00684a] font-black' : 'text-slate-500 font-bold hover:text-slate-800'
          }`}
        >
          <Layers className={`w-6 h-6 mb-1 ${pathname === '/flocks' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] leading-tight font-black tracking-tight">Kandang</span>
        </Link>

      </div>
    </nav>
  );
};


