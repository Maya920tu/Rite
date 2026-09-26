package app.rite.habits;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class RiteWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences prefs = context.getSharedPreferences("RiteWidget", Context.MODE_PRIVATE);
        String line = prefs.getString("line", "Open Rite");
        String sub = prefs.getString("sub", "Today’s rites");
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_rite);
            views.setTextViewText(R.id.widget_title, "Rite");
            views.setTextViewText(R.id.widget_line, line);
            views.setTextViewText(R.id.widget_sub, sub);
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                PendingIntent pending = PendingIntent.getActivity(
                    context,
                    0,
                    launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widget_root, pending);
            }
            manager.updateAppWidget(id, views);
        }
    }
}
