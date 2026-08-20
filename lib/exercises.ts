import type { MuscleGroup } from "@/types/db";

export const MUSCLE_GROUP_BADGE_CLASS: Record<MuscleGroup, string> = {
  Pecho: "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-400",
  Espalda: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Piernas: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Hombros: "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-400",
  Bíceps: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-400",
  Tríceps: "border-transparent bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  Core: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Cardio: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  Funcional: "border-transparent bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
};

export function muscleGroupBadgeClass(group: string | null) {
  if (!group) return "border-transparent bg-muted text-muted-foreground";
  return (
    MUSCLE_GROUP_BADGE_CLASS[group as MuscleGroup] ??
    "border-transparent bg-muted text-muted-foreground"
  );
}
