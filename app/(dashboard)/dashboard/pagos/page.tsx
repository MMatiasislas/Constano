import { createClient } from "@/lib/supabase/server";
import { diasHastaVencimiento, getMembershipStatus, type MembershipStatusLabel } from "@/lib/payments";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlumnoPagoRow } from "@/components/pagos/alumno-pago-row";
import type { Member, MembershipWithPlan } from "@/types/db";

type AlumnoConEstado = {
  member: Member;
  membership: MembershipWithPlan | null;
  status: MembershipStatusLabel;
  dias: number | null;
};

export default async function PagosPage() {
  const supabase = await createClient();

  const [{ data: membersData }, { data: membershipsData }] = await Promise.all([
    supabase.from("members").select("*").eq("status", "active").order("first_name"),
    supabase.from("memberships").select("*, plans(*)").eq("status", "active"),
  ]);

  const members = (membersData ?? []) as Member[];
  const memberships = (membershipsData ?? []) as MembershipWithPlan[];
  const membershipByMember = new Map(memberships.map((m) => [m.member_id, m]));

  const hoy = new Date();
  const alumnos: AlumnoConEstado[] = members.map((member) => {
    const membership = membershipByMember.get(member.id) ?? null;
    const status = getMembershipStatus(membership, hoy);
    const dias = membership ? diasHastaVencimiento(membership.end_date, hoy) : null;
    return { member, membership, status, dias };
  });

  const vencidos = alumnos
    .filter((a) => a.status === "vencido")
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  const vencenPronto = alumnos
    .filter((a) => a.status === "vence_pronto")
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  const alDia = alumnos.filter((a) => a.status === "al_dia");
  const sinPlan = alumnos.filter((a) => a.status === "sin_plan");

  const defaultTab =
    vencidos.length > 0
      ? "vencidos"
      : vencenPronto.length > 0
        ? "vence_pronto"
        : alDia.length > 0
          ? "al_dia"
          : "sin_plan";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">Controlá quién está al día y quién debe.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="vencidos">Vencidos ({vencidos.length})</TabsTrigger>
          <TabsTrigger value="vence_pronto">Vencen pronto ({vencenPronto.length})</TabsTrigger>
          <TabsTrigger value="al_dia">Al día ({alDia.length})</TabsTrigger>
          <TabsTrigger value="sin_plan">Sin plan ({sinPlan.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="vencidos">
          <ListaAlumnos alumnos={vencidos} vacioTexto="No hay alumnos vencidos en este momento." />
        </TabsContent>
        <TabsContent value="vence_pronto">
          <ListaAlumnos
            alumnos={vencenPronto}
            vacioTexto="No hay alumnos que venzan pronto en este momento."
          />
        </TabsContent>
        <TabsContent value="al_dia">
          <ListaAlumnos alumnos={alDia} vacioTexto="No hay alumnos al día en este momento." />
        </TabsContent>
        <TabsContent value="sin_plan">
          <ListaAlumnos
            alumnos={sinPlan}
            vacioTexto="No hay alumnos sin plan asignado en este momento."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListaAlumnos({
  alumnos,
  vacioTexto,
}: {
  alumnos: AlumnoConEstado[];
  vacioTexto: string;
}) {
  if (alumnos.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-center text-muted-foreground">
          {vacioTexto}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alumnos.map(({ member, membership, status, dias }) => (
        <AlumnoPagoRow
          key={member.id}
          member={member}
          membership={membership}
          status={status}
          dias={dias}
        />
      ))}
    </div>
  );
}
