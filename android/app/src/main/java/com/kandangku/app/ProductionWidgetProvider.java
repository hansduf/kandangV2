package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class ProductionWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ProductionWidgetProvider.class));
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_production);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String flockName = prefs.getString("flock_name", "Total Farm");
        String eggGood = prefs.getString("today_egg_good", "19 btr");
        String eggGoodKg = prefs.getString("today_egg_good_kg", "1.19 kg");
        String eggBad = prefs.getString("today_egg_bad", "0 btr");
        String hdpText = prefs.getString("today_hdp", "100% HDP");
        String hhpText = prefs.getString("today_hhp", "95%");
        String mortText = prefs.getString("today_mort", "1 mati");
        String breakdown = prefs.getString("coop_breakdown", "● W (W): 9 btr (100% HDP) +1 mati  •  ● 1 (1): 10 btr");

        views.setTextViewText(R.id.widget_prod_flock, "PRODUKSI TELUR • " + flockName);
        views.setTextViewText(R.id.widget_prod_hdp, hdpText);
        views.setTextViewText(R.id.widget_prod_egg, eggGood);
        views.setTextViewText(R.id.widget_prod_egg_kg, eggGoodKg);
        views.setTextViewText(R.id.widget_prod_bad_egg, eggBad);
        views.setTextViewText(R.id.widget_prod_hhp, hhpText);
        views.setTextViewText(R.id.widget_prod_mort, mortText);
        views.setTextViewText(R.id.widget_prod_breakdown, breakdown);

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("quick_action", "dashboard");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            103,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_prod_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
