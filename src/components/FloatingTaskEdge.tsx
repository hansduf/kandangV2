'use client';

import React, { useState, useEffect } from 'react';
import { DailyTaskView } from '@/types/database';
import { fetchTasksForDate, toggleTaskCompletion } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import {
  Egg,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Check,
  Bell,
  X,
  Syringe,
  Pill,
  Sparkles,
} from 'lucide-react';

interface FloatingTaskEdgeProps {
  onOpenQuickInput: (
    flockId?: string,
    tab?: 'daily' | 'health' | 'mortality',
    healthCategory?: 'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'
  ) => void;
  refreshTrigger?: any;
}

export const FloatingTaskEdge: React.FC<FloatingTaskEdgeProps> = ({
  onOpenQuickInput,
  refreshTrigger,
}) => {
  const { activeProfile } = useProfile();
  const [tasks, setTasks] = useState<DailyTaskView[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const loadTodayTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasksForDate(todayStr, activeProfile?.id);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load today tasks for floating edge:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayTasks();
  }, [activeProfile?.id, refreshTrigger]);

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  // If there are no tasks at all today
  if (tasks.length === 0) return null;

  const handleTaskClick = async (task: DailyTaskView, specificFlockId?: string) => {
    // Find uncompleted flock if any
    const pendingFlock = task.flocks_status?.find((f) => !f.is_done);
    const targetFlockId = specificFlockId || pendingFlock?.flock_id || task.flock_id || undefined;

    if (task.task_type === 'daily_record') {
      onOpenQuickInput(targetFlockId, 'daily');
    } else if (task.task_type === 'vaccine') {
      onOpenQuickInput(targetFlockId, 'health', 'Vaksin');
    } else if (task.task_type === 'medicine' || (task.task_type as any) === 'obat') {
      onOpenQuickInput(targetFlockId, 'health', 'Obat');
    } else if (task.task_type === 'vitamin') {
      onOpenQuickInput(targetFlockId, 'health', 'Vitamin');
    } else {
      await toggleTaskCompletion(task.task_id, todayStr, activeProfile?.id);
      await loadTodayTasks();
    }
  };

  const primaryPendingTask = pendingTasks[0];

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
      {/* EXPANDED TASK LIST SHEET */}
      {isExpanded && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl space-y-3 mb-2 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Daftar Tugas Hari Ini
                </h4>
                <p className="text-[10px] font-semibold text-slate-500">
                  {completedTasks.length} dari {tasks.length} tugas selesai
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isEgg = task.task_type === 'daily_record';
              const isVaccine = task.task_type === 'vaccine';
              const isMedicine = task.task_type === 'medicine' || (task.task_type as any) === 'obat';
              const isVitamin = task.task_type === 'vitamin';
              const pendingFlock = task.flocks_status?.find((f) => !f.is_done);
              const targetCoopLabel = pendingFlock ? ` (${pendingFlock.coop_name})` : '';

              return (
                <div
                  key={task.task_id}
                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
                    task.is_completed
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-emerald-50/60 border-emerald-200 shadow-xs'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: task.color || '#10b981' }}
                      />
                      <span className={`text-xs font-black truncate ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                      {task.coop_name ? (
                        <span className="text-[9px] font-black bg-emerald-100 text-[#00684a] px-1.5 py-0.5 rounded-md border border-emerald-200">
                          🏠 {task.coop_name}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                          🏠 Semua Kandang
                        </span>
                      )}
                    </div>

                    {/* Per-kandang completion status breakdown (Clickable badges) */}
                    {task.flocks_status && task.flocks_status.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {task.flocks_status.map((fs, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleTaskClick(task, fs.flock_id)}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 transition-all active:scale-95 ${
                              fs.is_done
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400 cursor-pointer'
                            }`}
                            title={`Klik untuk catat ${fs.coop_name}`}
                          >
                            <span>{fs.coop_name}</span>
                            <span>{fs.is_done ? '✅ Selesai' : '⏳ Belum'}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {task.description && (
                      <p className="text-[10px] text-slate-500 font-semibold truncate mt-1">
                        {task.description}
                      </p>
                    )}
                    {task.due_time && (
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                        ⏰ Target: {task.due_time.substring(0, 5)} WIB
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTaskClick(task)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-xs mt-0.5 ${
                      task.is_completed
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-[#00684a] text-white hover:bg-emerald-800'
                    }`}
                  >
                    {task.is_completed ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Selesai</span>
                      </>
                    ) : isEgg ? (
                      <>
                        <Egg className="w-3.5 h-3.5 fill-white/20" />
                        <span>Catat Telur{targetCoopLabel}</span>
                      </>
                    ) : isVaccine ? (
                      <>
                        <Syringe className="w-3.5 h-3.5" />
                        <span>Catat Vaksin{targetCoopLabel}</span>
                      </>
                    ) : isMedicine ? (
                      <>
                        <Pill className="w-3.5 h-3.5" />
                        <span>Catat Obat{targetCoopLabel}</span>
                      </>
                    ) : isVitamin ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Catat Vitamin{targetCoopLabel}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Tandai Selesai</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FLOATING ACTION PILL BADGE */}
      <div
        className={`rounded-2xl p-2.5 sm:p-3 shadow-xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
          pendingTasks.length > 0
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-emerald-800 text-white border-emerald-700'
        }`}
        onClick={() => {
          if (primaryPendingTask) {
            handleTaskClick(primaryPendingTask);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >

        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              pendingTasks.length > 0
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-emerald-500 text-white'
            }`}
          >
            {pendingTasks.length > 0 ? (
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          <div className="min-w-0">
            {pendingTasks.length > 0 ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    {pendingTasks.length} Tugas Menunggu
                  </span>
                </div>
                <p className="text-xs font-black truncate text-white">
                  {primaryPendingTask.title}
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                  Status Tugas Hari Ini
                </span>
                <p className="text-xs font-black text-white">
                  Semua tugas hari ini telah diselesaikan! ✅
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Lihat semua tugas"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
