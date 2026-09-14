package com.kandangku.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String PREFS_NAME = "KandangKuWidgetPrefs";
    private static String pendingQuickAction = null;
    private static String pendingFlockId = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        handleWidgetIntent(getIntent());

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new WidgetDataBridge(this), "AndroidWidgetBridge");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        handleWidgetIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent != null && intent.hasExtra("quick_action")) {
            String action = intent.getStringExtra("quick_action");
            String flockId = intent.getStringExtra("flock_id");
            pendingQuickAction = action;
            pendingFlockId = flockId;
            intent.removeExtra("quick_action");

            dispatchQuickActionToWeb(action, flockId);
        }
    }

    private void dispatchQuickActionToWeb(final String action, final String flockId) {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String script = "if (window.handleKandangQuickAction) { window.handleKandangQuickAction('" + action + "', '" + (flockId != null ? flockId : "") + "'); } " +
                                    "else { window.dispatchEvent(new CustomEvent('kandang_quick_action', { detail: { action: '" + action + "', flockId: '" + (flockId != null ? flockId : "") + "' } })); }";
                    bridge.getWebView().evaluateJavascript(script, null);
                }
            });
        }
    }

    public class WidgetDataBridge {
        private Context context;

        public WidgetDataBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String getPendingQuickAction() {
            String action = pendingQuickAction;
            pendingQuickAction = null;
            return action != null ? action : "";
        }

        @JavascriptInterface
        public String getPendingFlockId() {
            String flockId = pendingFlockId;
            pendingFlockId = null;
            return flockId != null ? flockId : "";
        }

        @JavascriptInterface
        public void updateWidgetData(String jsonData) {
            try {
                org.json.JSONObject obj = new org.json.JSONObject(jsonData);
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();

                if (obj.has("flockName")) editor.putString("flock_name", obj.getString("flockName"));
                if (obj.has("todayEggGood")) editor.putString("today_egg_good", obj.getString("todayEggGood"));
                if (obj.has("todayEggGoodKg")) editor.putString("today_egg_good_kg", obj.getString("todayEggGoodKg"));
                if (obj.has("todayEggBad")) editor.putString("today_egg_bad", obj.getString("todayEggBad"));
                if (obj.has("todayHdp")) editor.putString("today_hdp", obj.getString("todayHdp"));
                if (obj.has("todayHhp")) editor.putString("today_hhp", obj.getString("todayHhp"));
                if (obj.has("todayMort")) editor.putString("today_mort", obj.getString("todayMort"));
                if (obj.has("coopBreakdown")) editor.putString("coop_breakdown", obj.getString("coopBreakdown"));
                if (obj.has("chartStats")) editor.putString("chart_stats", obj.getString("chartStats"));
                if (obj.has("activeProfileName")) editor.putString("active_profile_name", obj.getString("activeProfileName"));
                if (obj.has("activeProfileRole")) editor.putString("active_profile_role", obj.getString("activeProfileRole"));

                if (obj.has("history7Days")) {
                    editor.putString("history_7_days_json", obj.getString("history7Days"));
                }
                if (obj.has("historyAll")) {
                    editor.putString("history_all_json", obj.getString("historyAll"));
                }
                if (obj.has("historyW")) {
                    editor.putString("history_w_json", obj.getString("historyW"));
                }
                if (obj.has("history1")) {
                    editor.putString("history_1_json", obj.getString("history1"));
                }
                if (obj.has("statsAll")) {
                    editor.putString("stats_all", obj.getString("statsAll"));
                }
                if (obj.has("statsW")) {
                    editor.putString("stats_w", obj.getString("statsW"));
                }
                if (obj.has("stats1")) {
                    editor.putString("stats_1", obj.getString("stats1"));
                }
                if (obj.has("calendarWeek")) {
                    editor.putString("calendar_week_json", obj.getString("calendarWeek"));
                }
                if (obj.has("tasks")) {
                    editor.putString("tasks_json", obj.getString("tasks"));
                }

                editor.apply();

                // Directly update all active widget instances
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

                int[] prodIds = appWidgetManager.getAppWidgetIds(new android.content.ComponentName(context, ProductionWidgetProvider.class));
                for (int id : prodIds) {
                    ProductionWidgetProvider.updateAppWidget(context, appWidgetManager, id);
                }

                int[] chartIds = appWidgetManager.getAppWidgetIds(new android.content.ComponentName(context, ChartWidgetProvider.class));
                for (int id : chartIds) {
                    ChartWidgetProvider.updateAppWidget(context, appWidgetManager, id);
                }

                int[] calIds = appWidgetManager.getAppWidgetIds(new android.content.ComponentName(context, CalendarWidgetProvider.class));
                for (int id : calIds) {
                    CalendarWidgetProvider.updateAppWidget(context, appWidgetManager, id);
                }

                int[] actIds = appWidgetManager.getAppWidgetIds(new android.content.ComponentName(context, ActionsWidgetProvider.class));
                for (int id : actIds) {
                    ActionsWidgetProvider.updateAppWidget(context, appWidgetManager, id);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
