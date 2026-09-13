package com.kandangku.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new WidgetDataBridge(this), "AndroidWidgetBridge");
        }
    }

    public class WidgetDataBridge {
        private Context context;

        public WidgetDataBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void updateWidgetData(String jsonData) {
            try {
                org.json.JSONObject obj = new org.json.JSONObject(jsonData);
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();

                if (obj.has("flockName")) editor.putString("flock_name", obj.getString("flockName"));
                if (obj.has("todayEggTotal")) editor.putString("today_egg_total", obj.getString("todayEggTotal"));
                if (obj.has("todayHdp")) editor.putString("today_hdp", obj.getString("todayHdp"));
                if (obj.has("todayFeed")) editor.putString("today_feed", obj.getString("todayFeed"));
                if (obj.has("todayMort")) editor.putString("today_mort", obj.getString("todayMort"));
                if (obj.has("chartStats")) editor.putString("chart_stats", obj.getString("chartStats"));
                if (obj.has("activeProfileName")) editor.putString("active_profile_name", obj.getString("activeProfileName"));
                if (obj.has("activeProfileRole")) editor.putString("active_profile_role", obj.getString("activeProfileRole"));

                if (obj.has("dayValues")) {
                    org.json.JSONArray arr = obj.getJSONArray("dayValues");
                    for (int i = 0; i < arr.length() && i < 7; i++) {
                        editor.putInt("day_val_" + i, arr.getInt(i));
                    }
                }

                if (obj.has("tasks")) {
                    org.json.JSONArray tasksArr = obj.getJSONArray("tasks");
                    for (int i = 0; i < tasksArr.length() && i < 3; i++) {
                        org.json.JSONObject t = tasksArr.getJSONObject(i);
                        editor.putString("task_" + (i + 1), t.optString("text", ""));
                        editor.putBoolean("task_" + (i + 1) + "_done", t.optBoolean("done", false));
                    }
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
