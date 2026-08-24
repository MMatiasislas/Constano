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

export type RoutineTemplate = {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type RoutineTemplateDay = {
  id: string;
  template_id: string;
  day_number: number;
  name: string;
  order_index: number;
};

export type RoutineTemplateExercise = {
  id: string;
  template_day_id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
  muscle_group: string | null;
};

export type TemplateWithCounts = RoutineTemplate & {
  routine_template_days: { id: string; routine_template_exercises: { count: number }[] }[];
};

export type TemplateWithDays = RoutineTemplate & { routine_template_days: RoutineTemplateDay[] };

export type TemplateDayWithExercises = RoutineTemplateDay & {
  routine_template_exercises: RoutineTemplateExercise[];
};

export type TemplateWithDaysAndExercises = RoutineTemplate & {
  routine_template_days: TemplateDayWithExercises[];
};

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

export type Attendance = {
  id: string;
  gym_id: string;
  member_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
};

export type AttendanceWithMember = Attendance & {
  members: Pick<Member, "id" | "first_name" | "last_name" | "photo_url" | "weekly_frequency">;
};

export type MemberWithTodayAttendance = Member & { attendances: Attendance[] };

export type AttendanceWithCheckedBy = Attendance & {
  checked_in_by_user: { email: string } | null;
};

export const FREQUENCY_OPTIONS = [
  { value: "all", label: "Todos los alumnos" },
  { value: "1", label: "1 vez por semana o más" },
  { value: "2", label: "2 veces por semana o más" },
  { value: "3", label: "3 veces por semana o más" },
  { value: "4", label: "4 veces por semana o más" },
  { value: "5", label: "5 veces por semana o más" },
  { value: "6", label: "6 veces por semana o más" },
  { value: "free", label: "Plan libre" },
] as const;

export type ApplyToFrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

export type RetentionRule = {
  id: string;
  gym_id: string;
  name: string;
  days_without_attendance: number;
  applies_to_frequency: number | null;
  active: boolean;
  created_at: string;
};

export const RETENTION_ALERT_STATUSES = ["active", "contacted", "resolved", "dismissed"] as const;

export type RetentionAlertStatus = (typeof RETENTION_ALERT_STATUSES)[number];

export const RESOLUTION_REASON_OPTIONS = [
  { value: "volvio", label: "Volvió a entrenar" },
  { value: "renovo", label: "Renovó / sigue activo" },
  { value: "baja", label: "Se dio de baja" },
  { value: "otro", label: "Otro" },
] as const;

export type ResolutionReasonValue = (typeof RESOLUTION_REASON_OPTIONS)[number]["value"];

export type RetentionAlert = {
  id: string;
  gym_id: string;
  member_id: string;
  rule_id: string;
  triggered_at: string;
  status: RetentionAlertStatus;
  resolved_at: string | null;
  resolution_reason: string | null;
  notes: string | null;
  days_without_attendance: number;
};

export type RetentionAlertWithDetails = RetentionAlert & {
  members: Pick<
    Member,
    "id" | "first_name" | "last_name" | "phone" | "photo_url" | "weekly_frequency" | "status"
  >;
  retention_rules: Pick<RetentionRule, "id" | "name" | "days_without_attendance">;
};

export type Plan = {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration_days: number;
  active: boolean;
  created_at: string;
};

export type MembershipStatus = "active" | "expired" | "canceled";

export type Membership = {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  created_at: string;
};

export type MembershipWithPlan = Membership & { plans: Plan };

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export type Payment = {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string | null;
  amount: number;
  paid_at: string;
  method: string;
  notes: string | null;
  created_at: string;
};

export type PaymentWithMember = Payment & {
  members: Pick<Member, "id" | "first_name" | "last_name" | "phone" | "photo_url">;
};
