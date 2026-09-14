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
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class ChartWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_FILTER_FLOCK = "com.kandangku.app.ACTION_FILTER_FLOCK";
    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_FILTER_FLOCK.equals(intent.getAction())) {
            String filter = intent.getStringExtra("filter_flock");
            if (filter != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString("chart_flock_filter", filter).apply();

                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ChartWidgetProvider.class));
                for (int id : appWidgetIds) {
                    updateAppWidget(context, appWidgetManager, id);
                }
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
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_chart);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String profileName = prefs.getString("active_profile_name", "Pitik");
        String profileRole = prefs.getString("active_profile_role", "owner");
        String currentFilter = prefs.getString("chart_flock_filter", "all");

        String roleBadge = "owner".equalsIgnoreCase(profileRole) ? "Owner: " + profileName : "Pekerja: " + profileName;
        views.setTextViewText(R.id.widget_chart_role, roleBadge);

        // Update Tabs Styling based on active selection
        if ("w".equalsIgnoreCase(currentFilter)) {
            views.setInt(R.id.btn_tab_all, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_all, Color.parseColor("#64748B"));

            views.setInt(R.id.btn_tab_w, "setBackgroundResource", R.drawable.widget_tab_active_bg);
            views.setTextColor(R.id.btn_tab_w, Color.WHITE);

            views.setInt(R.id.btn_tab_1, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_1, Color.parseColor("#64748B"));
        } else if ("1".equalsIgnoreCase(currentFilter)) {
            views.setInt(R.id.btn_tab_all, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_all, Color.parseColor("#64748B"));

            views.setInt(R.id.btn_tab_w, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_w, Color.parseColor("#64748B"));

            views.setInt(R.id.btn_tab_1, "setBackgroundResource", R.drawable.widget_tab_active_bg);
            views.setTextColor(R.id.btn_tab_1, Color.WHITE);
        } else {
            // "all"
            views.setInt(R.id.btn_tab_all, "setBackgroundResource", R.drawable.widget_tab_active_bg);
            views.setTextColor(R.id.btn_tab_all, Color.WHITE);

            views.setInt(R.id.btn_tab_w, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_w, Color.parseColor("#64748B"));

            views.setInt(R.id.btn_tab_1, "setBackgroundResource", R.drawable.widget_tab_inactive_bg);
            views.setTextColor(R.id.btn_tab_1, Color.parseColor("#64748B"));
        }

        // Set Tab Click Broadcast Intents
        Intent intentAll = new Intent(context, ChartWidgetProvider.class);
        intentAll.setAction(ACTION_FILTER_FLOCK);
        intentAll.putExtra("filter_flock", "all");
        views.setOnClickPendingIntent(R.id.btn_tab_all, PendingIntent.getBroadcast(
            context, 301, intentAll, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        Intent intentW = new Intent(context, ChartWidgetProvider.class);
        intentW.setAction(ACTION_FILTER_FLOCK);
        intentW.putExtra("filter_flock", "w");
        views.setOnClickPendingIntent(R.id.btn_tab_w, PendingIntent.getBroadcast(
            context, 302, intentW, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        Intent intent1 = new Intent(context, ChartWidgetProvider.class);
        intent1.setAction(ACTION_FILTER_FLOCK);
        intent1.putExtra("filter_flock", "1");
        views.setOnClickPendingIntent(R.id.btn_tab_1, PendingIntent.getBroadcast(
            context, 303, intent1, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        ));

        // Render dynamic Area Chart Bitmap for selected filter (Total: Utuh + Rusak)
        Bitmap chartBitmap = renderAreaChartBitmap(prefs, currentFilter);
        if (chartBitmap != null) {
            views.setImageViewBitmap(R.id.widget_chart_image, chartBitmap);
        }

        String statsSummary = getStatsSummary(prefs, currentFilter);
        views.setTextViewText(R.id.widget_chart_stats, statsSummary);

        // Click to open Reports in App
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("quick_action", "reports");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 101, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_chart_open, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_chart_image, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static class ChartPoint {
        String date;
        int good;
        int bad;
        ChartPoint(String d, int g, int b) {
            this.date = d;
            this.good = g;
            this.bad = b;
        }
        int total() {
            return good + bad;
        }
    }

    private static String getStatsSummary(SharedPreferences prefs, String filter) {
        String key = "w".equalsIgnoreCase(filter) ? "stats_w" : ("1".equalsIgnoreCase(filter) ? "stats_1" : "stats_all");
        return prefs.getString(key, "Total: 8 btr (6 utuh + 2 rusak) • HDP: 88.89%");
    }

    private static Bitmap renderAreaChartBitmap(SharedPreferences prefs, String filter) {
        int width = 520;
        int height = 180;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        canvas.drawColor(Color.WHITE);

        List<ChartPoint> points = new ArrayList<>();
        String jsonKey = "w".equalsIgnoreCase(filter) ? "history_w_json" : ("1".equalsIgnoreCase(filter) ? "history_1_json" : "history_all_json");
        String jsonStr = prefs.getString(jsonKey, null);

        if (jsonStr == null || jsonStr.isEmpty()) {
            jsonStr = prefs.getString("history_7_days_json", null);
        }

        if (jsonStr != null && !jsonStr.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    points.add(new ChartPoint(
                        obj.optString("date", ""),
                        obj.optInt("good", obj.optInt("val", 0)),
                        obj.optInt("bad", 0)
                    ));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Fallback default sample (Utuh + Rusak = Total)
        if (points.isEmpty()) {
            points.add(new ChartPoint("11/09", 10, 0));
            points.add(new ChartPoint("12/09", 9, 0));
            points.add(new ChartPoint("13/09", 8, 0));
            points.add(new ChartPoint("14/09", 6, 2)); // 6 utuh + 2 rusak = 8
        }

        int count = points.size();
        if (count < 2) {
            points.add(0, new ChartPoint("10/09", points.get(0).good, points.get(0).bad));
            count = points.size();
        }

        int maxVal = 10;
        for (ChartPoint pt : points) {
            if (pt.total() > maxVal) maxVal = pt.total();
        }
        maxVal = (int) Math.ceil(maxVal * 1.3);

        Paint gridPaint = new Paint();
        gridPaint.setColor(Color.parseColor("#F1F5F9"));
        gridPaint.setStrokeWidth(1.5f);

        float paddingLeft = 36f;
        float paddingRight = 36f;
        float paddingTop = 32f;
        float paddingBottom = 34f;
        float chartBaseY = height - paddingBottom;
        float chartUsableHeight = chartBaseY - paddingTop;

        canvas.drawLine(paddingLeft, chartBaseY, width - paddingRight, chartBaseY, gridPaint);
        canvas.drawLine(paddingLeft, chartBaseY - (chartUsableHeight * 0.5f), width - paddingRight, chartBaseY - (chartUsableHeight * 0.5f), gridPaint);
        canvas.drawLine(paddingLeft, paddingTop, width - paddingRight, paddingTop, gridPaint);

        float[] posX = new float[count];
        float[] posY = new float[count];
        float stepX = (width - paddingLeft - paddingRight) / (count - 1);

        for (int i = 0; i < count; i++) {
            posX[i] = paddingLeft + (i * stepX);
            float ratio = (float) points.get(i).total() / (float) maxVal;
            posY[i] = chartBaseY - (ratio * chartUsableHeight);
        }

        // 1. Area Gradient Fill
        Path areaPath = new Path();
        areaPath.moveTo(posX[0], chartBaseY);
        areaPath.lineTo(posX[0], posY[0]);

        for (int i = 1; i < count; i++) {
            float prevX = posX[i - 1];
            float prevY = posY[i - 1];
            float currX = posX[i];
            float currY = posY[i];
            float midX = (prevX + currX) / 2f;
            areaPath.cubicTo(midX, prevY, midX, currY, currX, currY);
        }

        areaPath.lineTo(posX[count - 1], chartBaseY);
        areaPath.close();

        Paint areaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        areaPaint.setStyle(Paint.Style.FILL);
        areaPaint.setShader(new LinearGradient(
            0, paddingTop, 0, chartBaseY,
            Color.parseColor("#3800684A"),
            Color.parseColor("#0400684A"),
            Shader.TileMode.CLAMP
        ));
        canvas.drawPath(areaPath, areaPaint);

        // 2. Trend Line Stroke
        Path linePath = new Path();
        linePath.moveTo(posX[0], posY[0]);
        for (int i = 1; i < count; i++) {
            float prevX = posX[i - 1];
            float prevY = posY[i - 1];
            float currX = posX[i];
            float currY = posY[i];
            float midX = (prevX + currX) / 2f;
            linePath.cubicTo(midX, prevY, midX, currY, currX, currY);
        }

        Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        linePaint.setColor(Color.parseColor("#00684A"));
        linePaint.setStrokeWidth(4.5f);
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);
        canvas.drawPath(linePath, linePaint);

        // 3. Dots & Text Values
        Paint dotOuter = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotOuter.setColor(Color.WHITE);
        dotOuter.setStyle(Paint.Style.FILL);

        Paint dotInner = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotInner.setColor(Color.parseColor("#00684A"));
        dotInner.setStyle(Paint.Style.FILL);

        Paint valText = new Paint(Paint.ANTI_ALIAS_FLAG);
        valText.setColor(Color.parseColor("#0F172A"));
        valText.setTextSize(18f);
        valText.setTextAlign(Paint.Align.CENTER);
        valText.setFakeBoldText(true);

        Paint dateText = new Paint(Paint.ANTI_ALIAS_FLAG);
        dateText.setColor(Color.parseColor("#64748B"));
        dateText.setTextSize(16f);
        dateText.setTextAlign(Paint.Align.CENTER);

        for (int i = 0; i < count; i++) {
            float cx = posX[i];
            float cy = posY[i];

            canvas.drawCircle(cx, cy, 7.5f, dotOuter);
            canvas.drawCircle(cx, cy, 5f, dotInner);

            // Display total eggs value
            canvas.drawText(String.valueOf(points.get(i).total()), cx, cy - 10f, valText);
            canvas.drawText(points.get(i).date, cx, height - 10f, dateText);
        }

        return bitmap;
    }
}
