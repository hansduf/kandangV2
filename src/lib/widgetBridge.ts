import { DashboardSummary, DailyRecord, DailyTaskView, AppProfile } from '@/types/database';

export function syncDataToWidgets(params: {
  summary?: DashboardSummary | null;
  history?: DailyRecord[];
  tasks?: DailyTaskView[];
  profile?: AppProfile | null;
}): void {
  if (typeof window === 'undefined') return;

  const bridge = (window as any).AndroidWidgetBridge;
  if (!bridge || typeof bridge.updateWidgetData !== 'function') {
    return;
  }

  try {
    const { summary, history = [], tasks = [], profile } = params;

    const flockName = summary?.flock?.name || 'Kandang 1';
    const eggTotal = (summary?.today?.egg_good_pcs || 0) + (summary?.today?.egg_bad_pcs || 0);
    const todayEggTotal = `${eggTotal.toLocaleString('id-ID')} Butir`;
    const todayHdp = `${summary?.today?.hdp_percent || 0}%`;
    const todayFeed = `🌾 Pakan: ${summary?.today?.feed_kg || 0} kg`;
    const todayMort = `💀 Mati: ${summary?.today?.mortality_pcs || 0} ekor`;

    // 7 Days History for Bar Chart
    const dayValues: number[] = [];
    const sortedHistory = [...history].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const recent7 = sortedHistory.slice(-7);

    for (let i = 0; i < 7; i++) {
      if (i < recent7.length) {
        const r = recent7[i];
        dayValues.push((r.egg_good_pcs || 0) + (r.egg_bad_pcs || 0));
      } else {
        dayValues.push(0);
      }
    }

    const avgEggs = dayValues.length > 0 ? Math.round(dayValues.reduce((a, b) => a + b, 0) / Math.max(1, dayValues.filter(v => v > 0).length)) : 0;
    const chartStats = `Rata-rata: ${avgEggs.toLocaleString('id-ID')} btr • HDP: ${todayHdp}`;

    // Filter tasks for active profile
    const activeTasks = profile?.role === 'worker'
      ? tasks.filter(t => !t.assigned_to_ids || t.assigned_to_ids.length === 0 || t.assigned_to_ids.includes(profile.id))
      : tasks;

    const topTasks = activeTasks.slice(0, 3).map(t => ({
      text: `${t.due_time ? t.due_time.slice(0, 5) + ' ' : ''}${t.title}${t.flock_name ? ` (${t.flock_name})` : ''}`,
      done: Boolean(t.is_completed),
    }));

    const payload = {
      flockName,
      todayEggTotal,
      todayHdp,
      todayFeed,
      todayMort,
      chartStats,
      activeProfileName: profile?.name || 'Petugas',
      activeProfileRole: profile?.role || 'worker',
      dayValues,
      tasks: topTasks,
    };

    bridge.updateWidgetData(JSON.stringify(payload));
  } catch (err) {
    console.warn('Error syncing data to Android Widget Bridge:', err);
  }
}
