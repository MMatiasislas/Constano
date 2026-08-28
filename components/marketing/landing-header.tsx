"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#caracteristicas", label: "Características" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#precios", label: "Precios" },
];

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  const dashboardHref = isLoggedIn ? "/dashboard" : "/login";
  const dashboardLabel = isLoggedIn ? "Ir al dashboard" : "Iniciar sesión";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-500 text-white">
            <Dumbbell className="size-4" />
          </span>
          Constano
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href={dashboardHref} />}>
            {dashboardLabel}
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/comenzar" />}
            className="bg-brand-500 text-white hover:bg-brand-600"
          >
            Empezar gratis
          </Button>
        </div>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={dashboardHref} onClick={() => setOpen(false)} />}
              >
                {dashboardLabel}
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/comenzar" onClick={() => setOpen(false)} />}
                className="bg-brand-500 text-white hover:bg-brand-600"
              >
                Empezar gratis
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
