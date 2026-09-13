'use client';

import React from 'react';
import { useSync } from '@/context/SyncContext';
import { Cloud, CloudCheck, CloudOff, RefreshCw, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const SyncStatusModal: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    queue,
    syncNow,
    isSyncModalOpen,
    setIsSyncModalOpen,
  } = useSync();

  if (!isSyncModalOpen) return null;

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Belum pernah';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return isoString;
    }
  };

  const getItemLabel = (type: string, payload: any) => {
    switch (type) {
      case 'DAILY_RECORD':
        return `Catatan Harian (${payload.record_date}): ${payload.egg_good_pcs || 0} btr telur`;
      case 'TASK_COMPLETION':
        return `Tugas Kandang: ${payload.isCompleted ? 'Tandai Selesai' : 'Batal Selesai'}`;
      case 'HEALTH_RECORD':
        return `Kesehatan (${payload.category}): ${payload.item_name}`;
      default:
        return `Data Kandang: ${type}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              !isOnline ? 'bg-amber-100 text-amber-700' : pendingCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-[#00684a]'
            }`}>
              {!isOnline ? (
                <CloudOff className="w-4 h-4 stroke-[2.5]" />
              ) : pendingCount > 0 ? (
                <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isSyncing ? 'animate-spin' : ''}`} />
              ) : (
                <CloudCheck className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Status Sinkronisasi</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {isOnline ? '🟢 Terhubung ke Internet' : '🟡 Mode Offline (Tanpa Sinyal)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border ${
            !isOnline
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : pendingCount > 0
              ? 'bg-blue-50/80 border-blue-200 text-blue-900'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-start gap-2.5">
              {!isOnline ? (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : pendingCount > 0 ? (
                <RefreshCw className={`w-5 h-5 text-blue-600 shrink-0 mt-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-black">
                  {!isOnline
                    ? 'Aplikasi Siap Digunakan Offline'
                    : pendingCount > 0
                    ? `${pendingCount} Data Menunggu Diunggah`
                    : 'Semua Data Tersinkron'}
                </p>
                <p className="text-[11px] font-medium mt-1 leading-relaxed opacity-85">
                  {!isOnline
                    ? 'Anda tetap bisa mencatat telur, obat, dan tugas tanpa sinyal. Data aman tersimpan di HP dan otomatis terkirim saat online kembali.'
                    : pendingCount > 0
                    ? 'Data tersimpan di HP dan sedang bersiap dikirim ke server Supabase.'
                    : 'Data di HP dan server cloud Supabase sudah sinkron dan mutakhir.'}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Queue Items */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>Antrean Data ({queue.length})</span>
                <span className="text-[10px] text-slate-400">Tersimpan di Memori HP</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <p className="font-bold text-slate-800 truncate text-[11px]">
                        {getItemLabel(item.type, item.payload)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.authorName ? `${item.authorName} • ` : ''}
                        {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 ${
                      item.status === 'syncing'
                        ? 'bg-blue-100 text-blue-700'
                        : item.status === 'failed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status === 'syncing' ? 'Mengunggah' : item.status === 'failed' ? 'Gagal' : 'Menunggu'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Synced Meta */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Terakhir Sinkron:
            </span>
            <span className="text-slate-700 font-bold">{formatTime(lastSyncedAt)}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => syncNow()}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
              !isOnline || pendingCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#00684a] hover:bg-[#00523a] active:scale-95 text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
};
