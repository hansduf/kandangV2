package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class ActionsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ActionsWidgetProvider.class));
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_actions);

        // Action 1: Catat Telur (Direct into Egg Input Modal)
        Intent eggIntent = new Intent(context, MainActivity.class);
        eggIntent.putExtra("quick_action", "egg");
        PendingIntent piEgg = PendingIntent.getActivity(
            context, 201, eggIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_egg, piEgg);

        // Action 2: Catat Obat & Vaksin (Direct into Health Modal)
        Intent healthIntent = new Intent(context, MainActivity.class);
        healthIntent.putExtra("quick_action", "health");
        PendingIntent piHealth = PendingIntent.getActivity(
            context, 202, healthIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_health, piHealth);

        // Action 3: Catat Kematian & Afkir (Direct into Mortality Modal)
        Intent mortIntent = new Intent(context, MainActivity.class);
        mortIntent.putExtra("quick_action", "mortality");
        PendingIntent piMort = PendingIntent.getActivity(
            context, 203, mortIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_mort, piMort);

        // Action 4: Buka Agenda Tugas
        Intent tasksIntent = new Intent(context, MainActivity.class);
        tasksIntent.putExtra("quick_action", "tasks");
        PendingIntent piTasks = PendingIntent.getActivity(
            context, 204, tasksIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_tasks, piTasks);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
