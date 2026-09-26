import type { HabitColorId } from "./types";

export type HabitColorClasses = {
  bg: string;
  bgSoft: string;
  text: string;
  ring: string;
};

export const HABIT_COLOR_META: Record<
  HabitColorId,
  { label: string; classes: HabitColorClasses }
> = {
  clay: {
    label: "Clay",
    classes: {
      bg: "bg-habit-clay",
      bgSoft: "bg-habit-clay/15",
      text: "text-habit-clay",
      ring: "ring-habit-clay",
    },
  },
  forest: {
    label: "Forest",
    classes: {
      bg: "bg-habit-forest",
      bgSoft: "bg-habit-forest/15",
      text: "text-habit-forest",
      ring: "ring-habit-forest",
    },
  },
  teal: {
    label: "Teal",
    classes: {
      bg: "bg-habit-teal",
      bgSoft: "bg-habit-teal/15",
      text: "text-habit-teal",
      ring: "ring-habit-teal",
    },
  },
  slate: {
    label: "Slate",
    classes: {
      bg: "bg-habit-slate",
      bgSoft: "bg-habit-slate/15",
      text: "text-habit-slate",
      ring: "ring-habit-slate",
    },
  },
  wine: {
    label: "Wine",
    classes: {
      bg: "bg-habit-wine",
      bgSoft: "bg-habit-wine/15",
      text: "text-habit-wine",
      ring: "ring-habit-wine",
    },
  },
  dusk: {
    label: "Dusk",
    classes: {
      bg: "bg-habit-dusk",
      bgSoft: "bg-habit-dusk/15",
      text: "text-habit-dusk",
      ring: "ring-habit-dusk",
    },
  },
  olive: {
    label: "Olive",
    classes: {
      bg: "bg-habit-olive",
      bgSoft: "bg-habit-olive/15",
      text: "text-habit-olive",
      ring: "ring-habit-olive",
    },
  },
  cinder: {
    label: "Cinder",
    classes: {
      bg: "bg-habit-cinder",
      bgSoft: "bg-habit-cinder/15",
      text: "text-habit-cinder",
      ring: "ring-habit-cinder",
    },
  },
};

export function colorClasses(id: HabitColorId): HabitColorClasses {
  return HABIT_COLOR_META[id].classes;
}
