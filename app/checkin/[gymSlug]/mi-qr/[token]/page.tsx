import { notFound } from "next/navigation";

import { getGymPublicInfo, getMemberQrInfo } from "@/lib/qr-checkin-public";
import { buildCheckinScanUrl } from "@/lib/qr-checkin";
import { nombreCompleto } from "@/lib/members";
import { MiQrView } from "@/components/checkin/mi-qr-view";

type PageProps = {
  params: Promise<{ gymSlug: string; token: string }>;
};

export default async function MiQrPage({ params }: PageProps) {
  const { gymSlug, token } = await params;

  const [gym, member] = await Promise.all([
    getGymPublicInfo(gymSlug),
    getMemberQrInfo(gymSlug, token),
  ]);

  if (!gym || !member) {
    notFound();
  }

  const scanUrl = buildCheckinScanUrl(gymSlug, token);

  return (
    <MiQrView
      scanUrl={scanUrl}
      memberName={nombreCompleto(member.first_name, member.last_name)}
      gymName={gym.name}
    />
  );
}
