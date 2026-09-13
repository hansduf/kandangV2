package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
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
        String roleName = prefs.getString("active_profile_name", "Petugas");
        String roleType = prefs.getString("active_profile_role", "worker");
        String roleBadge = "owner".equalsIgnoreCase(roleType) ? "Owner: " + roleName : "Pekerja: " + roleName;

        views.setTextViewText(R.id.widget_calendar_worker, roleBadge);

        // Update 7-Day Calendar Strip numbers
        Calendar cal = Calendar.getInstance();
        int todayDayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // Sunday=1, Monday=2...
        // Convert to Monday=0 .. Sunday=6
        int todayIdx = (todayDayOfWeek + 5) % 7;

        cal.add(Calendar.DAY_OF_MONTH, -todayIdx);
        int[] dayViewIds = {R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6};
        String[] dayNames = {"Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"};

        for (int i = 0; i < 7; i++) {
            int dNum = cal.get(Calendar.DAY_OF_MONTH);
            String text = dayNames[i] + "\n" + dNum;
            views.setTextViewText(dayViewIds[i], text);
            if (i == todayIdx) {
                views.setTextColor(dayViewIds[i], Color.parseColor("#10B981")); // Highlight today
            } else if (i == 6) {
                views.setTextColor(dayViewIds[i], Color.parseColor("#F87171")); // Sunday
            } else {
                views.setTextColor(dayViewIds[i], Color.parseColor("#94A3B8"));
            }
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        // Tasks checklist
        String t1 = prefs.getString("task_1", "07:00 Panen Telur Pagi (Kandang 1)");
        boolean d1 = prefs.getBoolean("task_1_done", true);
        String t2 = prefs.getString("task_2", "08:30 Beri Pakan Pagi & Cek Air Minum");
        boolean d2 = prefs.getBoolean("task_2_done", false);
        String t3 = prefs.getString("task_3", "10:00 Vaksinasi ND & Pembersihan");
        boolean d3 = prefs.getBoolean("task_3_done", false);

        views.setTextViewText(R.id.task_text_1, t1);
        views.setTextViewText(R.id.task_check_1, d1 ? "✓" : "○");
        views.setTextColor(R.id.task_check_1, d1 ? Color.parseColor("#10B981") : Color.parseColor("#FDE047"));

        views.setTextViewText(R.id.task_text_2, t2);
        views.setTextViewText(R.id.task_check_2, d2 ? "✓" : "○");
        views.setTextColor(R.id.task_check_2, d2 ? Color.parseColor("#10B981") : Color.parseColor("#FDE047"));

        views.setTextViewText(R.id.task_text_3, t3);
        views.setTextViewText(R.id.task_check_3, d3 ? "✓" : "○");
        views.setTextColor(R.id.task_check_3, d3 ? Color.parseColor("#10B981") : Color.parseColor("#94A3B8"));

        // Pending Intent to open app
        Intent intent = new Intent(context, MainActivity.class);
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
