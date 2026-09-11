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
    <div className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border ${themeStyles.borderClass} shadow-sm ${themeStyles.glow} flex flex-col justify-between transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate mr-1">{title}</span>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center ${themeStyles.iconBg} shadow-xs shrink-0`}>
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl sm:text-2xl font-black tracking-tight ${themeStyles.valueColor}`}>{value}</span>
          {unit && <span className="text-xs font-extrabold text-slate-500">{unit}</span>}
        </div>
        {subtitle && <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

