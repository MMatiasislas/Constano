import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  icon: Icon,
  label,
  value,
  footer,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  footer?: React.ReactNode;
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:ring-foreground/20"
      )}
    >
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-3xl font-medium tracking-tight text-foreground">{value}</span>
        {footer && <div className="text-sm">{footer}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
