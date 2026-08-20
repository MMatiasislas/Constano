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
