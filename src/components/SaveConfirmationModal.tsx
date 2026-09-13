'use client';

import React from 'react';
import { AlertTriangle, Check, X, ShieldAlert, Calendar, Home } from 'lucide-react';

export interface ConfirmationSummaryItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: string;
}

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  title?: string;
  confirmQuestion?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  coopName: string;
  flockName?: string;
  recordDate: string;
  categoryBadge?: string;
  items: ConfirmationSummaryItem[];
  warningMessage?: string;
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  title = 'Konfirmasi Penyimpanan Data',
  confirmQuestion,
  confirmButtonText = 'Ya, Simpan',
  cancelButtonText = 'Periksa Lagi',
  coopName,
  flockName,
  recordDate,
  categoryBadge,
  items,
  warningMessage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 space-y-4 p-5">
        
        {/* Header with Alert Icon */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] font-semibold text-slate-500">
                Periksa kembali data sebelum disimpan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* QUESTION PROMPT BANNER (IF SPECIFIED) */}
        {confirmQuestion && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-center shadow-xs">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-700 block mb-0.5">
              KONFIRMASI PERIKSA
            </span>
            <p className="text-sm font-black text-amber-950">
              {confirmQuestion}
            </p>
          </div>
        )}

        {/* HIGH CONTRAST COOP VERIFICATION BANNER */}
        <div className="bg-emerald-50 border-2 border-[#00684a] rounded-2xl p-3.5 text-center shadow-xs space-y-1">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800 block">
            📍 KANDANG TUJUAN
          </span>
          <div className="flex items-center justify-center gap-1.5 text-base font-black text-[#00684a]">
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-lg uppercase">{coopName || 'Kandang'}</span>
            {flockName && (
              <span className="text-xs text-emerald-700 font-bold">({flockName})</span>
            )}
          </div>
          <p className="text-[9px] font-bold text-emerald-700">
            Pastikan Anda tidak salah memilih kandang!
          </p>
        </div>

        {/* DETAILS TABLE / SUMMARY */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
          {/* Date & Category row */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Tanggal:</span>
            </span>
            <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
              {recordDate}
            </span>
          </div>

          {categoryBadge && (
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Kategori:</span>
              <span className="font-black text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 text-[10px]">
                {categoryBadge}
              </span>
            </div>
          )}

          {/* List of Data Items */}
          <div className="space-y-1.5 pt-0.5">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-slate-600">
                  {it.label}:
                </span>
                <span
                  className={`font-black text-xs ${
                    it.highlight
                      ? 'text-[#00684a] text-sm font-black'
                      : it.color || 'text-slate-900'
                  }`}
                >
                  {it.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Warning hint */}
        <p className="text-[9.5px] text-slate-400 font-semibold text-center px-1">
          {warningMessage || 'Data yang disimpan akan langsung memperbarui grafik analitik & tugas kandang.'}
        </p>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{cancelButtonText}</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{confirmButtonText}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
