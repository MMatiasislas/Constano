import Link from "next/link";

import { getGymPublicInfo } from "@/lib/qr-checkin-public";
import { scanQrCheckin } from "@/app/checkin/[gymSlug]/actions";
import { CheckinResultView } from "@/components/checkin/checkin-result-view";

type PageProps = {
  params: Promise<{ gymSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

// Página a la que llega alguien que escaneó el QR con la cámara de SU
// PROPIO celular (no con el kiosco) — el check-in se resuelve acá mismo,
// server-side, en la carga de la página.
export default async function ScanPage({ params, searchParams }: PageProps) {
  const { gymSlug } = await params;
  const { token } = await searchParams;

  const [gym, result] = await Promise.all([
    getGymPublicInfo(gymSlug),
    token ? scanQrCheckin(gymSlug, token) : Promise.resolve({ status: "invalid" as const }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <span className="text-sm font-medium text-muted-foreground">
        {gym?.name ?? "Constano"}
      </span>
      <CheckinResultView result={result} />
      <Link href={`/checkin/${gymSlug}`} className="text-sm text-muted-foreground underline">
        Volver
      </Link>
    </div>
  );
}
