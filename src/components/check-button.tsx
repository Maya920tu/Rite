import { Check } from "lucide-react";
import { colorClasses } from "@/lib/habits/colors";
import type { HabitColorId } from "@/lib/habits/types";
import { cn } from "@/lib/utils";

type CheckButtonProps = {
  done: boolean;
  color: HabitColorId;
  label: string;
  onToggle: () => void;
};

export function CheckButton({ done, color, label, onToggle }: CheckButtonProps) {
  const classes = colorClasses(color);
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative grid size-12 shrink-0 place-items-center rounded-full border-2 transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] touch-manipulation",
        classes.text,
        done ? cn(classes.bg, "border-transparent") : "border-current bg-transparent",
      )}
    >
      <Check
        className={cn(
          "size-5 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          done
            ? "scale-100 text-primary-foreground opacity-100"
            : "scale-75 text-current opacity-30",
        )}
        strokeWidth={2.5}
      />
    </button>
  );
}
