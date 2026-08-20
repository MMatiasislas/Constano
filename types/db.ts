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
