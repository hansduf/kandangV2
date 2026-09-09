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
    { label: 'LAPORAN & GRAFIK', href: '/reports', icon: BarChart3 },
    { label: 'KANDANG', href: '/flocks', icon: Home },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-200 px-2 py-2 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-emerald-700 bg-emerald-100/90 font-black scale-105 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 font-bold'
              }`}
            >
              <Icon className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[2.5px] text-emerald-700' : 'stroke-2'}`} />
              <span className="text-[11px] leading-tight tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
