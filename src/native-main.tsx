import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SplashScreen } from "@capacitor/splash-screen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Home } from "@/routes/index";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Rite native shell is missing #root");
}

window.addEventListener("error", (event) => {
  const node = document.getElementById("rite-boot-error");
  if (node) node.textContent = event.message || "Rite failed to start";
});

createRoot(root).render(
  <StrictMode>
    <TooltipProvider delayDuration={400}>
      <Home />
      <Toaster />
    </TooltipProvider>
  </StrictMode>,
);

void SplashScreen.hide().catch(() => {
  /* web / already hidden */
});
