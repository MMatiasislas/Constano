"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./reveal-on-scroll";

const MIN_STUDENTS = 25;
const MAX_STUDENTS = 300;
const STEP = 5;

// Fórmula realista de cuánto tiempo se ahorra un gimnasio por alumno:
// - 3 minutos por alumno por semana en asistencia manual (marcar, buscar al
//   alumno en la lista, corregir errores de carga)
// - 8 minutos por alumno por mes en cobros y seguimiento manual (cobrar,
//   anotar el pago, buscar deudores, mandar mensajes de recordatorio)
const WEEKLY_ATTENDANCE_MINUTES_SAVED_PER_STUDENT = 3;
const WEEKS_PER_MONTH = 4;
const MONTHLY_BILLING_MINUTES_SAVED_PER_STUDENT = 8;
const WORKDAY_HOURS = 8;

function calculateSavings(students: number) {
  const totalMinutes =
    students * WEEKLY_ATTENDANCE_MINUTES_SAVED_PER_STUDENT * WEEKS_PER_MONTH +
    students * MONTHLY_BILLING_MINUTES_SAVED_PER_STUDENT;
  const totalHours = totalMinutes / 60;
  const totalWorkdays = totalHours / WORKDAY_HOURS;

  return {
    hours: Math.round(totalHours * 10) / 10,
    workdays: Math.round(totalWorkdays * 10) / 10,
  };
}

export function SavingsCalculatorSection() {
  const [students, setStudents] = useState(MIN_STUDENTS);
  const { hours, workdays } = calculateSavings(students);
  const percent = ((students - MIN_STUDENTS) / (MAX_STUDENTS - MIN_STUDENTS)) * 100;

  return (
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold tracking-widest text-brand-600 uppercase">
            Calculá tu ahorro
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            ¿Cuánto tiempo te devuelve Constano?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Cada alumno te ahorra minutos en cobros, recordatorios y seguimiento. Movés el
            selector y ves el impacto en tu mes.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delayMs={150} className="mt-14">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="students-slider" className="text-sm font-medium text-foreground">
                Cantidad de alumnos
              </label>
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold tabular-nums text-white">
                {students}
              </span>
            </div>

            <input
              id="students-slider"
              type="range"
              min={MIN_STUDENTS}
              max={MAX_STUDENTS}
              step={STEP}
              value={students}
              onChange={(e) => setStudents(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--color-brand-500) ${percent}%, var(--color-muted) ${percent}%)`,
              }}
              className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:shadow-md"
              aria-valuetext={`${students} alumnos`}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{MIN_STUDENTS}</span>
              <span>{MAX_STUDENTS}</span>
            </div>

            <div className="mt-10 flex flex-col items-center border-t border-border pt-8 text-center">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                <Clock className="size-4 text-brand-500" />
                Horas recuperadas por mes
              </span>
              <span className="mt-3 text-5xl font-black tracking-tight text-brand-600 tabular-nums sm:text-6xl">
                ~{hours.toFixed(1)} hs
              </span>
              <p className="mt-4 max-w-md text-sm text-pretty text-muted-foreground">
                Con Constano recuperás ~{hours.toFixed(1)} horas por mes. Eso equivale a ~
                {workdays.toFixed(1)} días de trabajo (jornadas de 8hs).
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/signup" />}
                className="h-12 bg-brand-500 px-6 text-base text-white hover:bg-brand-600"
              >
                Empezar gratis 7 días
                <ArrowRight />
              </Button>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
