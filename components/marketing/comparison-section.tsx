import { AlertTriangle, Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";

type CellValue = { type: "x" | "warn"; text: string };

const ROWS: { category: string; excel: CellValue; other: CellValue; constano: string }[] = [
  {
    category: "Precio",
    excel: { type: "x", text: "Horas perdidas armando planillas" },
    other: { type: "x", text: "Cobra por módulo aparte" },
    constano: "Todo incluido en un solo precio",
  },
  {
    category: "Rutinas de entrenamiento",
    excel: { type: "x", text: "Se pierden en Word sueltos" },
    other: { type: "x", text: "Rara vez lo incluyen" },
    constano: "Biblioteca de ejercicios + PDF con tu logo",
  },
  {
    category: "Alertas de retención",
    excel: { type: "x", text: "No existe" },
    other: { type: "x", text: "No existe" },
    constano: "Te avisa antes de que un alumno se dé de baja",
  },
  {
    category: "Control de asistencia",
    excel: { type: "x", text: "No sabés quién vino" },
    other: { type: "warn", text: "Con costo adicional" },
    constano: "QR automático, sin cargar nada a mano",
  },
  {
    category: "Control de pagos",
    excel: { type: "x", text: "A mano, siempre se escapa alguno" },
    other: { type: "warn", text: "Básico" },
    constano: "Automático, con vencimientos claros",
  },
  {
    category: "Importación de alumnos",
    excel: { type: "x", text: "No existe" },
    other: { type: "x", text: "Rara vez lo tienen" },
    constano: "Subís tu Excel y listo",
  },
  {
    category: "Plantillas reutilizables",
    excel: { type: "x", text: "No existe" },
    other: { type: "x", text: "No existe" },
    constano: "Armá una vez, asigná a todos",
  },
];

function MutedCell({ value }: { value: CellValue }) {
  const Icon = value.type === "x" ? X : AlertTriangle;
  return (
    <td className="border-t border-border px-5 py-4 align-top">
      <div className="flex items-start gap-2">
        <Icon
          className={
            value.type === "x"
              ? "mt-0.5 size-4 shrink-0 text-red-400/70"
              : "mt-0.5 size-4 shrink-0 text-amber-500/70"
          }
        />
        <span className="text-sm text-muted-foreground">{value.text}</span>
      </div>
    </td>
  );
}

function WinCell({ text, isLast }: { text: string; isLast: boolean }) {
  return (
    <td
      className={cn(
        "border-t border-x border-brand-500/25 bg-brand-200/15 px-5 py-4 align-top",
        isLast && "border-b"
      )}
    >
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <span className="text-sm font-semibold text-foreground">{text}</span>
      </div>
    </td>
  );
}

export function ComparisonSection() {
  return (
    <section className="bg-muted/40 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold tracking-widest text-brand-600 uppercase">
            La diferencia es clara
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Dejá de perder tiempo y alumnos
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Esto es lo que cambia cuando pasás de planillas o de otro software a Constano.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delayMs={150} className="mt-14">
          <div className="relative">
            <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="w-1/4 px-5 py-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Categoría
                    </th>
                    <th className="w-1/4 px-5 py-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Excel / Planillas
                    </th>
                    <th className="w-1/4 px-5 py-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Otro software
                    </th>
                    <th className="w-1/4 border-x border-t border-brand-500 bg-brand-500 px-5 py-4 text-sm font-bold tracking-wide text-white">
                      Constano
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr key={row.category}>
                      <td className="border-t border-border px-5 py-4 align-top text-sm font-bold">
                        {row.category}
                      </td>
                      <MutedCell value={row.excel} />
                      <MutedCell value={row.other} />
                      <WinCell text={row.constano} isLast={i === ROWS.length - 1} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent sm:hidden"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
            Deslizá para ver la comparativa completa →
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
