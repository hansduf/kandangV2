'use client';

import React from 'react';
import { LucideIcon, Plus, Minus } from 'lucide-react';

interface GiantStepperInputProps {
  label: string;
  sublabel?: string;
  value: number | '';
  onChange: (val: number | '') => void;
  unit: string;
  icon: LucideIcon;
  colorTheme: 'emerald' | 'amber' | 'rose' | 'blue';
  stepOptions?: number[];
  allowDecimal?: boolean;
}

export const GiantStepperInput: React.FC<GiantStepperInputProps> = ({
  label,
  sublabel,
  value,
  onChange,
  unit,
  icon: Icon,
  colorTheme,
  stepOptions = [1, 10],
  allowDecimal = false,
}) => {
  const numericValue = typeof value === 'number' ? value : 0;

  const themeStyles = {
    emerald: {
      border: 'gradient-border-emerald',
      headerBg: 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      btnBg: 'bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30',
      accentText: 'text-emerald-400',
    },
    amber: {
      border: 'gradient-border-amber',
      headerBg: 'bg-amber-500/10 text-amber-300 border-b border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      btnBg: 'bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-300 border border-amber-500/30',
      accentText: 'text-amber-400',
    },
    rose: {
      border: 'gradient-border-rose',
      headerBg: 'bg-rose-500/10 text-rose-300 border-b border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      btnBg: 'bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 border border-rose-500/30',
      accentText: 'text-rose-400',
    },
    blue: {
      border: 'gradient-border-blue',
      headerBg: 'bg-blue-500/10 text-blue-300 border-b border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      btnBg: 'bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 text-blue-300 border border-blue-500/30',
      accentText: 'text-blue-400',
    },
  }[colorTheme];

  const handleIncrement = (amount: number) => {
    const newVal = Number((numericValue + amount).toFixed(allowDecimal ? 2 : 0));
    onChange(newVal < 0 ? 0 : newVal);
  };

  const handleDecrement = (amount: number) => {
    const newVal = Number((numericValue - amount).toFixed(allowDecimal ? 2 : 0));
    onChange(newVal < 0 ? 0 : newVal);
  };

  return (
    <div className={`rounded-3xl ${themeStyles.border} overflow-hidden shadow-xl`}>
      {/* Header Label */}
      <div className={`${themeStyles.headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${themeStyles.iconBg} flex items-center justify-center shadow-md`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase text-white">{label}</h4>
            {sublabel && <p className="text-[11px] font-semibold text-slate-400">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">{unit}</span>
      </div>

      {/* Main Big Number Input */}
      <div className="p-4 space-y-3.5 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          {/* Big Minus Button */}
          <button
            type="button"
            onClick={() => handleDecrement(stepOptions[0] || 1)}
            className={`w-14 h-14 rounded-2xl ${themeStyles.btnBg} flex items-center justify-center font-black text-2xl shrink-0 active:scale-95 transition-all shadow-md`}
          >
            <Minus className="w-7 h-7 stroke-[3]" />
          </button>

          {/* Numeric Field */}
          <div className="flex-1 relative flex items-center justify-center">
            <input
              type="number"
              step={allowDecimal ? '0.01' : '1'}
              min="0"
              value={value}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-center text-3xl font-black text-white bg-slate-800/90 border-2 border-slate-700/80 rounded-2xl py-2 px-2 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
            />
          </div>

          {/* Big Plus Button */}
          <button
            type="button"
            onClick={() => handleIncrement(stepOptions[0] || 1)}
            className={`w-14 h-14 rounded-2xl ${themeStyles.btnBg} flex items-center justify-center font-black text-2xl shrink-0 active:scale-95 transition-all shadow-md`}
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>

        {/* Quick Stepper Pills (+10, +100, etc) */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {stepOptions.map((step) => (
            <div key={step} className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleDecrement(step)}
                className="px-3 py-1 text-xs font-black bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all active:scale-95"
              >
                -{step}
              </button>
              <button
                type="button"
                onClick={() => handleIncrement(step)}
                className={`px-3.5 py-1 text-xs font-black ${themeStyles.btnBg} rounded-xl transition-all active:scale-95`}
              >
                +{step}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

