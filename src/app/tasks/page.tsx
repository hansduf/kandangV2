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
} from 'lucide-react';

export default function TasksPage() {
  const { isOwner, activeProfile, refreshProfiles, updateProfileName } = useProfile();
  const [activeTab, setActiveTab] = useState<'tasks' | 'workers'>('tasks');
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
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [dueTime, setDueTime] = useState('16:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Worker Form State
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerColor, setWorkerColor] = useState('#2563eb');

  // Change Owner PIN State
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

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

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskType('custom');
    setTaskFlockId('');
    setTaskAssignedTo('');
    setRecurrenceType('daily');
    setRecurrenceInterval(3);
    setSelectedDays([1, 3, 5]);
    setDueTime('16:00');
    setStartDate(new Date().toISOString().split('T')[0]);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: FarmTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskType(task.task_type || 'custom');
    setTaskFlockId(task.flock_id || '');
    setTaskAssignedTo(task.assigned_to || '');
    setRecurrenceType(task.recurrence_type || 'daily');
    setRecurrenceInterval(task.recurrence_interval || 1);
    setSelectedDays(task.days_of_week && task.days_of_week.length > 0 ? task.days_of_week : [1, 3, 5]);
    setDueTime(task.due_time || '16:00');
    setStartDate(task.start_date || new Date().toISOString().split('T')[0]);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      await updateFarmTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        task_type: taskType,
        flock_id: taskFlockId || null,
        assigned_to: taskAssignedTo || null,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceType === 'interval' ? Number(recurrenceInterval) || 1 : 1,
        days_of_week: recurrenceType === 'days_of_week' ? selectedDays : [],
        due_time: dueTime || '16:00',
        start_date: startDate,
      });
    } else {
      await createFarmTask({
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        task_type: taskType,
        flock_id: taskFlockId || null,
        assigned_to: taskAssignedTo || null,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceType === 'interval' ? Number(recurrenceInterval) || 1 : 1,
        days_of_week: recurrenceType === 'days_of_week' ? selectedDays : [],
        due_time: dueTime || '16:00',
        start_date: startDate,
      });
    }

    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setIsTaskModalOpen(false);
    await loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Hapus tugas ini?')) {
      await deleteTask(id);
      await loadData();
    }
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
                onClick={handleOpenCreateTask}
                className="bg-[#00684a] hover:bg-emerald-800 active:scale-95 text-white font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Tugas Baru</span>
              </button>
            </div>

            {/* List of Recurring Tasks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map((t) => {
                const flock = flocks.find((f) => f.id === t.flock_id);
                const assigned = workers.find((w) => w.id === t.assigned_to);

                return (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-2 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900">{t.title}</span>
                        <span className="text-[9.5px] font-extrabold bg-emerald-50 text-[#00684a] px-2 py-0.5 rounded-full border border-emerald-200">
                          {t.recurrence_type === 'daily'
                            ? 'Setiap Hari'
                            : t.recurrence_type === 'interval'
                            ? `Tiap ${t.recurrence_interval} Hari`
                            : t.recurrence_type === 'days_of_week'
                            ? 'Hari Pilihan'
                            : 'Sekali Saja'}
                        </span>
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">
                          {t.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-bold text-slate-500">
                        {flock && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                            🏠 {flock.coop_name}
                          </span>
                        )}
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          👤 {assigned ? assigned.name : 'Semua Pengguna'}
                        </span>
                        {t.due_time && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                            ⏰ {t.due_time.substring(0, 5)} WIB
                          </span>
                        )}
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
              onOpenQuickInput={() => setIsQuickInputOpen(true)}
              readOnly={false}
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
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Kandang
                  </label>
                  <select
                    value={taskFlockId}
                    onChange={(e) => setTaskFlockId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  >
                    <option value="">Semua Kandang</option>
                    {flocks.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.coop_name} ({f.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Ditugaskan Ke
                  </label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#00684a]"
                  >
                    <option value="">Semua Pengguna</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
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
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
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
        activeFlockId={flocks[0]?.id}
        onSelectFlock={() => {}}
        onSaveDaily={async (rec) => {
          await saveDailyRecord(rec);
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
