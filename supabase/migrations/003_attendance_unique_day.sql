-- Índice único: un alumno solo puede tener 1 asistencia por día
create unique index if not exists attendances_member_date_unique
  on attendances (member_id, (checked_in_at::date));
