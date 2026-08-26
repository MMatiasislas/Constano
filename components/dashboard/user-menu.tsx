"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, CompassIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "?";
}

export function UserMenu({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  // 0 = guía no abierta. Cada click la incrementa para forzar un remount de
  // OnboardingDialog (así vuelve a arrancar en `open`, sin importar si ya se
  // había cerrado una vez antes en esta misma sesión de la página).
  const [guideKey, setGuideKey] = useState(0);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Avatar>
            <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-1">
              <span className="text-sm font-medium text-foreground">{fullName}</span>
              <span className="font-normal text-muted-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setGuideKey((k) => k + 1)}>
              <CompassIcon />
              Ver guía de inicio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {guideKey > 0 && <OnboardingDialog key={guideKey} defaultOpen markAsSeen={false} />}
    </>
  );
}
