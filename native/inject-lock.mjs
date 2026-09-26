#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const javaDir = join(root, "android/app/src/main/java/app/rite/habits");
const resDir = join(root, "android/app/src/main/res");
const appDir = join(root, "android/app");
const main = join(javaDir, "MainActivity.java");
const manifest = join(root, "android/app/src/main/AndroidManifest.xml");
const gradle = join(appDir, "build.gradle");
const pluginSrc = join(root, "native/rite-lock/android/RiteLockPlugin.java");
const widgetSrc = join(root, "native/rite-lock/android/RiteWidgetProvider.java");
const keystoreSrc = join(root, "native/rite-debug.keystore");

if (!existsSync(main) || !existsSync(manifest)) {
  console.error("Run `npx cap add android` first.");
  process.exit(1);
}

mkdirSync(javaDir, { recursive: true });
copyFileSync(pluginSrc, join(javaDir, "RiteLockPlugin.java"));
copyFileSync(widgetSrc, join(javaDir, "RiteWidgetProvider.java"));
if (existsSync(keystoreSrc)) {
  copyFileSync(keystoreSrc, join(appDir, "rite-debug.keystore"));
}

mkdirSync(join(resDir, "layout"), { recursive: true });
mkdirSync(join(resDir, "xml"), { recursive: true });
copyFileSync(
  join(root, "native/rite-lock/android/res/layout/widget_rite.xml"),
  join(resDir, "layout/widget_rite.xml"),
);
copyFileSync(
  join(root, "native/rite-lock/android/res/xml/widget_rite_info.xml"),
  join(resDir, "xml/widget_rite_info.xml"),
);

let activity = readFileSync(main, "utf8");
if (!activity.includes("RiteLockPlugin")) {
  activity = activity.replace(
    "import com.getcapacitor.BridgeActivity;",
    "import android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;",
  );
  if (!activity.includes("onCreate")) {
    activity = activity.replace(
      /public class MainActivity extends BridgeActivity \{[\s\S]*\}/,
      `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RiteLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`,
    );
  }
  writeFileSync(main, activity);
}

let xml = readFileSync(manifest, "utf8");
if (!xml.includes("ACCESS_NOTIFICATION_POLICY")) {
  xml = xml.replace(
    /<application/,
    `    <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />\n    <application`,
  );
}
if (!xml.includes("REORDER_TASKS")) {
  xml = xml.replace(
    /<application/,
    `    <uses-permission android:name="android.permission.REORDER_TASKS" />\n    <application`,
  );
}
if (!xml.includes("android:allowBackup")) {
  xml = xml.replace("<application", `<application android:allowBackup="true"`);
}
if (!xml.includes("RiteWidgetProvider")) {
  xml = xml.replace(
    "</application>",
    `        <receiver
            android:name=".RiteWidgetProvider"
            android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_rite_info" />
        </receiver>
    </application>`,
  );
}
writeFileSync(manifest, xml);

const signingSrc = join(root, "native/rite-signing.gradle");
const signingDest = join(appDir, "rite-signing.gradle");
if (existsSync(signingSrc)) copyFileSync(signingSrc, signingDest);

function applySigning(file) {
  if (!existsSync(file)) return false;
  let text = readFileSync(file, "utf8");
  if (text.includes("rite-signing.gradle")) return true;
  if (file.endsWith(".kts")) {
    text += `\napply(from = "rite-signing.gradle")\n`;
  } else {
    text += `\napply from: "rite-signing.gradle"\n`;
  }
  writeFileSync(file, text);
  return true;
}

const groovyOk = applySigning(gradle);
const ktsOk = applySigning(join(appDir, "build.gradle.kts"));
if (!groovyOk && !ktsOk) {
  console.error("Could not apply rite-signing.gradle — missing android/app/build.gradle");
  process.exit(1);
}
if (!existsSync(join(appDir, "rite-debug.keystore"))) {
  console.error("android/app/rite-debug.keystore was not copied");
  process.exit(1);
}

console.log("RiteLock plugin, widget, and stable debug keystore injected.");
