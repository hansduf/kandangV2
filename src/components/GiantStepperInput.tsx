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
      border: 'border-emerald-200 bg-white',
      headerBg: 'bg-emerald-50 text-[#00684a] border-b border-emerald-100',
      iconBg: 'bg-emerald-100 text-[#00684a]',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm',
      accentText: 'text-[#00684a]',
    },
    amber: {
      border: 'border-amber-200 bg-white',
      headerBg: 'bg-amber-50 text-amber-800 border-b border-amber-100',
      iconBg: 'bg-amber-100 text-amber-700',
      btnBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm',
      accentText: 'text-amber-700',
    },
    rose: {
      border: 'border-rose-200 bg-white',
      headerBg: 'bg-rose-50 text-rose-800 border-b border-rose-100',
      iconBg: 'bg-rose-100 text-rose-700',
      btnBg: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-sm',
      accentText: 'text-rose-700',
    },
    blue: {
      border: 'border-blue-200 bg-white',
      headerBg: 'bg-blue-50 text-blue-800 border-b border-blue-100',
      iconBg: 'bg-blue-100 text-blue-700',
      btnBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm',
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
    <div className={`rounded-3xl border ${themeStyles.border} overflow-hidden shadow-md`}>
      {/* Header Label */}
      <div className={`${themeStyles.headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${themeStyles.iconBg} flex items-center justify-center shadow-xs`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider uppercase text-slate-800">{label}</h4>
            {sublabel && <p className="text-[11px] font-semibold text-slate-500">{sublabel}</p>}
          </div>
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">{unit}</span>
      </div>

      {/* Main Big Number Input */}
      <div className="p-4 space-y-3.5 bg-slate-50">
        <div className="flex items-center gap-2.5">
          {/* Big Minus Button */}
          <button
            type="button"
            onClick={() => handleDecrement(stepOptions[0] || 1)}
            className="w-14 h-14 rounded-2xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 flex items-center justify-center font-black text-2xl shrink-0 active:scale-95 transition-all shadow-xs"
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
              className="w-full text-center text-3xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-2xl py-2 px-2 focus:outline-none focus:border-[#00684a] focus:ring-4 focus:ring-[#00684a]/20 transition-all shadow-inner"
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
            <div key={step} className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleDecrement(step)}
                className="px-3 py-1 text-xs font-black bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 transition-all active:scale-95 shadow-xs"
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

