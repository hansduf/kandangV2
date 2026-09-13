package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class ActionsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_actions);

        // Action 1: Catat Telur
        Intent eggIntent = new Intent(context, MainActivity.class);
        eggIntent.putExtra("quick_action", "egg");
        PendingIntent piEgg = PendingIntent.getActivity(
            context, 201, eggIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_egg, piEgg);

        // Action 2: Catat Pakan
        Intent feedIntent = new Intent(context, MainActivity.class);
        feedIntent.putExtra("quick_action", "feed");
        PendingIntent piFeed = PendingIntent.getActivity(
            context, 202, feedIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_feed, piFeed);

        // Action 3: Catat Obat
        Intent healthIntent = new Intent(context, MainActivity.class);
        healthIntent.putExtra("quick_action", "health");
        PendingIntent piHealth = PendingIntent.getActivity(
            context, 203, healthIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_health, piHealth);

        // Action 4: Buka Tugas
        Intent tasksIntent = new Intent(context, MainActivity.class);
        tasksIntent.putExtra("quick_action", "tasks");
        PendingIntent piTasks = PendingIntent.getActivity(
            context, 204, tasksIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_tasks, piTasks);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
