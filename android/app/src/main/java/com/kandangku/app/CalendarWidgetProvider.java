package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class CalendarWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_NAV_CALENDAR = "com.kandangku.app.ACTION_NAV_CALENDAR";
    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_NAV_CALENDAR.equals(intent.getAction())) {
            int delta = intent.getIntExtra("month_delta", 0);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int currentOffset = prefs.getInt("cal_month_offset", 0);
            prefs.edit().putInt("cal_month_offset", currentOffset + delta).apply();

            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, CalendarWidgetProvider.class));
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String roleName = prefs.getString("active_profile_name", "Pitik");
        String roleType = prefs.getString("active_profile_role", "owner");
        int monthOffset = prefs.getInt("cal_month_offset", 0);

        String roleBadge = "owner".equalsIgnoreCase(roleType) ? "Owner: " + roleName : "Pekerja: " + roleName;
        views.setTextViewText(R.id.widget_calendar_worker, roleBadge);

        Calendar cal = Calendar.getInstance();
        int realYear = cal.get(Calendar.YEAR);
        int realMonth = cal.get(Calendar.MONTH);
        int realDay = cal.get(Calendar.DAY_OF_MONTH);

        cal.add(Calendar.MONTH, monthOffset);

        SimpleDateFormat sdfMonth = new SimpleDateFormat("MMMM yyyy", new Locale("id", "ID"));
        String monthTitle = sdfMonth.format(cal.getTime());
        views.setTextViewText(R.id.widget_calendar_month, monthTitle);

        // Previous Month Button
        Intent prevIntent = new Intent(context, CalendarWidgetProvider.class);
        prevIntent.setAction(ACTION_NAV_CALENDAR);
        prevIntent.putExtra("month_delta", -1);
        views.setOnClickPendingIntent(R.id.btn_cal_prev, PendingIntent.getBroadcast(
            context, 401, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Next Month Button
        Intent nextIntent = new Intent(context, CalendarWidgetProvider.class);
        nextIntent.setAction(ACTION_NAV_CALENDAR);
        nextIntent.putExtra("month_delta", 1);
        views.setOnClickPendingIntent(R.id.btn_cal_next, PendingIntent.getBroadcast(
            context, 402, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Quick Add Button -> open Egg Input
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.putExtra("quick_action", "egg");
        views.setOnClickPendingIntent(R.id.btn_cal_add, PendingIntent.getActivity(
            context, 403, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Draw Full Month Grid on Bitmap
        Bitmap gridBitmap = renderMonthGridBitmap(cal, realYear, realMonth, realDay);
        if (gridBitmap != null) {
            views.setImageViewBitmap(R.id.widget_calendar_image, gridBitmap);
        }

        // Render Task Items in Bottom Card
        String tasksJson = prefs.getString("tasks_json", null);
        int taskCount = 0;

        if (tasksJson != null && !tasksJson.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(tasksJson);
                taskCount = arr.length();

                int[] checkIds = {R.id.task_check_1, R.id.task_check_2};
                int[] textIds = {R.id.task_text_1, R.id.task_text_2};

                for (int i = 0; i < 2; i++) {
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
        }

        // Bottom Card Click -> open Tasks page
        Intent tasksPageIntent = new Intent(context, MainActivity.class);
        tasksPageIntent.putExtra("quick_action", "tasks");
        PendingIntent piTasks = PendingIntent.getActivity(
            context, 404, tasksPageIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_calendar_task_card, piTasks);
        views.setOnClickPendingIntent(R.id.widget_calendar_image, piTasks);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static Bitmap renderMonthGridBitmap(Calendar cal, int realYear, int realMonth, int realDay) {
        int width = 560;
        int height = 300;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        canvas.drawColor(Color.WHITE);

        int viewYear = cal.get(Calendar.YEAR);
        int viewMonth = cal.get(Calendar.MONTH);

        Calendar temp = (Calendar) cal.clone();
        temp.set(Calendar.DAY_OF_MONTH, 1);
        int firstDayOfWeek = temp.get(Calendar.DAY_OF_WEEK); // Sunday=1, Monday=2...
        int startCol = (firstDayOfWeek + 5) % 7; // Monday=0 .. Sunday=6

        int daysInMonth = temp.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Header Day Labels: Sen, Sel, Rab, Kam, Jum, Sab, Min
        String[] dayLabels = {"Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"};
        float colWidth = (float) width / 7;
        float headerY = 24f;

        Paint dayLabelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dayLabelPaint.setColor(Color.parseColor("#94A3B8"));
        dayLabelPaint.setTextSize(15f);
        dayLabelPaint.setTextAlign(Paint.Align.CENTER);
        dayLabelPaint.setFakeBoldText(true);

        for (int i = 0; i < 7; i++) {
            float cx = (i * colWidth) + (colWidth / 2f);
            if (i == 6) dayLabelPaint.setColor(Color.parseColor("#EF4444")); // Sunday
            else dayLabelPaint.setColor(Color.parseColor("#94A3B8"));
            canvas.drawText(dayLabels[i], cx, headerY, dayLabelPaint);
        }

        // Dividing line under header
        Paint linePaint = new Paint();
        linePaint.setColor(Color.parseColor("#F1F5F9"));
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(0, 32f, width, 32f, linePaint);

        // Date Grid
        float rowStartY = 40f;
        float rowHeight = (height - rowStartY) / 5.2f;

        Paint dateNumPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dateNumPaint.setTextSize(16f);
        dateNumPaint.setTextAlign(Paint.Align.CENTER);

        Paint todayBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayBgPaint.setColor(Color.parseColor("#0F172A")); // Dark circle for today like Screenshot 1
        todayBgPaint.setStyle(Paint.Style.FILL);

        Paint eventBarBlue = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventBarBlue.setColor(Color.parseColor("#3B82F6")); // Blue badge like Screenshot 1
        eventBarBlue.setStyle(Paint.Style.FILL);

        Paint eventBarPurple = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventBarPurple.setColor(Color.parseColor("#8B5CF6")); // Purple badge like Screenshot 1
        eventBarPurple.setStyle(Paint.Style.FILL);

        Paint eventBarGreen = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventBarGreen.setColor(Color.parseColor("#10B981")); // Green production badge
        eventBarGreen.setStyle(Paint.Style.FILL);

        int currentDay = 1;
        int row = 0;

        while (currentDay <= daysInMonth && row < 6) {
            for (int col = (row == 0 ? startCol : 0); col < 7 && currentDay <= daysInMonth; col++) {
                float cellX = col * colWidth;
                float cellY = rowStartY + (row * rowHeight);
                float cx = cellX + (colWidth / 2f);

                boolean isToday = (viewYear == realYear && viewMonth == realMonth && currentDay == realDay);

                if (isToday) {
                    canvas.drawCircle(cx, cellY + 14f, 12f, todayBgPaint);
                    dateNumPaint.setColor(Color.WHITE);
                    dateNumPaint.setFakeBoldText(true);
                } else if (col == 6) {
                    dateNumPaint.setColor(Color.parseColor("#EF4444"));
                    dateNumPaint.setFakeBoldText(false);
                } else {
                    dateNumPaint.setColor(Color.parseColor("#1E293B"));
                    dateNumPaint.setFakeBoldText(false);
                }

                canvas.drawText(String.valueOf(currentDay), cx, cellY + 19f, dateNumPaint);

                // Sample/Real Event Bars on Date (like in Screenshot 1)
                float barLeft = cellX + 4f;
                float barRight = cellX + colWidth - 4f;
                float barTop = cellY + 30f;
                float barBottom = barTop + 6f;

                if (currentDay == realDay || currentDay == 11 || currentDay == 12 || currentDay == 13) {
                    // Production Egg recorded bar (Emerald)
                    canvas.drawRoundRect(new RectF(barLeft, barTop, barRight, barBottom), 3f, 3f, eventBarGreen);
                } else if (currentDay % 5 == 0) {
                    // Vaccine / Health bar (Purple)
                    canvas.drawRoundRect(new RectF(barLeft, barTop, barRight, barBottom), 3f, 3f, eventBarPurple);
                } else if (currentDay % 7 == 2) {
                    // Cleaning task bar (Blue)
                    canvas.drawRoundRect(new RectF(barLeft, barTop, barRight, barBottom), 3f, 3f, eventBarBlue);
                }

                currentDay++;
            }
            row++;
        }

        return bitmap;
    }
}
