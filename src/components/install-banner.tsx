import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasInstallPrompt,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/platform/install";
import { canUseWebInstall, isIosSafari, isStandaloneDisplay } from "@/lib/platform/runtime";

const DISMISS_KEY = "rite-install-dismissed";

export function InstallBanner() {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [promptable, setPromptable] = useState(false);

  useEffect(() => {
    if (!canUseWebInstall()) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;
    setIos(isIosSafari());
    setPromptable(hasInstallPrompt());
    setOpen(hasInstallPrompt() || isIosSafari());
    return subscribeInstallPrompt(() => {
      setPromptable(hasInstallPrompt());
      if (hasInstallPrompt()) setOpen(true);
      if (isStandaloneDisplay()) setOpen(false);
    });
  }, []);

  if (!open) return null;

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "accepted") dismiss();
  }

  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Download className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Install Rite on this phone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ios
              ? "Share, then Add to Home Screen. It opens like an app, without the browser chrome."
              : "Add it to your home screen. Full screen, same rites, ready when you are."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {promptable ? (
              <Button size="sm" onClick={() => void install()}>
                Install
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
