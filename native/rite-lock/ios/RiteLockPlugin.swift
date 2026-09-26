import Capacitor
import UIKit

/// Copy into the iOS app target after `cap add ios`.
/// iOS does not allow a third-party app to whitelist other apps.
/// FamilyControls / ManagedSettings needs an Apple entitlement we do not have.
@objc(RiteLockPlugin)
public class RiteLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RiteLockPlugin"
    public let jsName = "RiteLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unpin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "silenceNotifications", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSystemFocus", returnType: CAPPluginReturnPromise),
    ]

    @objc func pin(_ call: CAPPluginCall) {
        // Screen pinning is not a public iOS API for third-party apps.
        // FamilyControls/ManagedSettings needs an Apple distribution entitlement.
        call.resolve(["pinned": false, "reason": "ios-screen-time"])
    }

    @objc func unpin(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func silenceNotifications(_ call: CAPPluginCall) {
        call.resolve(["ok": false])
    }

    @objc func openSystemFocus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        }
        call.resolve(["opened": true])
    }
}
