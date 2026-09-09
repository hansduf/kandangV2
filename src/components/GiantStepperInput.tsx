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
      border: 'border-emerald-200 focus-within:border-emerald-500',
      headerBg: 'bg-emerald-50 text-emerald-800',
      iconBg: 'bg-emerald-600 text-white',
      btnBg: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:bg-emerald-300',
      accentText: 'text-emerald-700',
    },
    amber: {
      border: 'border-amber-200 focus-within:border-amber-500',
      headerBg: 'bg-amber-50 text-amber-800',
      iconBg: 'bg-amber-600 text-white',
      btnBg: 'bg-amber-100 text-amber-800 hover:bg-amber-200 active:bg-amber-300',
      accentText: 'text-amber-700',
    },
    rose: {
      border: 'border-rose-200 focus-within:border-rose-500',
      headerBg: 'bg-rose-50 text-rose-800',
      iconBg: 'bg-rose-600 text-white',
      btnBg: 'bg-rose-100 text-rose-800 hover:bg-rose-200 active:bg-rose-300',
      accentText: 'text-rose-700',
    },
    blue: {
      border: 'border-blue-200 focus-within:border-blue-500',
      headerBg: 'bg-blue-50 text-blue-800',
      iconBg: 'bg-blue-600 text-white',
      btnBg: 'bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300',
      accentText: 'text-blue-700',
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
    <div className={`stat-card border-2 ${themeStyles.border} overflow-hidden shadow-sm`}>
      {/* Header Label */}
      <div className={`${themeStyles.headerBg} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${themeStyles.iconBg} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide uppercase">{label}</h4>
            {sublabel && <p className="text-[11px] font-semibold opacity-80">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs font-black uppercase tracking-wider opacity-70">{unit}</span>
      </div>

      {/* Main Big Number Input */}
      <div className="p-4 space-y-3 bg-white">
        <div className="flex items-center gap-2">
          {/* Big Minus Button */}
          <button
            type="button"
            onClick={() => handleDecrement(stepOptions[0] || 1)}
            className={`w-14 h-14 rounded-2xl ${themeStyles.btnBg} flex items-center justify-center font-black text-2xl shrink-0 active:scale-95 transition-all`}
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
              className="w-full text-center text-3xl font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl py-2 px-1 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Big Plus Button */}
          <button
            type="button"
            onClick={() => handleIncrement(stepOptions[0] || 1)}
            className={`w-14 h-14 rounded-2xl ${themeStyles.btnBg} flex items-center justify-center font-black text-2xl shrink-0 active:scale-95 transition-all`}
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>

        {/* Quick Stepper Pills (+10, +100, etc) */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {stepOptions.map((step) => (
            <div key={step} className="flex gap-1">
              <button
                type="button"
                onClick={() => handleDecrement(step)}
                className="px-2.5 py-1 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                -{step}
              </button>
              <button
                type="button"
                onClick={() => handleIncrement(step)}
                className={`px-3 py-1 text-xs font-extrabold ${themeStyles.btnBg} rounded-xl transition-all`}
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
