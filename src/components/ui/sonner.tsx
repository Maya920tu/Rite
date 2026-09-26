import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "font-sans border-border bg-card text-foreground shadow-card",
          title: "text-foreground",
          description: "text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-card)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
        } as CSSProperties
      }
    />
  );
}

export { Toaster };
