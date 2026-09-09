'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Edit3, Syringe, BarChart3, Home } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'CATAT HARIAN', href: '/', icon: Edit3 },
    { label: 'OBAT & VAKSIN', href: '/health', icon: Syringe },
    { label: 'LAPORAN', href: '/reports', icon: BarChart3 },
    { label: 'KANDANG', href: '/flocks', icon: Home },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto nav-bottom-blur rounded-3xl p-1.5 shadow-2xl border border-white/10 shadow-emerald-950/40">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all duration-300 relative ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/15 font-black scale-105 shadow-lg shadow-emerald-500/20 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 font-bold hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px] text-emerald-400 animate-pulse-glow' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-wide font-black uppercase">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-4 h-1 rounded-full bg-emerald-400 shadow-md shadow-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

