package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;

public class CalendarWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String roleName = prefs.getString("active_profile_name", "P roni");
        String roleType = prefs.getString("active_profile_role", "worker");
        String roleBadge = "owner".equalsIgnoreCase(roleType) ? "Owner: " + roleName : "Pekerja: " + roleName;

        views.setTextViewText(R.id.widget_calendar_worker, roleBadge);

        // Update 7-Day Calendar Strip numbers
        Calendar cal = Calendar.getInstance();
        int todayDayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // Sunday=1, Monday=2...
        // Convert to Monday=0 .. Sunday=6
        int todayIdx = (todayDayOfWeek + 5) % 7;

        cal.add(Calendar.DAY_OF_MONTH, -todayIdx); // Move to Monday of current week

        int[] dayViewIds = {
            R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6
        };
        String[] dayNames = {"Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"};

        for (int i = 0; i < 7; i++) {
            int d = cal.get(Calendar.DAY_OF_MONTH);
            String dayLabel = dayNames[i] + "\n" + d;
            views.setTextViewText(dayViewIds[i], dayLabel);

            if (i == todayIdx) {
                views.setTextColor(dayViewIds[i], Color.parseColor("#00684A"));
            } else if (i == 6) {
                views.setTextColor(dayViewIds[i], Color.parseColor("#EF4444")); // Sunday
            } else {
                views.setTextColor(dayViewIds[i], Color.parseColor("#64748B"));
            }

            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        // Render real tasks from JSON
        String tasksJson = prefs.getString("tasks_json", null);
        int taskCount = 0;

        if (tasksJson != null && !tasksJson.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(tasksJson);
                taskCount = arr.length();

                int[] checkIds = {R.id.task_check_1, R.id.task_check_2, R.id.task_check_3};
                int[] textIds = {R.id.task_text_1, R.id.task_text_2, R.id.task_text_3};

                for (int i = 0; i < 3; i++) {
                    if (i < taskCount) {
                        JSONObject t = arr.getJSONObject(i);
                        String title = t.optString("text", "");
                        boolean done = t.optBoolean("done", false);

                        views.setTextViewText(textIds[i], title);
                        if (done) {
                            views.setTextViewText(checkIds[i], "✓");
                            views.setTextColor(checkIds[i], Color.parseColor("#00684A"));
                            views.setTextColor(textIds[i], Color.parseColor("#64748B"));
                        } else {
                            views.setTextViewText(checkIds[i], "○");
                            views.setTextColor(checkIds[i], Color.parseColor("#D97706"));
                            views.setTextColor(textIds[i], Color.parseColor("#0F172A"));
                        }
                    } else {
                        // Empty slot
                        views.setTextViewText(checkIds[i], "");
                        views.setTextViewText(textIds[i], "");
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        if (taskCount == 0) {
            views.setTextViewText(R.id.task_check_1, "✓");
            views.setTextColor(R.id.task_check_1, Color.parseColor("#00684A"));
            views.setTextViewText(R.id.task_text_1, "Semua tugas kandang hari ini beres!");
            views.setTextViewText(R.id.task_check_2, "");
            views.setTextViewText(R.id.task_text_2, "");
            views.setTextViewText(R.id.task_check_3, "");
            views.setTextViewText(R.id.task_text_3, "");
        }

        // Click to open Tasks page in App
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("quick_action", "tasks");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            102,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_calendar_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
