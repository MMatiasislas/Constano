"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { getMembershipStatusLabel } from "@/lib/payments";
import type { MembershipStatusLabel } from "@/lib/payments";
import type { MembershipStatusBreakdown } from "@/lib/dashboard-stats";

// Mismos colores que los badges de estado de cuota (lib/payments.ts,
// getMembershipStatusColor) pero como hex planos: los slices del gráfico no
// necesitan adaptarse a claro/oscuro (igual que el punto de color de un
// badge), solo el texto de la leyenda usa tokens de tema.
const STATUS_COLORS: Record<MembershipStatusLabel, string> = {
  al_dia: "#10b981",
  vence_pronto: "#f59e0b",
  vencido: "#ef4444",
  sin_plan: "#9ca3af",
};

const STATUS_ORDER: MembershipStatusLabel[] = ["al_dia", "vence_pronto", "vencido", "sin_plan"];

export function MembershipStatusChart({
  breakdown,
}: {
  breakdown: MembershipStatusBreakdown;
}) {
  const data = STATUS_ORDER.map((status) => ({
    status,
    label: getMembershipStatusLabel(status),
    value: breakdown[status],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="h-[200px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="90%"
              strokeWidth={2}
              stroke="var(--card)"
            >
              {data.map((item) => (
                <Cell key={item.status} fill={STATUS_COLORS[item.status]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--popover-foreground)",
                fontSize: 13,
              }}
              formatter={(value, name) => [
                `${value} ${value === 1 ? "alumno" : "alumnos"}`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[item.status] }}
            />
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted-foreground">
              {item.value}
              {total > 0 && ` (${Math.round((item.value / total) * 100)}%)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
