'use client';

import React, { useState, useEffect } from 'react';
import { DailyTaskView } from '@/types/database';
import { fetchTasksForDate, toggleTaskCompletion } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Egg,
  Check,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

interface TaskCalendarCardProps {
  onOpenQuickInput?: () => void;
  workerId?: string;
  readOnly?: boolean;
}

export const TaskCalendarCard: React.FC<TaskCalendarCardProps> = ({
  onOpenQuickInput,
  workerId,
  readOnly = false,
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
  const [loading, setLoading] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const loadTasks = async (date: string) => {
    setLoading(true);
    try {
      const data = await fetchTasksForDate(date, workerId || activeProfile?.id);
      setTasksForDate(data);
    } catch (err) {
      console.error('Failed to load tasks for date:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks(selectedDate);
  }, [selectedDate, workerId, activeProfile?.id]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Quick days shortcuts (Hari Ini, Besok, Lusa)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      d
    ).padStart(2, '0')}`;
    daysArray.push(formatted);
  }

  const handleToggle = async (task: DailyTaskView) => {
    if (readOnly) return;
    if (task.task_type === 'daily_record' && onOpenQuickInput) {
      onOpenQuickInput();
      return;
    }
    await toggleTaskCompletion(task.task_id, selectedDate, activeProfile?.id);
    await loadTasks(selectedDate);
  };

  const completedCount = tasksForDate.filter((t) => t.is_completed).length;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Kalender Tugas & Agenda
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              Lihat dan selesaikan tugas harian, besok, & jadwal mendatang
            </p>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-2xl">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-800 min-w-[110px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Day Shortcut Chips */}
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
        <span className="text-[11px] font-bold text-slate-400 ml-auto hidden sm:block">
          Tanggal terpilih: <strong className="text-slate-700">{selectedDate}</strong>
        </span>
      </div>

      {/* Mini Month Grid */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
            <span key={d} className="text-[10px] font-black text-slate-400 uppercase">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysArray.map((dateStr, idx) => {
            if (!dateStr) return <div key={`empty-${idx}`} className="h-8" />;

            const dayNum = parseInt(dateStr.split('-')[2]);
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`h-8 rounded-xl font-black text-xs transition-all relative flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#00684a] text-white shadow-xs font-black'
                    : isToday
                    ? 'bg-emerald-100 text-[#00684a] border border-emerald-300'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <span>{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks List for Selected Date */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#00684a]" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Tugas Tanggal {selectedDate}
            </h4>
          </div>
          <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
            {completedCount} / {tasksForDate.length} Selesai
          </span>
        </div>

        <div className="space-y-2">
          {tasksForDate.map((task) => {
            const isEgg = task.task_type === 'daily_record';

            return (
              <div
                key={task.task_id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  task.is_completed
                    ? 'bg-slate-50 border-slate-200 opacity-80'
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
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 hover:border-emerald-500'
                    }`}
                  >
                    {task.is_completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-black truncate ${
                          task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.coop_name && (
                        <span className="text-[9px] font-black bg-emerald-50 text-[#00684a] px-1.5 py-0.5 rounded-md border border-emerald-200">
                          {task.coop_name}
                        </span>
                      )}
                    </div>
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

                {isEgg && !task.is_completed && onOpenQuickInput && (
                  <button
                    type="button"
                    onClick={onOpenQuickInput}
                    className="px-2.5 py-1 rounded-xl bg-[#00684a] text-white text-[10px] font-black shrink-0 hover:bg-emerald-800 active:scale-95 shadow-xs flex items-center gap-1"
                  >
                    <Egg className="w-3 h-3 fill-white/30" />
                    <span>Catat</span>
                  </button>
                )}
              </div>
            );
          })}

          {tasksForDate.length === 0 && !loading && (
            <div className="text-center py-6 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-400 text-xs font-semibold">
              Tidak ada tugas yang dijadwalkan pada tanggal ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
