'use client';

import React, { useState } from 'react';
import { DailyRecord, HealthRecord } from '@/types/database';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Egg,
  Skull,
  Syringe,
  Pill,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  TrendingUp,
  Wheat,
  Info
} from 'lucide-react';

interface DailyCalendarCardProps {
  flockName?: string;
  dailyRecords: DailyRecord[];
  healthRecords: HealthRecord[];
  onOpenQuickInput?: () => void;
}

export const DailyCalendarCard: React.FC<DailyCalendarCardProps> = ({
  flockName = 'Kandang',
  dailyRecords = [],
  healthRecords = [],
  onOpenQuickInput,
}) => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth()); // 0-11

  // Format today's string 'YYYY-MM-DD'
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Selected date defaults to today, or the first record found
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

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

  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Day offset for starting Monday (0 = Monday, ..., 6 = Sunday)
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  // Map data for fast lookup by date 'YYYY-MM-DD'
  const dailyMap = React.useMemo(() => {
    const map = new Map<string, DailyRecord>();
    for (const r of dailyRecords) {
      map.set(r.record_date, r);
    }
    return map;
  }, [dailyRecords]);

  const healthMap = React.useMemo(() => {
    const map = new Map<string, HealthRecord[]>();
    for (const h of healthRecords) {
      const list = map.get(h.record_date) || [];
      list.push(h);
      map.set(h.record_date, list);
    }
    return map;
  }, [healthRecords]);

  // Selected date data
  const selectedDaily = dailyMap.get(selectedDate);
  const selectedHealth = healthMap.get(selectedDate) || [];

  // Format selected date nicely
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

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Vaksin':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: Syringe };
      case 'Obat':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: Pill };
      case 'Vitamin':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: Sparkles };
      case 'Desinfektan':
        return { bg: 'bg-teal-100 text-teal-800 border-teal-300', icon: ShieldCheck };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-300', icon: Syringe };
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3.5 shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Kalender Harian {flockName}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
              Produksi Telur, Mortalitas & Jadwal Vaksin/Obat
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

      {/* Legend Indicators */}
      <div className="flex items-center justify-between gap-2 px-1 flex-wrap text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[9px]">Indikator:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Produksi</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Kematian</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Vaksin / Obat</span>
        </div>
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
            <div key={`empty-${idx}`} className="h-10 rounded-xl bg-slate-50/50" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayDaily = dailyMap.get(dateStr);
            const dayHealth = healthMap.get(dateStr) || [];

            const hasEggs = dayDaily && dayDaily.egg_good_pcs > 0;
            const hasDeath = dayDaily && dayDaily.mortality_pcs > 0;
            const hasHealth = dayHealth.length > 0;

            return (
              <button
                key={dateStr}
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

                {/* Status Indicator Dots */}
                <div className="flex items-center justify-center gap-0.5 mt-auto">
                  {hasEggs && (
                    <span
                      title={`${dayDaily?.egg_good_pcs} butir`}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                  )}
                  {hasDeath && (
                    <span
                      title={`${dayDaily?.mortality_pcs} ekor mati`}
                      className="w-1.5 h-1.5 rounded-full bg-rose-500"
                    />
                  )}
                  {hasHealth && (
                    <span
                      title={`${dayHealth.length} catatan kesehatan`}
                      className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED DATE DETAIL CARD */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-800">
              {formatIndoDate(selectedDate)}
            </span>
            {selectedDate === todayStr && (
              <span className="text-[9px] font-black bg-emerald-100 text-[#00684a] px-2 py-0.5 rounded-full border border-emerald-200">
                Hari Ini
              </span>
            )}
          </div>
          {onOpenQuickInput && (
            <button
              onClick={onOpenQuickInput}
              className="text-[10px] font-black text-[#00684a] hover:text-emerald-800 flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tambah Data</span>
            </button>
          )}
        </div>

        {/* 1. PRODUKSI & PERFORMA TELUR */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Egg className="w-3.5 h-3.5 text-amber-500" />
              <span>Produksi Telur & Performa</span>
            </span>
            {selectedDaily ? (
              <span className="text-[10px] font-black bg-emerald-50 text-[#00684a] px-2 py-0.5 rounded-md border border-emerald-200">
                {selectedDaily.hdp_percent !== undefined && selectedDaily.hdp_percent !== null
                  ? selectedDaily.hdp_percent
                  : (selectedDaily.hd_percent || 0)}% HDP
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400">Belum dicatat</span>
            )}
          </div>

          {selectedDaily ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Telur Utuh</span>
                  <span className="text-xs font-black text-slate-900">
                    {selectedDaily.egg_good_pcs.toLocaleString('id-ID')} btr
                  </span>
                  <span className="block text-[9px] font-semibold text-emerald-700">
                    {selectedDaily.egg_good_kg} kg
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Telur Retak</span>
                  <span className="text-xs font-black text-amber-700">
                    {selectedDaily.egg_bad_pcs} btr
                  </span>
                  <span className="block text-[9px] font-semibold text-slate-500">
                    {selectedDaily.egg_bad_kg} kg
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">HHP %</span>
                  <span className="text-xs font-black text-amber-600">
                    {selectedDaily.hhp_percent || 0}%
                  </span>
                  <span className="block text-[9px] font-semibold text-slate-400">Pop. Awal</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Mati & Afkir</span>
                  <span className="text-xs font-black text-rose-600">
                    {selectedDaily.mortality_pcs} mati
                  </span>
                  <span className="block text-[9px] font-semibold text-slate-500">
                    {selectedDaily.culling_pcs} afkir
                  </span>
                </div>
              </div>

              {/* Multi-Coop Breakdown (if available) */}
              {(selectedDaily as any).coops && (selectedDaily as any).coops.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Kontribusi Per-Kandang Hari Ini:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(selectedDaily as any).coops.map((c: any) => (
                      <div
                        key={c.coop_name}
                        className="bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl flex items-center justify-between text-[11px]"
                      >
                        <div className="font-black text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00684a]" />
                          <span>{c.coop_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">({c.flock_name})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#00684a]">{c.egg_good_pcs} btr</span>
                          <span className="text-[10px] text-slate-500 font-semibold ml-1">({c.hdp_percent}% HDP)</span>
                          {c.mortality_pcs > 0 && (
                            <span className="text-rose-600 font-black ml-1.5">+{c.mortality_pcs} mati</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-2 text-center text-slate-400 text-xs font-semibold">
              Belum ada pencatatan produksi telur pada tanggal ini.
            </div>
          )}
        </div>

        {/* 2. CATATAN VAKSIN, OBAT, VITAMIN & DESINFEKTAN */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Syringe className="w-3.5 h-3.5 text-purple-600" />
              <span>Vaksin, Obat & Kesehatan ({selectedHealth.length})</span>
            </span>
          </div>

          {selectedHealth.length > 0 ? (
            <div className="space-y-2 pt-1">
              {selectedHealth.map((item, idx) => {
                const badge = getCategoryBadge(item.category);
                const IconComponent = badge.icon;
                return (
                  <div
                    key={item.id || idx}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}
                        >
                          <IconComponent className="w-3 h-3" />
                          <span>{item.category}</span>
                        </span>
                        <span className="text-xs font-black text-slate-900">{item.item_name}</span>
                        {(item as any).coop_name && (
                          <span className="text-[9px] font-black bg-emerald-50 text-[#00684a] px-1.5 py-0.5 rounded border border-emerald-200">
                            {(item as any).coop_name}
                          </span>
                        )}
                      </div>
                      {item.dosage && (
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          Dosis: {item.dosage}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 pt-0.5">
                      {item.method && (
                        <span>
                          Metode: <strong className="text-slate-700 font-bold">{item.method}</strong>
                        </span>
                      )}
                      {item.vaccinated_birds_count !== undefined && item.vaccinated_birds_count > 0 && (
                        <span>
                          Cakupan: <strong className="text-slate-700 font-bold">{item.vaccinated_birds_count} ekor</strong>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[10px] font-medium text-slate-600 bg-white p-1.5 rounded-lg border border-slate-100 mt-1">
                        Catatan: {item.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-2 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Tidak ada catatan vaksin atau obat pada tanggal ini.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
