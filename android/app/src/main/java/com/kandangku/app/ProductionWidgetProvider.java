package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class ProductionWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_production);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String flockName = prefs.getString("flock_name", "Kandang 1");
        String eggText = prefs.getString("today_egg_total", "1.420 Butir");
        String hdpText = prefs.getString("today_hdp", "89.5%");
        String feedText = prefs.getString("today_feed", "🌾 Pakan: 120 kg");
        String mortText = prefs.getString("today_mort", "💀 Mati: 0 ekor");

        views.setTextViewText(R.id.widget_prod_flock, "KandangKu • " + flockName);
        views.setTextViewText(R.id.widget_prod_egg, eggText);
        views.setTextViewText(R.id.widget_prod_hdp, hdpText);
        views.setTextViewText(R.id.widget_prod_feed, feedText);
        views.setTextViewText(R.id.widget_prod_mort, mortText);

        Intent intent = new Intent(context, MainActivity.class);
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
