export const MUSCLE_GROUPS = [
  "Pecho",
  "Espalda",
  "Piernas",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Core",
  "Cardio",
  "Funcional",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type Exercise = {
  id: string;
  gym_id: string | null;
  name: string;
  muscle_group: string | null;
  created_at: string;
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export type Routine = {
  id: string;
  gym_id: string;
  member_id: string;
  month_number: number | null;
  title: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type RoutineDay = {
  id: string;
  routine_id: string;
  day_number: number;
  name: string;
  order_index: number;
};

export type RoutineExercise = {
  id: string;
  routine_day_id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
  muscle_group: string | null;
};

export type RoutineWithDayCount = Routine & { routine_days: { count: number }[] };

export type RoutineWithDays = Routine & { routine_days: RoutineDay[] };

export type RoutineDayWithExercises = RoutineDay & { routine_exercises: RoutineExercise[] };

export type MemberStatus = "active" | "paused" | "inactive";

export type Member = {
  id: string;
  gym_id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  birth_date: string | null;
  joined_at: string;
  weekly_frequency: number | null;
  status: MemberStatus;
  notes: string | null;
  created_at: string;
};
