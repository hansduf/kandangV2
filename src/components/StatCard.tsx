'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  colorTheme?: 'emerald' | 'amber' | 'rose' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorTheme = 'emerald',
}) => {
  const themeStyles = {
    emerald: {
      borderClass: 'gradient-border-emerald',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10',
      valueColor: 'text-emerald-400',
      glow: 'shadow-emerald-500/5',
    },
    amber: {
      borderClass: 'gradient-border-amber',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-amber-500/10',
      valueColor: 'text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    rose: {
      borderClass: 'gradient-border-rose',
      iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-rose-500/10',
      valueColor: 'text-rose-400',
      glow: 'shadow-rose-500/5',
    },
    blue: {
      borderClass: 'gradient-border-blue',
      iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-blue-500/10',
      valueColor: 'text-blue-400',
      glow: 'shadow-blue-500/5',
    },
  }[colorTheme];

  return (
    <div className={`p-4 rounded-3xl ${themeStyles.borderClass} shadow-xl ${themeStyles.glow} flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${themeStyles.iconBg} shadow-md`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black tracking-tight ${themeStyles.valueColor}`}>{value}</span>
          {unit && <span className="text-xs font-extrabold text-slate-400">{unit}</span>}
        </div>
        {subtitle && <p className="text-[11px] font-bold text-slate-400 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

