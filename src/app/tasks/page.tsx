'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { TaskCalendarCard } from '@/components/TaskCalendarCard';
import { QuickInputModal } from '@/components/QuickInputModal';
import { FlockModal } from '@/components/FlockModal';
import { useProfile } from '@/context/ProfileContext';
import { Flock, FarmTask, AppProfile, TaskType, RecurrenceType } from '@/types/database';
import {
  fetchFlocks,
  fetchAllTasks,
  createFarmTask,
  updateFarmTask,
  deleteTask,
  fetchProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  updateOwnerPin,
  createFlock,
  saveDailyRecord,
  saveHealthRecord,
  checkAndSyncDailyEggTasks,
  TASK_COLOR_PALETTE,
} from '@/lib/supabase';
import {
  CheckSquare,
  Users,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Lock,
  Bell,
  CheckCircle2,
  Shield,
  Layers,
  Save,
  X,
  Pencil,
  Check,
} from 'lucide-react';

export default function TasksPage() {
  const { activeProfile, refreshProfiles, updateProfileName } = useProfile();
  const [activeTab, setActiveTab] = useState<'tasks' | 'workers'>('tasks');

  // Data State
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [workers, setWorkers] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FarmTask | null>(null);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [isFlockModalOpen, setIsFlockModalOpen] = useState(false);

  // Edit Username Modal State
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AppProfile | null>(null);
  const [editNameInput, setEditNameInput] = useState('');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('custom');
  const [taskFlockId, setTaskFlockId] = useState<string>('');
  const [taskFlockIds, setTaskFlockIds] = useState<string[]>([]);
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>('');
  const [taskAssignedToIds, setTaskAssignedToIds] = useState<string[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [dueTime, setDueTime] = useState('16:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [taskColor, setTaskColor] = useState<string>('#06b6d4');

  // Worker Form State
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerColor, setWorkerColor] = useState('#2563eb');

  // Change Owner PIN State
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Quick Input State for specific tasks
  const [quickInputFlockId, setQuickInputFlockId] = useState<string>('');
  const [quickInputTab, setQuickInputTab] = useState<'daily' | 'health' | 'mortality'>('daily');
  const [quickInputHealthCategory, setQuickInputHealthCategory] = useState<'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan'>('Vaksin');

  const handleOpenQuickInputForTask = (
    flockId?: string,
    tab: 'daily' | 'health' | 'mortality' = 'daily',
    healthCategory: 'Vaksin' | 'Obat' | 'Vitamin' | 'Desinfektan' = 'Vaksin'
  ) => {
    setQuickInputFlockId(flockId || (flocks[0]?.id || ''));
    setQuickInputTab(tab);
    setQuickInputHealthCategory(healthCategory);
    setIsQuickInputOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [flockList, taskList, profileList] = await Promise.all([
        fetchFlocks(),
        fetchAllTasks(),
        fetchProfiles(),
      ]);
      setFlocks(flockList);
      setTasks(taskList);
      setWorkers(profileList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateTask = (defaultDate?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskType('daily_record');
    setTaskFlockId('');
    setTaskFlockIds([]);
    setTaskAssignedTo('');
    setTaskAssignedToIds([]);
    setRecurrenceType('daily');
    setRecurrenceInterval(3);
    setSelectedDays([1, 3, 5]);
    setDueTime('16:00');
    setStartDate(defaultDate || new Date().toISOString().split('T')[0]);
    setEndDate('');

    // Pick first unused color from palette
    const usedColors = new Set(tasks.map((t) => (t.color || '').toLowerCase()));
    const available = TASK_COLOR_PALETTE.find((p) => !usedColors.has(p.hex.toLowerCase()));
    setTaskColor(available ? available.hex : TASK_COLOR_PALETTE[0].hex);

    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: FarmTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskType(task.task_type || 'custom');
    setTaskFlockId(task.flock_id || '');
    setTaskFlockIds(task.flock_ids || (task.flock_id ? [task.flock_id] : []));
    setTaskAssignedTo(task.assigned_to || '');
    setTaskAssignedToIds(task.assigned_to_ids || (task.assigned_to ? [task.assigned_to] : []));
    setRecurrenceType(task.recurrence_type || 'daily');
    setRecurrenceInterval(task.recurrence_interval || 1);
    setSelectedDays(task.days_of_week && task.days_of_week.length > 0 ? task.days_of_week : [1, 3, 5]);
    setDueTime(task.due_time || '16:00');
    setStartDate(task.start_date || new Date().toISOString().split('T')[0]);
    setEndDate(task.end_date || '');
    setTaskColor(task.color || '#06b6d4');
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const primaryFlockId = taskFlockIds.length === 1 ? taskFlockIds[0] : null;
    const primaryAssignedTo = taskAssignedToIds.length === 1 ? taskAssignedToIds[0] : null;

    const taskPayload = {
      title: taskTitle.trim(),
      description: taskDesc.trim() || null,
      task_type: taskType,
      flock_id: primaryFlockId,
      flock_ids: taskFlockIds.length > 0 ? taskFlockIds : null,
      assigned_to: primaryAssignedTo,
      assigned_to_ids: taskAssignedToIds.length > 0 ? taskAssignedToIds : null,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceType === 'interval' ? Number(recurrenceInterval) || 1 : 1,
      days_of_week: recurrenceType === 'days_of_week' ? selectedDays : [],
      due_time: dueTime || '16:00',
      start_date: startDate,
      end_date: endDate.trim() || null,
      color: taskColor,
    };

    if (editingTask) {
      await updateFarmTask(editingTask.id, taskPayload);
    } else {
      await createFarmTask(taskPayload);
    }

    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setIsTaskModalOpen(false);
    await loadData();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDeleteTask = async (id: string, asOfDate?: string) => {
    const cutoff = asOfDate || todayStr;
    const taskToDelete = tasks.find((t) => t.id === id);

    if (taskToDelete && taskToDelete.start_date <= cutoff && taskToDelete.recurrence_type !== 'once') {
      const ok = confirm(
        `Cabut tugas "${taskToDelete.title}"?\n\n` +
        `Tugas ini berjalan mulai ${taskToDelete.start_date}.\n` +
        `Riwayat pada tanggal lampau s/d tanggal ${cutoff} TETAP TERSIMPAN di kalender, ` +
        `sedangkan jadwal hari esok ke depan akan dihentikan.`
      );
      if (!ok) return;
    } else {
      const ok = confirm(`Hapus tugas "${taskToDelete?.title || 'ini'}"? Tugas ini akan dihapus dari daftar.`);
      if (!ok) return;
    }

    await deleteTask(id, cutoff);
    await loadData();
  };

  const handleOpenEditName = (profile: AppProfile) => {
    setEditingProfile(profile);
    setEditNameInput(profile.name);
    setIsEditNameModalOpen(true);
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editNameInput.trim()) return;

    await updateProfileName(editingProfile.id, editNameInput.trim());
    setIsEditNameModalOpen(false);
    setEditingProfile(null);
    await loadData();
    await refreshProfiles();
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    await createProfile({
      name: workerName.trim(),
      role: 'worker',
      phone: workerPhone.trim() || null,
      avatar_color: workerColor,
    });

    setWorkerName('');
    setWorkerPhone('');
    setIsWorkerModalOpen(false);
    await loadData();
    await refreshProfiles();
  };

  const handleDeleteWorker = async (id: string) => {
    if (confirm('Hapus akun ini?')) {
      await deleteProfile(id);
      await loadData();
      await refreshProfiles();
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      alert('PIN harus terdiri dari 4 digit angka.');
      return;
    }

    const ownerProfile = workers.find((w) => w.role === 'owner');
    if (ownerProfile) {
      await updateOwnerPin(ownerProfile.id, newPin);
      setPinSuccess('✅ PIN Keamanan berhasil diperbarui!');
      setNewPin('');
      setTimeout(() => setPinSuccess(''), 3000);
      await refreshProfiles();
    }
  };

  const handleDayToggle = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <Navbar onOpenNewFlockModal={() => setIsFlockModalOpen(true)} />

      <main className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-3 py-3.5 sm:px-4 sm:py-4 space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Manajemen Tugas & Akun Pengguna
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Buat tugas berulang (alarm), checklist harian & kelola akun pengguna
              </p>
            </div>
          </div>

          {/* Tab Pill Buttons */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-auto">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Tugas & Alarm</span>
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'workers'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Daftar Pengguna & PIN</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TUGAS & ALARM */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-3.5 flex items-center justify-between gap-2 shadow-sm">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Daftar Tugas Berulang (Alarm Kandang)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  Tugas otomatis muncul pada floating edge & kalender pengguna
                </p>
              </div>

              <button
                onClick={() => handleOpenCreateTask()}
                className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Tugas Baru</span>
              </button>
            </div>

            {/* List of Recurring Tasks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map((t) => {
                const coopLabel = t.flock_ids && t.flock_ids.length > 0
                  ? t.flock_ids.map((fid) => flocks.find((f) => f.id === fid)?.coop_name).filter(Boolean).join(', ')
                  : t.flock_id
                  ? flocks.find((f) => f.id === t.flock_id)?.coop_name || 'Kandang'
                  : 'Semua Kandang';

                const workerLabel = t.assigned_to_ids && t.assigned_to_ids.length > 0
                  ? t.assigned_to_ids.map((wid) => workers.find((w) => w.id === wid)?.name).filter(Boolean).join(', ')
                  : t.assigned_to
                  ? workers.find((w) => w.id === t.assigned_to)?.name || 'Pengguna'
                  : 'Semua Pengguna';

                return (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-2 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: t.color || '#10b981' }}
                          />
                          <span className="text-xs font-black text-slate-900 truncate">{t.title}</span>
                        </div>
                        {Boolean(t.end_date && t.end_date < todayStr) ? (
                          <span className="text-[9.5px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300 shrink-0">
                            🛑 Selesai / Dicabut
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-extrabold bg-emerald-50 text-[#00684a] px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            {t.recurrence_type === 'daily'
                              ? 'Setiap Hari'
                              : t.recurrence_type === 'interval'
                              ? `Tiap ${t.recurrence_interval} Hari`
                              : t.recurrence_type === 'days_of_week'
                              ? 'Hari Pilihan'
                              : 'Sekali Saja'}
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">
                          {t.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-bold text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          🏠 {coopLabel}
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          👤 {workerLabel}
                        </span>
                        {t.due_time && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                            ⏰ {t.due_time.substring(0, 5)} WIB
                          </span>
                        )}
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                          {t.end_date ? `📅 ${t.start_date} s/d ${t.end_date}` : `📅 Mulai ${t.start_date}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditTask(t)}
                        className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-xl hover:bg-emerald-50 transition-colors"
                        title="Edit tugas"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
                        title="Hapus tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && !loading && (
                <div className="col-span-full text-center py-8 bg-white border border-slate-200 rounded-3xl text-slate-400 text-xs font-semibold">
                  Belum ada tugas yang dibuat. Klik "Buat Tugas Baru" untuk menambahkan.
                </div>
              )}
            </div>

            {/* Task Calendar Monitoring Card */}
            <TaskCalendarCard
              onOpenQuickInput={handleOpenQuickInputForTask}
              readOnly={false}
              onOpenCreateTask={handleOpenCreateTask}
              onOpenEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              refreshTrigger={tasks}
            />
          </div>
        )}

        {/* TAB 2: AKUN PENGGUNA & PIN */}
        {activeTab === 'workers' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Change Owner PIN Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Ubah PIN Keamanan
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    PIN 4-digit digunakan untuk melindungi menu pengaturan dan tugas
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePin} className="flex items-center gap-2 pt-1 max-w-sm">
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN Baru (4 Angka)"
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black tracking-widest text-slate-900 outline-none focus:border-[#00684a] w-36 text-center"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs shadow-xs transition-all flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Simpan PIN</span>
                </button>
              </form>

              {pinSuccess && (
                <p className="text-xs font-black text-emerald-700">{pinSuccess}</p>
              )}
            </div>

            {/* Users List Management */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Daftar Akun Pengguna
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Kelola nama pengguna akun yang bertugas mencatat dan mengerjakan tugas
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsWorkerModalOpen(true)}
                  className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>

              {/* Users Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {workers.map((w) => {
                  const isOwnerAcc = w.role === 'owner';

                  return (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xs uppercase"
                          style={{ backgroundColor: w.avatar_color || '#00684a' }}
                        >
                          {w.name ? w.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {w.name}
                          </span>
                          {w.phone && (
                            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                              📞 {w.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditName(w)}
                          className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-xl hover:bg-emerald-50 transition-colors"
                          title="Ubah nama pengguna"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isOwnerAcc && (
                          <button
                            onClick={() => handleDeleteWorker(w.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
                            title="Hapus akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingTask ? 'Edit Tugas & Alarm' : 'Buat Tugas Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Kategori Tugas
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'daily_record' as const, label: 'Produksi Telur', icon: '🥚', defaultColor: '#10b981' },
                    { id: 'vaccine' as const, label: 'Vaksinasi', icon: '💉', defaultColor: '#8b5cf6' },
                    { id: 'medicine' as const, label: 'Obat', icon: '💊', defaultColor: '#3b82f6' },
                    { id: 'vitamin' as const, label: 'Vitamin', icon: '✨', defaultColor: '#f59e0b' },
                    { id: 'cleaning' as const, label: 'Kebersihan', icon: '🧹', defaultColor: '#14b8a6' },
                    { id: 'custom' as const, label: 'Lainnya', icon: '📋', defaultColor: '#06b6d4' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setTaskType(cat.id);
                        if (!editingTask) {
                          setTaskColor(cat.defaultColor);
                          if (!taskTitle || ['Catat Produksi Telur & Pakan', 'Vaksinasi Ayam', 'Pemberian Obat', 'Pemberian Vitamin', 'Pembersihan & Semprot Kandang', 'Tugas Baru'].includes(taskTitle)) {
                            if (cat.id === 'daily_record') setTaskTitle('Catat Produksi Telur & Pakan');
                            else if (cat.id === 'vaccine') setTaskTitle('Vaksinasi Ayam');
                            else if (cat.id === 'medicine') setTaskTitle('Pemberian Obat');
                            else if (cat.id === 'vitamin') setTaskTitle('Pemberian Vitamin');
                            else if (cat.id === 'cleaning') setTaskTitle('Pembersihan & Semprot Kandang');
                            else setTaskTitle('Tugas Baru');
                          }
                        }
                      }}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        taskType === cat.id
                          ? 'bg-emerald-50 border-[#00684a] text-[#00684a] font-black shadow-xs ring-1 ring-[#00684a]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-semibold hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-[10px] leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nama Tugas
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Semprot Disinfektan & Vitamin"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Keterangan / SOP
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Petunjuk pengerjaan..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                />
              </div>


              {/* Multi-Flock Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Pilih Kandang {taskFlockIds.length > 0 ? `(${taskFlockIds.length} dipilih)` : '(Semua Kandang)'}
                  </label>
                  {taskFlockIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTaskFlockIds([])}
                      className="text-[10px] font-bold text-[#00684a] hover:underline"
                    >
                      Pilih Semua
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTaskFlockIds([])}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      taskFlockIds.length === 0
                        ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semua Kandang
                  </button>
                  {flocks.map((f) => {
                    const isSelected = taskFlockIds.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTaskFlockIds(taskFlockIds.filter((id) => id !== f.id));
                          } else {
                            setTaskFlockIds([...taskFlockIds, f.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{f.coop_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Worker Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                    Ditugaskan Ke {taskAssignedToIds.length > 0 ? `(${taskAssignedToIds.length} dipilih)` : '(Semua Pengguna)'}
                  </label>
                  {taskAssignedToIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTaskAssignedToIds([])}
                      className="text-[10px] font-bold text-[#00684a] hover:underline"
                    >
                      Pilih Semua
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTaskAssignedToIds([])}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      taskAssignedToIds.length === 0
                        ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semua Pengguna
                  </button>
                  {workers.map((w) => {
                    const isSelected = taskAssignedToIds.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTaskAssignedToIds(taskAssignedToIds.filter((id) => id !== w.id));
                          } else {
                            setTaskAssignedToIds([...taskAssignedToIds, w.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recurrence Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Pengulangan Jadwal (Alarm)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'daily' as const, label: 'Setiap Hari' },
                    { id: 'interval' as const, label: 'Interval (Tiap N Hari)' },
                    { id: 'days_of_week' as const, label: 'Hari Tertentu' },
                    { id: 'once' as const, label: 'Sekali Saja' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRecurrenceType(r.id)}
                      className={`p-2 rounded-xl text-[10px] font-black border transition-all ${
                        recurrenceType === r.id
                          ? 'bg-[#00684a] text-white border-[#00684a] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Interval */}
              {recurrenceType === 'interval' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between text-xs font-bold">
                  <span>Ulangi setiap:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Number(e.target.value) || 1)}
                      className="w-14 text-center bg-white border border-slate-300 rounded-lg py-1 text-xs font-black text-slate-900"
                    />
                    <span className="text-slate-500 font-bold">hari</span>
                  </div>
                </div>
              )}

              {/* If Days of Week */}
              {recurrenceType === 'days_of_week' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Pilih Hari:</span>
                  <div className="flex gap-1 justify-between">
                    {[
                      { d: 1, l: 'Sen' },
                      { d: 2, l: 'Sel' },
                      { d: 3, l: 'Rab' },
                      { d: 4, l: 'Kam' },
                      { d: 5, l: 'Jum' },
                      { d: 6, l: 'Sab' },
                      { d: 0, l: 'Min' },
                    ].map((day) => {
                      const isSel = selectedDays.includes(day.d);
                      return (
                        <button
                          key={day.d}
                          type="button"
                          onClick={() => handleDayToggle(day.d)}
                          className={`w-9 h-8 rounded-xl text-xs font-black border transition-all ${
                            isSel
                              ? 'bg-[#00684a] text-white border-[#00684a]'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {day.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Mulai Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Sampai Tanggal (Opsional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Target Jam (Due)
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  required
                />
              </div>

              {/* Task Color Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Warna Indikator Kalender
                </label>
                <div className="grid grid-cols-5 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {TASK_COLOR_PALETTE.map((pal) => {
                    const isSelected = taskColor.toLowerCase() === pal.hex.toLowerCase();

                    return (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => setTaskColor(pal.hex)}
                        title={pal.label}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all relative ${
                          isSelected
                            ? 'ring-2 ring-slate-900 scale-105 shadow-sm'
                            : 'hover:scale-105 border border-transparent'
                        }`}
                        style={{ backgroundColor: pal.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[9.5px] text-slate-400 font-semibold mt-1 block">
                  *Warna bintik indikator di kalender. Boleh memilih warna yang sama atau berbeda untuk setiap tugas.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-3 rounded-2xl shadow-md text-xs transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Save className="w-4 h-4 stroke-[3]" />
                <span>{editingTask ? 'SIMPAN PERUBAHAN TUGAS' : 'SIMPAN TUGAS'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USERNAME MODAL */}
      {isEditNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Ubah Nama Pengguna</h3>
              </div>
              <button
                onClick={() => setIsEditNameModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileName} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nama Pengguna Baru
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="Masukkan nama pengguna..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-3 rounded-2xl shadow-md text-xs transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Save className="w-4 h-4 stroke-[3]" />
                <span>SIMPAN NAMA BARU</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] flex items-center justify-center border border-emerald-200">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Tambah Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setIsWorkerModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nama Pengguna
                </label>
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="e.g. Pak Budi / Mas Dani"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  No. WhatsApp / HP (Opsional)
                </label>
                <input
                  type="tel"
                  value={workerPhone}
                  onChange={(e) => setWorkerPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Warna Avatar
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {['#00684a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWorkerColor(color)}
                      className={`w-8 h-8 rounded-xl transition-transform ${
                        workerColor === color ? 'ring-2 ring-slate-900 scale-110' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black py-3 rounded-2xl shadow-md text-xs transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Save className="w-4 h-4 stroke-[3]" />
                <span>DAFTARKAN PENGGUNA</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav onOpenQuickInput={() => setIsQuickInputOpen(true)} />

      <QuickInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        flocks={flocks}
        activeFlockId={quickInputFlockId || (flocks[0]?.id || '')}
        onSelectFlock={setQuickInputFlockId}
        initialTab={quickInputTab}
        initialHealthCategory={quickInputHealthCategory}
        onSaveDaily={async (rec) => {
          await saveDailyRecord(rec);
          await checkAndSyncDailyEggTasks(rec.record_date, rec.flock_id, activeProfile?.id);
          await loadData();
        }}
        onSaveHealth={async (rec) => {
          await saveHealthRecord(rec);
          await loadData();
        }}
      />

      <FlockModal
        isOpen={isFlockModalOpen}
        onClose={() => setIsFlockModalOpen(false)}
        onCreateFlock={async (f) => {
          const res = await createFlock(f);
          await loadData();
          return res;
        }}
      />
    </div>
  );
}
