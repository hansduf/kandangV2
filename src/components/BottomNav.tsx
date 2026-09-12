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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1 sm:px-4 sm:py-1.5 pb-safe">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex items-end justify-between relative">
        
        {/* Item 1: Beranda */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/' ? 'text-[#00684a] font-black' : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${pathname === '/' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight font-black tracking-tight">Beranda</span>
        </Link>

        {/* Item 2: Kandang */}
        <Link
          href="/flocks"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/flocks' ? 'text-[#00684a] font-black' : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <Layers className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${pathname === '/flocks' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight font-black tracking-tight">Kandang</span>
        </Link>

        {/* Item 3 (CENTER): Big Green Floating Circular "Catat (+)" Button */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-4 sm:-mt-5 relative z-10">
          <button
            onClick={onOpenQuickInput}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#00684a] hover:bg-[#00523a] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#00684a]/30 transition-all border-4 border-white"
            aria-label="Catat Data Harian"
          >
            <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          </button>
          <span className="text-[10px] sm:text-[11px] leading-tight font-black tracking-tight text-slate-700 mt-0.5">Catat</span>
        </div>

        {/* Item 4: Kesehatan */}
        <Link
          href="/health"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/health' ? 'text-[#00684a] font-black' : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <Droplet className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${pathname === '/health' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight font-black tracking-tight">Kesehatan</span>
        </Link>

        {/* Item 5: Analitik */}
        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/reports' ? 'text-[#00684a] font-black' : 'text-slate-500 font-semibold hover:text-slate-800'
          }`}
        >
          <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 ${pathname === '/reports' ? 'stroke-[2.5px] text-[#00684a]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] sm:text-[11px] leading-tight font-black tracking-tight">Analitik</span>
        </Link>

      </div>
    </nav>
  );
};



