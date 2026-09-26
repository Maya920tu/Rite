package app.rite.habits;

import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Copy into android/app/src/main/java/app/rite/habits/ after `cap add android`.
 * Register in MainActivity: registerPlugin(RiteLockPlugin.class);
 */
@CapacitorPlugin(name = "RiteLock")
public class RiteLockPlugin extends Plugin {

    @PluginMethod
    public void pin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                getActivity().startLockTask();
                ret.put("pinned", true);
                ret.put("reason", "android");
            } catch (Exception e) {
                try {
                    Intent security = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                    security.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(security);
                } catch (Exception ignored) {
                    /* no settings activity */
                }
                ret.put("pinned", false);
                ret.put("reason", "denied");
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void unpin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().stopLockTask();
            } catch (Exception ignored) {
                /* not pinned */
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void silenceNotifications(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        JSObject ret = new JSObject();
        NotificationManager nm =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) {
            ret.put("ok", false);
            call.resolve(ret);
            return;
        }
        if (!nm.isNotificationPolicyAccessGranted()) {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            ret.put("ok", false);
            call.resolve(ret);
            return;
        }
        nm.setInterruptionFilter(
            on
                ? NotificationManager.INTERRUPTION_FILTER_PRIORITY
                : NotificationManager.INTERRUPTION_FILTER_ALL
        );
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSystemFocus(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            Intent wellbeing = getContext()
                .getPackageManager()
                .getLaunchIntentForPackage("com.google.android.apps.wellbeing");
            if (wellbeing != null) {
                wellbeing.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(wellbeing);
                ret.put("opened", true);
                call.resolve(ret);
                return;
            }
        } catch (Exception ignored) {
            /* fall through */
        }
        Intent settings = new Intent(Settings.ACTION_SETTINGS);
        settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(settings);
        ret.put("opened", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncWidget(PluginCall call) {
        String line = call.getString("line", "Open Rite");
        String sub = call.getString("sub", "Today’s rites");
        SharedPreferences prefs = getContext().getSharedPreferences("RiteWidget", Context.MODE_PRIVATE);
        prefs.edit().putString("line", line).putString("sub", sub).apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName name = new ComponentName(getContext(), RiteWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        if (ids.length > 0) {
            new RiteWidgetProvider().onUpdate(getContext(), manager, ids);
        }
        JSObject ret = new JSObject();
        ret.put("widgets", ids.length);
        call.resolve(ret);
    }

    @PluginMethod
    public void bringToFront(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                Intent intent = new Intent(getContext(), MainActivity.class);
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_NEW_TASK
                );
                getContext().startActivity(intent);
                try {
                    getActivity().startLockTask();
                } catch (Exception ignored) {
                    /* screen pinning may be off */
                }
                ret.put("ok", true);
            } catch (Exception e) {
                ret.put("ok", false);
            }
            call.resolve(ret);
        });
    }
}
