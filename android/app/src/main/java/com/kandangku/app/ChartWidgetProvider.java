package com.kandangku.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
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

    private static final String PREFS_NAME = "KandangKuWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_chart);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String flockName = prefs.getString("flock_name", "Total Farm");
        String statsText = prefs.getString("chart_stats", "Rata-rata: 19 btr • HDP: 95%");
        String profileName = prefs.getString("active_profile_name", "Petugas");
        String profileRole = prefs.getString("active_profile_role", "worker");

        String roleBadge = "owner".equalsIgnoreCase(profileRole) ? "Owner: " + profileName : "Pekerja: " + profileName;

        views.setTextViewText(R.id.widget_chart_flock, flockName);
        views.setTextViewText(R.id.widget_chart_role, roleBadge);
        views.setTextViewText(R.id.widget_chart_stats, statsText);

        // Render dynamic Area Chart Bitmap
        Bitmap chartBitmap = renderAreaChartBitmap(prefs);
        if (chartBitmap != null) {
            views.setImageViewBitmap(R.id.widget_chart_image, chartBitmap);
        }

        // Click to open Reports / Performance Chart in App
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("quick_action", "reports");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            101,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_chart_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static class ChartPoint {
        String date;
        int value;
        ChartPoint(String d, int v) {
            this.date = d;
            this.value = v;
        }
    }

    private static Bitmap renderAreaChartBitmap(SharedPreferences prefs) {
        int width = 520;
        int height = 180;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        // Clean white background
        canvas.drawColor(Color.WHITE);

        // Read real data points
        List<ChartPoint> points = new ArrayList<>();
        String jsonStr = prefs.getString("history_7_days_json", null);

        if (jsonStr != null && !jsonStr.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    points.add(new ChartPoint(obj.optString("date", ""), obj.optInt("val", 0)));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Fallback default sample matching Screenshot 3 & 4
        if (points.isEmpty()) {
            points.add(new ChartPoint("11/09", 20));
            points.add(new ChartPoint("12/09", 19));
            points.add(new ChartPoint("13/09", 16));
        }

        int count = points.size();
        if (count < 2) {
            // Need at least 2 points to draw an area
            points.add(0, new ChartPoint("10/09", points.get(0).value));
            count = points.size();
        }

        int maxVal = 10;
        for (ChartPoint pt : points) {
            if (pt.value > maxVal) maxVal = pt.value;
        }
        maxVal = (int) Math.ceil(maxVal * 1.25); // headroom for labels

        // Grid lines
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

        // Calculate X and Y for each point
        float[] posX = new float[count];
        float[] posY = new float[count];
        float stepX = (width - paddingLeft - paddingRight) / (count - 1);

        for (int i = 0; i < count; i++) {
            posX[i] = paddingLeft + (i * stepX);
            float ratio = (float) points.get(i).value / (float) maxVal;
            posY[i] = chartBaseY - (ratio * chartUsableHeight);
        }

        // 1. Draw Gradient Filled Area Under Curve
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

        Paint areaPaint = new Paint();
        areaPaint.setAntiAlias(true);
        areaPaint.setStyle(Paint.Style.FILL);
        areaPaint.setShader(new LinearGradient(
            0, paddingTop, 0, chartBaseY,
            Color.parseColor("#4000684A"), // Semi-transparent emerald
            Color.parseColor("#0500684A"), // Soft fade to white
            Shader.TileMode.CLAMP
        ));
        canvas.drawPath(areaPath, areaPaint);

        // 2. Draw Curve Stroke
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

        Paint linePaint = new Paint();
        linePaint.setAntiAlias(true);
        linePaint.setColor(Color.parseColor("#00684A"));
        linePaint.setStrokeWidth(4.5f);
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);
        canvas.drawPath(linePath, linePaint);

        // 3. Draw Dots & Text Values
        Paint dotOuterPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotOuterPaint.setColor(Color.WHITE);
        dotOuterPaint.setStyle(Paint.Style.FILL);

        Paint dotInnerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotInnerPaint.setColor(Color.parseColor("#00684A"));
        dotInnerPaint.setStyle(Paint.Style.FILL);

        Paint valTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        valTextPaint.setColor(Color.parseColor("#0F172A"));
        valTextPaint.setTextSize(18f);
        valTextPaint.setTextAlign(Paint.Align.CENTER);
        valTextPaint.setFakeBoldText(true);

        Paint dateTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dateTextPaint.setColor(Color.parseColor("#64748B"));
        dateTextPaint.setTextSize(16f);
        dateTextPaint.setTextAlign(Paint.Align.CENTER);

        for (int i = 0; i < count; i++) {
            float cx = posX[i];
            float cy = posY[i];

            // Outer white ring
            canvas.drawCircle(cx, cy, 7.5f, dotOuterPaint);
            // Inner green dot
            canvas.drawCircle(cx, cy, 5f, dotInnerPaint);

            // Value text above dot
            canvas.drawText(String.valueOf(points.get(i).value), cx, cy - 10f, valTextPaint);

            // Date label below baseline
            canvas.drawText(points.get(i).date, cx, height - 10f, dateTextPaint);
        }

        return bitmap;
    }
}
