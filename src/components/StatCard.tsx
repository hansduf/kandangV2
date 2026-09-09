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
      borderClass: 'border-emerald-200 bg-white',
      iconBg: 'bg-emerald-50 text-[#00684a] border border-emerald-200',
      valueColor: 'text-[#00684a]',
      glow: 'shadow-emerald-900/5',
    },
    amber: {
      borderClass: 'border-amber-200 bg-white',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
      valueColor: 'text-amber-600',
      glow: 'shadow-amber-900/5',
    },
    rose: {
      borderClass: 'border-rose-200 bg-white',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
      valueColor: 'text-rose-600',
      glow: 'shadow-rose-900/5',
    },
    blue: {
      borderClass: 'border-blue-200 bg-white',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
      valueColor: 'text-blue-600',
      glow: 'shadow-blue-900/5',
    },
  }[colorTheme];

  return (
    <div className={`p-4 rounded-3xl border ${themeStyles.borderClass} shadow-md ${themeStyles.glow} flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${themeStyles.iconBg} shadow-xs`}>
          <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black tracking-tight ${themeStyles.valueColor}`}>{value}</span>
          {unit && <span className="text-xs font-extrabold text-slate-500">{unit}</span>}
        </div>
        {subtitle && <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

