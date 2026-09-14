import { DashboardSummary, DailyRecord, DailyTaskView, AppProfile, Flock } from '@/types/database';
import { fetchDashboardSummary, fetchDailyHistory, fetchFlocks, fetchTasksForDate } from '@/lib/supabase';

export interface WidgetSyncParams {
  summary?: DashboardSummary | null;
  history?: DailyRecord[];
  tasks?: DailyTaskView[];
  flocks?: Flock[];
  profile?: AppProfile | null;
}

export function syncDataToWidgets(params: WidgetSyncParams): void {
  if (typeof window === 'undefined') return;

  const bridge = (window as any).AndroidWidgetBridge;
  if (!bridge || typeof bridge.updateWidgetData !== 'function') {
    return;
  }

  try {
    const { summary, history = [], tasks = [], flocks = [], profile } = params;

    const flockName = summary?.flock?.name || (flocks.length > 1 ? 'Total Farm' : flocks[0]?.name || 'Kandang 1');
    const goodPcs = summary?.today?.egg_good_pcs || 0;
    const badPcs = summary?.today?.egg_bad_pcs || 0;
    const goodKg = summary?.today?.egg_good_kg || 0;
    const hdp = summary?.today?.hdp_percent !== undefined ? summary.today.hdp_percent : 0;
    const hhp = summary?.today?.hhp_percent !== undefined ? summary.today.hhp_percent : 0;
    const mort = summary?.today?.mortality_pcs || 0;

    const todayEggGood = `${goodPcs.toLocaleString('id-ID')} btr`;
    const todayEggGoodKg = `${goodKg.toFixed(2)} kg`;
    const todayEggBad = `${badPcs.toLocaleString('id-ID')} btr`;
    const todayHdp = `${hdp}% HDP`;
    const todayHhp = `${hhp}%`;
    const todayMort = `${mort} mati`;

    // 7 Days History for Area Chart
    const sortedHistory = [...history].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const recent7 = sortedHistory.slice(-7);

    const history7Days = recent7.map((r) => {
      let displayDate = r.record_date;
      if (r.record_date.length >= 10) {
        const parts = r.record_date.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}`;
        }
      }
      return {
        date: displayDate,
        val: (r.egg_good_pcs || 0) + (r.egg_bad_pcs || 0),
      };
    });

    const totalEggs7 = history7Days.reduce((acc, cur) => acc + cur.val, 0);
    const validDaysCount = Math.max(1, history7Days.filter((h) => h.val > 0).length);
    const avgEggs = Math.round(totalEggs7 / validDaysCount);
    const chartStats = `Rata-rata: ${avgEggs.toLocaleString('id-ID')} btr • HDP: ${hdp}%`;

    // Filter tasks for active profile
    const activeTasks = profile?.role === 'worker'
      ? tasks.filter((t) => !t.assigned_to_ids || t.assigned_to_ids.length === 0 || t.assigned_to_ids.includes(profile.id))
      : tasks;

    const topTasks = activeTasks.slice(0, 3).map((t) => ({
      text: `${t.due_time ? t.due_time.slice(0, 5) + ' ' : ''}${t.title}${t.flock_name ? ` (${t.flock_name})` : ''}`,
      done: Boolean(t.is_completed),
    }));

    // Coop breakdown string
    let coopBreakdown = '';
    if (flocks.length > 1) {
      coopBreakdown = flocks
        .map((f) => `● ${f.name}`)
        .slice(0, 3)
        .join('  •  ');
    } else if (flocks.length === 1) {
      coopBreakdown = `● ${flocks[0].name}: ${todayEggGood} (${todayHdp})`;
    } else {
      coopBreakdown = `● ${flockName}: ${todayEggGood} (${todayHdp})`;
    }

    const payload = {
      flockName,
      todayEggGood,
      todayEggGoodKg,
      todayEggBad,
      todayHdp,
      todayHhp,
      todayMort,
      coopBreakdown,
      chartStats,
      activeProfileName: profile?.name || 'Petugas',
      activeProfileRole: profile?.role || 'worker',
      history7Days: JSON.stringify(history7Days),
      tasks: JSON.stringify(topTasks),
    };

    bridge.updateWidgetData(JSON.stringify(payload));
  } catch (err) {
    console.warn('Error syncing data to Android Widget Bridge:', err);
  }
}

export async function pushLiveStateToWidgets(overrideProfile?: AppProfile | null): Promise<void> {
  if (typeof window === 'undefined') return;

  const bridge = (window as any).AndroidWidgetBridge;
  if (!bridge || typeof bridge.updateWidgetData !== 'function') {
    return;
  }

  try {
    // Get active profile
    let profile = overrideProfile;
    if (!profile) {
      const saved = localStorage.getItem('kandang_active_profile');
      if (saved) {
        try {
          profile = JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }

    const flocks = await fetchFlocks();
    if (!flocks || flocks.length === 0) return;

    const firstFlockId = flocks[0].id;
    const todayStr = new Date().toISOString().split('T')[0];
    const [summary, history, todayTasks] = await Promise.all([
      fetchDashboardSummary(firstFlockId),
      fetchDailyHistory(firstFlockId, 7),
      fetchTasksForDate(todayStr, profile?.id),
    ]);

    syncDataToWidgets({
      summary,
      history,
      tasks: todayTasks,
      flocks,
      profile,
    });
  } catch (err) {
    console.warn('Error pushing live state to widgets:', err);
  }
}
