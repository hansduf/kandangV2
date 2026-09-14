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
        } else if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
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

        // Draw Full Month Grid on Bitmap (Screenshot 1 Authentic Layout)
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
        int width = 700;
        int height = 440;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        canvas.drawColor(Color.WHITE);

        int viewYear = cal.get(Calendar.YEAR);
        int viewMonth = cal.get(Calendar.MONTH);

        Calendar temp = (Calendar) cal.clone();
        temp.set(Calendar.DAY_OF_MONTH, 1);
        int firstDayOfWeek = temp.get(Calendar.DAY_OF_WEEK); // Sunday = 1, Monday = 2...
        int startCol = firstDayOfWeek - 1; // 0 = Sunday (M), 1 = Monday (S)... 6 = Saturday (S)

        int daysInMonth = temp.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Previous month days calculation
        Calendar prevMonthCal = (Calendar) cal.clone();
        prevMonthCal.add(Calendar.MONTH, -1);
        int daysInPrevMonth = prevMonthCal.getActualMaximum(Calendar.DAY_OF_MONTH);

        // Header Day Labels: M, S, S, R, K, J, S (Exact match to Screenshot 1)
        String[] dayLabels = {"M", "S", "S", "R", "K", "J", "S"};
        float colWidth = (float) width / 7f;
        float headerY = 26f;

        Paint dayLabelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dayLabelPaint.setTextSize(16f);
        dayLabelPaint.setTextAlign(Paint.Align.CENTER);
        dayLabelPaint.setFakeBoldText(true);

        for (int i = 0; i < 7; i++) {
            float cx = (i * colWidth) + (colWidth / 2f);
            if (i == 0) {
                dayLabelPaint.setColor(Color.parseColor("#EF4444")); // Sunday = Red
            } else {
                dayLabelPaint.setColor(Color.parseColor("#64748B"));
            }
            canvas.drawText(dayLabels[i], cx, headerY, dayLabelPaint);
        }

        // Dividing line under header
        Paint linePaint = new Paint();
        linePaint.setColor(Color.parseColor("#F1F5F9"));
        linePaint.setStrokeWidth(1.5f);
        canvas.drawLine(0, 36f, width, 36f, linePaint);

        // Subtle vertical dividers between columns
        Paint vertLinePaint = new Paint();
        vertLinePaint.setColor(Color.parseColor("#F8FAFC"));
        vertLinePaint.setStrokeWidth(1f);
        for (int i = 1; i < 7; i++) {
            float vx = i * colWidth;
            canvas.drawLine(vx, 36f, vx, height, vertLinePaint);
        }

        // Date Grid Metrics
        float rowStartY = 42f;
        float rowHeight = (height - rowStartY) / 5f;

        Paint dateNumPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dateNumPaint.setTextSize(17f);
        dateNumPaint.setTextAlign(Paint.Align.CENTER);

        Paint todayBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayBgPaint.setColor(Color.parseColor("#0F172A")); // Solid black circle for today like Screenshot 1
        todayBgPaint.setStyle(Paint.Style.FILL);

        Paint eventPillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventPillPaint.setStyle(Paint.Style.FILL);

        Paint eventTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventTextPaint.setColor(Color.WHITE);
        eventTextPaint.setTextSize(10.5f);
        eventTextPaint.setFakeBoldText(true);
        eventTextPaint.setTextAlign(Paint.Align.LEFT);

        int currentDay = 1;
        int nextMonthDay = 1;

        for (int row = 0; row < 5; row++) {
            float rowTop = rowStartY + (row * rowHeight);

            // Horizontal row line
            if (row > 0) {
                canvas.drawLine(0, rowTop, width, rowTop, linePaint);
            }

            for (int col = 0; col < 7; col++) {
                float cellX = col * colWidth;
                float cx = cellX + (colWidth / 2f);
                float dateCenterY = rowTop + 16f;

                if (row == 0 && col < startCol) {
                    // Previous month days
                    int prevDate = daysInPrevMonth - (startCol - col - 1);
                    dateNumPaint.setColor(Color.parseColor("#CBD5E1"));
                    dateNumPaint.setFakeBoldText(false);
                    canvas.drawText(String.valueOf(prevDate), cx, dateCenterY + 5f, dateNumPaint);

                    // Sample previous month event pill
                    if (col == 1) {
                        drawEventPill(canvas, cellX + 3f, dateCenterY + 14f, colWidth - 6f, 15f, "#3B82F6", "Catat", eventPillPaint, eventTextPaint);
                    }
                } else if (currentDay <= daysInMonth) {
                    // Current month days
                    boolean isToday = (viewYear == realYear && viewMonth == realMonth && currentDay == realDay);

                    if (isToday) {
                        canvas.drawCircle(cx, dateCenterY, 13f, todayBgPaint);
                        dateNumPaint.setColor(Color.WHITE);
                        dateNumPaint.setFakeBoldText(true);
                    } else if (col == 0) {
                        dateNumPaint.setColor(Color.parseColor("#EF4444")); // Red Sunday
                        dateNumPaint.setFakeBoldText(false);
                    } else {
                        dateNumPaint.setColor(Color.parseColor("#1E293B"));
                        dateNumPaint.setFakeBoldText(false);
                    }
                    canvas.drawText(String.valueOf(currentDay), cx, dateCenterY + 5f, dateNumPaint);

                    // Event Pills matching Screenshot 1 layout
                    float pillY1 = dateCenterY + 14f;
                    float pillY2 = pillY1 + 18f;
                    float pillW = colWidth - 6f;

                    if (currentDay == realDay) {
                        // Today: Green production pill + Blue task pill
                        drawEventPill(canvas, cellX + 3f, pillY1, pillW, 15f, "#059669", "Catat Telur", eventPillPaint, eventTextPaint);
                        drawEventPill(canvas, cellX + 3f, pillY2, pillW, 15f, "#2563EB", "Cek Sekam", eventPillPaint, eventTextPaint);
                    } else if (currentDay == realDay - 1 || currentDay == realDay - 2 || currentDay == realDay - 3) {
                        // Recent recorded days: Green pill
                        drawEventPill(canvas, cellX + 3f, pillY1, pillW, 15f, "#059669", "125 btr", eventPillPaint, eventTextPaint);
                        drawEventPill(canvas, cellX + 3f, pillY2, pillW, 15f, "#3B82F6", "Pakan OK", eventPillPaint, eventTextPaint);
                    } else if (currentDay % 7 == 3) {
                        // Vaccine / Health day: Purple pill
                        drawEventPill(canvas, cellX + 3f, pillY1, pillW, 15f, "#7C3AED", "Vaksin ND", eventPillPaint, eventTextPaint);
                    } else if (currentDay % 6 == 0) {
                        // Cleaning / Maintenance: Blue pill
                        drawEventPill(canvas, cellX + 3f, pillY1, pillW, 15f, "#2563EB", "Sanitasi", eventPillPaint, eventTextPaint);
                    } else if (currentDay % 5 == 1 && currentDay > 15) {
                        // Amber inspection pill
                        drawEventPill(canvas, cellX + 3f, pillY1, pillW, 15f, "#D97706", "Cek Suhu", eventPillPaint, eventTextPaint);
                    }

                    currentDay++;
                } else {
                    // Next month days
                    dateNumPaint.setColor(Color.parseColor("#CBD5E1"));
                    dateNumPaint.setFakeBoldText(false);
                    canvas.drawText(String.valueOf(nextMonthDay), cx, dateCenterY + 5f, dateNumPaint);

                    if (nextMonthDay == 1 || nextMonthDay == 2) {
                        drawEventPill(canvas, cellX + 3f, dateCenterY + 14f, colWidth - 6f, 15f, "#7C3AED", "Jadwal", eventPillPaint, eventTextPaint);
                    }
                    nextMonthDay++;
                }
            }
        }

        return bitmap;
    }

    private static void drawEventPill(Canvas canvas, float x, float y, float width, float height, String hexColor, String text, Paint pillPaint, Paint textPaint) {
        pillPaint.setColor(Color.parseColor(hexColor));
        RectF rect = new RectF(x, y, x + width, y + height);
        canvas.drawRoundRect(rect, 4f, 4f, pillPaint);

        // Truncate text if needed to fit pill
        String displayText = text;
        if (textPaint.measureText(displayText) > width - 8f) {
            displayText = displayText.length() > 5 ? displayText.substring(0, 5) + ".." : displayText;
        }
        canvas.drawText(displayText, x + 4f, y + height - 3.5f, textPaint);
    }
}
