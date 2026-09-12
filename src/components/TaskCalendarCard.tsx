'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DailyTaskView, FarmTask } from '@/types/database';
import {
  fetchTasksForDate,
  toggleTaskCompletion,
  fetchMonthTaskStatus,
  fetchAllTasks,
  MonthDayTaskStatus,
} from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Egg,
  Check,
  Plus,
  Pencil,
  Trash2,
  Syringe,
  Pill,
  Sparkles,
} from 'lucide-react';

interface TaskCalendarCardProps {
  onOpenQuickInput?: (
    flockId?: string,
    tab?: 'daily' | 'health' | 'mortality',
    healthCategory?: 'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'
  ) => void;
  workerId?: string;
  readOnly?: boolean;
  onOpenCreateTask?: (date?: string) => void;
  onOpenEditTask?: (task: FarmTask) => void;
  onDeleteTask?: (taskId: string) => void;
  refreshTrigger?: any;
}


export const TaskCalendarCard: React.FC<TaskCalendarCardProps> = ({
  onOpenQuickInput,
  workerId,
  readOnly = false,
  onOpenCreateTask,
  onOpenEditTask,
  onDeleteTask,
  refreshTrigger,
}) => {
  const { activeProfile } = useProfile();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth());
  const [tasksForDate, setTasksForDate] = useState<DailyTaskView[]>([]);
  const [monthStatus, setMonthStatus] = useState<Record<string, MonthDayTaskStatus>>({});
  const [activeTasks, setActiveTasks] = useState<FarmTask[]>([]);
  const [loading, setLoading] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const loadTasks = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await fetchTasksForDate(date, workerId || activeProfile?.id);
      setTasksForDate(data);
    } catch (err) {
      console.error('Failed to load tasks for date:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId, activeProfile?.id]);

  const loadMonthStatus = useCallback(async (year: number, month: number) => {
    try {
      const [statusData, allTasksData] = await Promise.all([
        fetchMonthTaskStatus(year, month, workerId || activeProfile?.id),
        fetchAllTasks(),
      ]);
      setMonthStatus(statusData);
      setActiveTasks(allTasksData);
    } catch (err) {
      console.error('Failed to load month task status:', err);
    }
  }, [workerId, activeProfile?.id]);

  useEffect(() => {
    loadTasks(selectedDate);
  }, [selectedDate, loadTasks, refreshTrigger]);

  useEffect(() => {
    loadMonthStatus(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadMonthStatus, refreshTrigger]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Quick days shortcuts (Hari Ini, Besok, Lusa)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Monday-first offset (0 = Monday, ..., 6 = Sunday)
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const handleToggle = async (task: DailyTaskView) => {
    if (readOnly) return;
    if (task.task_type === 'daily_record' && onOpenQuickInput) {
      onOpenQuickInput();
      return;
    }
    await toggleTaskCompletion(task.task_id, selectedDate, activeProfile?.id);
    await loadTasks(selectedDate);
    await loadMonthStatus(currentYear, currentMonth);
  };

  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return `${days[d.getDay()]}, ${parts[2]} ${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const completedCount = tasksForDate.filter((t) => t.is_completed).length;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3.5 shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Kalender Tugas & Agenda
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
              Jadwal tugas harian & agenda mendatang
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoToday}
            className="px-2 py-1 text-[10px] font-black text-[#00684a] hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-all mr-1"
          >
            Hari Ini
          </button>
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan Sebelumnya"
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-800 px-1 min-w-[105px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            aria-label="Bulan Berikutnya"
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Task Color Legend */}
      <div className="flex items-center gap-2.5 px-2 py-2 flex-wrap text-[10px] font-bold text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">Indikator:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>Belum / Terlewat</span>
        </div>
        {activeTasks.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: t.color || '#10b981' }}
            />
            <span className="truncate max-w-[130px] font-bold text-slate-700">{t.title}</span>
          </div>
        ))}
      </div>

      {/* Quick Day Shortcuts */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { label: 'Hari Ini', date: todayStr },
          { label: 'Besok', date: tomorrow },
          { label: 'Lusa', date: dayAfterTomorrow },
        ].map((chip) => (
          <button
            key={chip.date}
            type="button"
            onClick={() => setSelectedDate(chip.date)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 ${
              selectedDate === chip.date
                ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs scale-[1.02]'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Calendar Table Grid */}
      <div>
        {/* Day Name Headers (Sen - Min) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName) => (
            <div key={dayName} className="text-[10px] font-black text-slate-400 uppercase py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-11 rounded-xl bg-slate-50/50" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
              dayNum
            ).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const status = monthStatus[dateStr];

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`h-11 rounded-xl p-1 flex flex-col items-center justify-between border transition-all relative ${
                  isSelected
                    ? 'border-[#00684a] bg-emerald-50/70 shadow-sm ring-2 ring-[#00684a]/20 scale-[1.03] z-10'
                    : isToday
                    ? 'border-emerald-300 bg-emerald-50/30 hover:bg-slate-50'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className={`text-[11px] font-black leading-tight ${
                      isSelected
                        ? 'text-[#00684a]'
                        : isToday
                        ? 'text-emerald-700 font-extrabold'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>

                {/* Status Indicator Dots Under Date Number */}
                <div className="flex items-center justify-center gap-0.5 mt-auto flex-wrap max-w-full px-0.5">
                  {status?.tasks && status.tasks.map((task) => {
                    const isDone = task.is_completed;
                    // Red if overdue/due today and not completed; custom color when done or future
                    const isOverdueOrDueToday = !isDone && dateStr <= todayStr;
                    const dotColor = isOverdueOrDueToday ? '#ef4444' : task.color || '#10b981';

                    return (
                      <span
                        key={task.task_id}
                        title={`${task.title}: ${isDone ? 'Selesai' : 'Belum Selesai'}`}
                        className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: dotColor }}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00684a]" />
            <span className="text-xs font-black text-slate-800">
              {formatIndoDate(selectedDate)}
            </span>
            {selectedDate === todayStr && (
              <span className="text-[9px] font-black bg-emerald-100 text-[#00684a] px-2 py-0.5 rounded-full border border-emerald-200">
                Hari Ini
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-black bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              {completedCount} / {tasksForDate.length} Selesai
            </span>
            {onOpenCreateTask && !readOnly && (
              <button
                type="button"
                onClick={() => onOpenCreateTask(selectedDate)}
                className="text-[10px] font-black bg-[#00684a] text-white hover:bg-emerald-800 px-2 py-1 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Tambah Tugas</span>
              </button>
            )}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {tasksForDate.map((task) => {
            const isEgg = task.task_type === 'daily_record';
            const matchedTask = activeTasks.find((t) => t.id === task.task_id);

            return (
              <div
                key={task.task_id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  task.is_completed
                    ? 'bg-white/60 border-slate-200 opacity-85'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToggle(task)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      task.is_completed
                        ? 'text-white'
                        : 'bg-white border-slate-300 hover:border-emerald-500'
                    }`}
                    style={{
                      backgroundColor: task.is_completed ? (task.color || '#00684a') : undefined,
                      borderColor: task.is_completed ? (task.color || '#00684a') : undefined,
                    }}
                  >
                    {task.is_completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: task.color || '#10b981' }}
                      />
                      <span
                        className={`text-xs font-black truncate ${
                          task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.coop_name ? (
                        <span className="text-[9px] font-black bg-emerald-50 text-[#00684a] px-1.5 py-0.5 rounded-md border border-emerald-200">
                          🏠 {task.coop_name}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                          🏠 Semua Kandang
                        </span>
                      )}
                    </div>

                    {/* Per-kandang completion breakdown for multi-coop transparency */}
                    {task.flocks_status && task.flocks_status.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {task.flocks_status.map((fs, idx) => (
                          <span
                            key={idx}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                              fs.is_done
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <span>{fs.coop_name}</span>
                            <span>{fs.is_done ? '✅ Selesai' : '⏳ Belum'}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {task.description && (
                      <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.due_time && (
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                        ⏰ Target: {task.due_time.substring(0, 5)} WIB
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Catat (Telur/Vaksin/Obat/Vitamin) / Edit / Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  {!task.is_completed && onOpenQuickInput && (
                    <>
                      {isEgg && (
                        <button
                          type="button"
                          onClick={() => onOpenQuickInput(task.flock_id || undefined, 'daily')}
                          className="px-2.5 py-1 rounded-xl bg-[#00684a] text-white text-[10px] font-black hover:bg-emerald-800 active:scale-95 shadow-xs flex items-center gap-1 mr-1"
                        >
                          <Egg className="w-3 h-3 fill-white/30" />
                          <span>Catat Telur</span>
                        </button>
                      )}
                      {task.task_type === 'vaccine' && (
                        <button
                          type="button"
                          onClick={() => onOpenQuickInput(task.flock_id || undefined, 'health', 'Vaksin')}
                          className="px-2.5 py-1 rounded-xl bg-purple-700 text-white text-[10px] font-black hover:bg-purple-800 active:scale-95 shadow-xs flex items-center gap-1 mr-1"
                        >
                          <Syringe className="w-3 h-3" />
                          <span>Catat Vaksin</span>
                        </button>
                      )}
                      {(task.task_type === 'medicine' || (task.task_type as any) === 'obat') && (
                        <button
                          type="button"
                          onClick={() => onOpenQuickInput(task.flock_id || undefined, 'health', 'Obat')}
                          className="px-2.5 py-1 rounded-xl bg-blue-700 text-white text-[10px] font-black hover:bg-blue-800 active:scale-95 shadow-xs flex items-center gap-1 mr-1"
                        >
                          <Pill className="w-3 h-3" />
                          <span>Catat Obat</span>
                        </button>
                      )}
                      {task.task_type === 'vitamin' && (
                        <button
                          type="button"
                          onClick={() => onOpenQuickInput(task.flock_id || undefined, 'health', 'Vitamin')}
                          className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-[10px] font-black hover:bg-amber-700 active:scale-95 shadow-xs flex items-center gap-1 mr-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Catat Vitamin</span>
                        </button>
                      )}
                    </>
                  )}

                  {!readOnly && onOpenEditTask && matchedTask && (
                    <button
                      type="button"
                      onClick={() => onOpenEditTask(matchedTask)}
                      title="Edit Tugas"
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!readOnly && onDeleteTask && matchedTask && (
                    <button
                      type="button"
                      onClick={() => onDeleteTask(matchedTask.id)}
                      title="Hapus Tugas"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {tasksForDate.length === 0 && !loading && (
            <div className="text-center py-6 bg-white border border-slate-200/60 rounded-xl text-slate-400 text-xs font-semibold space-y-2">
              <p>Tidak ada tugas yang dijadwalkan pada tanggal ini.</p>
              {onOpenCreateTask && !readOnly && (
                <button
                  type="button"
                  onClick={() => onOpenCreateTask(selectedDate)}
                  className="px-3 py-1.5 bg-emerald-50 text-[#00684a] border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
                >
                  + Buat Tugas di Tanggal Ini
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
