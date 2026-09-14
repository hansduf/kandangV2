import { DashboardSummary, DailyRecord, DailyTaskView, AppProfile, Flock } from '@/types/database';
import { fetchDashboardSummary, fetchDailyHistory, fetchFlocks, fetchTasksForDate } from '@/lib/supabase';

export interface WidgetSyncParams {
  summary?: DashboardSummary | null;
  history?: DailyRecord[];
  tasks?: DailyTaskView[];
  flocks?: Flock[];
  profile?: AppProfile | null;
  flockHistoriesMap?: Record<string, DailyRecord[]>;
}

export function syncDataToWidgets(params: WidgetSyncParams): void {
  if (typeof window === 'undefined') return;

  const bridge = (window as any).AndroidWidgetBridge;
  if (!bridge || typeof bridge.updateWidgetData !== 'function') {
    return;
  }

  try {
    const { summary, history = [], tasks = [], flocks = [], profile, flockHistoriesMap = {} } = params;

    const flockName = summary?.flock?.name || (flocks.length > 1 ? 'Total Farm' : flocks[0]?.name || 'Kandang 1');
    const goodPcs = summary?.today?.egg_good_pcs || 0;
    const badPcs = summary?.today?.egg_bad_pcs || 0;
    const totalPcs = goodPcs + badPcs; // Total Telur (Utuh + Rusak)
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

    const mapRecord = (r: DailyRecord) => {
      let displayDate = r.record_date;
      if (r.record_date.length >= 10) {
        const parts = r.record_date.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}`;
        }
      }
      const good = r.egg_good_pcs || 0;
      const bad = r.egg_bad_pcs || 0;
      return {
        date: displayDate,
        good,
        bad,
        val: good + bad, // Total telur biologis (utuh + retak)
      };
    };

    // 7 Days History for Area Chart
    const sortedHistory = [...history].sort((a, b) => a.record_date.localeCompare(b.record_date));
    const recent7 = sortedHistory.slice(-7);
    const history7Days = recent7.map(mapRecord);

    // Multi-flock histories for Tab switching
    let historyW = history7Days;
    let history1 = history7Days;

    for (const f of flocks) {
      const fHist = flockHistoriesMap[f.id] || [];
      const fSorted = [...fHist].sort((a, b) => a.record_date.localeCompare(b.record_date)).slice(-7).map(mapRecord);
      if (f.name.toLowerCase().includes('w')) {
        historyW = fSorted.length > 0 ? fSorted : historyW;
      } else if (f.name.toLowerCase().includes('1')) {
        history1 = fSorted.length > 0 ? fSorted : history1;
      }
    }

    const statsAll = `Total: ${totalPcs} btr (${goodPcs} utuh + ${badPcs} retak) • HDP: ${hdp}%`;
    const statsW = `Total: ${totalPcs} btr (${goodPcs} utuh + ${badPcs} retak) • HDP: ${hdp}%`;
    const stats1 = `Total: ${totalPcs} btr (${goodPcs} utuh + ${badPcs} retak) • HDP: ${hdp}%`;

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
      chartStats: statsAll,
      statsAll,
      statsW,
      stats1,
      activeProfileName: profile?.name || 'Pitik',
      activeProfileRole: profile?.role || 'owner',
      history7Days: JSON.stringify(history7Days),
      historyAll: JSON.stringify(history7Days),
      historyW: JSON.stringify(historyW),
      history1: JSON.stringify(history1),
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

    const flockHistoriesMap: Record<string, DailyRecord[]> = {};

    const [summary, history, todayTasks] = await Promise.all([
      fetchDashboardSummary(firstFlockId),
      fetchDailyHistory(firstFlockId, 7),
      fetchTasksForDate(todayStr, profile?.id),
    ]);

    // Fetch individual histories for multi-kandang tabs
    await Promise.all(
      flocks.map(async (f) => {
        try {
          const hist = await fetchDailyHistory(f.id, 7);
          flockHistoriesMap[f.id] = hist;
        } catch {
          // ignore
        }
      })
    );

    syncDataToWidgets({
      summary,
      history,
      tasks: todayTasks,
      flocks,
      profile,
      flockHistoriesMap,
    });
  } catch (err) {
    console.warn('Error pushing live state to widgets:', err);
  }
}
