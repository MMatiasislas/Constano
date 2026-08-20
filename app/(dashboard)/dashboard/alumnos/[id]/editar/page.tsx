import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EditarAlumnoForm } from "./editar-form";
import type { Member } from "@/types/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarAlumnoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase.from("members").select("*").eq("id", id).single();

  if (!member) {
    notFound();
  }

  return <EditarAlumnoForm member={member as Member} />;
}
