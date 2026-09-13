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
import android.graphics.Paint;
import android.graphics.RectF;
import android.widget.RemoteViews;

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
        String flockName = prefs.getString("flock_name", "Kandang 1");
        String statsText = prefs.getString("chart_stats", "Rata-rata: 1.350 btr • Peak HDP: 91.2%");

        views.setTextViewText(R.id.widget_chart_flock, flockName);
        views.setTextViewText(R.id.widget_chart_stats, statsText);

        // Render Dynamic Bitmap Bar Chart
        Bitmap chartBitmap = renderBarChartBitmap(prefs);
        views.setImageViewBitmap(R.id.widget_chart_image, chartBitmap);

        // Click to open app
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            101,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_chart_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static Bitmap renderBarChartBitmap(SharedPreferences prefs) {
        int width = 480;
        int height = 160;
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        // Background grid lines
        Paint gridPaint = new Paint();
        gridPaint.setColor(Color.parseColor("#22FFFFFF"));
        gridPaint.setStrokeWidth(2f);
        canvas.drawLine(20, height - 35, width - 20, height - 35, gridPaint);
        canvas.drawLine(20, height / 2, width - 20, height / 2, gridPaint);

        // 7 days data
        int[] values = new int[7];
        String[] days = {"Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"};
        int maxVal = 100;

        for (int i = 0; i < 7; i++) {
            values[i] = prefs.getInt("day_val_" + i, (int) (65 + Math.sin(i * 0.8) * 25));
            if (values[i] > maxVal) maxVal = values[i];
        }

        Paint barPaint = new Paint();
        barPaint.setAntiAlias(true);
        barPaint.setColor(Color.parseColor("#10B981")); // Emerald bar

        Paint peakBarPaint = new Paint();
        peakBarPaint.setAntiAlias(true);
        peakBarPaint.setColor(Color.parseColor("#FDE047")); // Yellow peak bar

        Paint textPaint = new Paint();
        textPaint.setAntiAlias(true);
        textPaint.setColor(Color.parseColor("#D1FAE5"));
        textPaint.setTextSize(20f);
        textPaint.setTextAlign(Paint.Align.CENTER);

        Paint valTextPaint = new Paint();
        valTextPaint.setAntiAlias(true);
        valTextPaint.setColor(Color.WHITE);
        valTextPaint.setTextSize(17f);
        valTextPaint.setTextAlign(Paint.Align.CENTER);

        float spacing = (float) (width - 40) / 7;
        float barWidth = spacing * 0.55f;
        float chartBaseY = height - 35;
        float maxBarHeight = height - 70;

        for (int i = 0; i < 7; i++) {
            float centerX = 20 + (i * spacing) + (spacing / 2);
            float barHeight = (values[i] / (float) maxVal) * maxBarHeight;
            float left = centerX - (barWidth / 2);
            float right = centerX + (barWidth / 2);
            float top = chartBaseY - barHeight;

            RectF rect = new RectF(left, top, right, chartBaseY);
            if (values[i] == maxVal) {
                canvas.drawRoundRect(rect, 8f, 8f, peakBarPaint);
            } else {
                canvas.drawRoundRect(rect, 8f, 8f, barPaint);
            }

            // Day label
            canvas.drawText(days[i], centerX, height - 12, textPaint);

            // Value label above bar
            if (barHeight > 30) {
                canvas.drawText(String.valueOf(values[i]), centerX, top - 6, valTextPaint);
            }
        }

        return bitmap;
    }
}
