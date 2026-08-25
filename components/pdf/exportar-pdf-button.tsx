"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DownloadIcon, FileDownIcon, MessageCircleIcon } from "lucide-react";

import { whatsappHref } from "@/lib/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// `messagePrefix` es el mensaje de WhatsApp completo salvo la URL del PDF
// (que todavía no existe cuando se arma este prop en el servidor). El
// cliente concatena `messagePrefix + pdfUrl` recién cuando el PDF ya está
// generado. No puede ser una función (`buildMessage(url)`): Next.js no deja
// pasar funciones comunes de un Server Component a un Client Component, solo
// Server Actions — se probó y tira "Functions cannot be passed directly to
// Client Components" en runtime.
type WhatsappShare = { phone: string; messagePrefix: string };

export function ExportarPdfButton({
  generatePdf,
  whatsapp,
  whatsappDisabledReason,
}: {
  generatePdf: () => Promise<{ url: string } | { error: string }>;
  whatsapp: WhatsappShare | null;
  whatsappDisabledReason?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    const result = await generatePdf();
    setLoading(false);

    if ("error" in result) {
      toast.error("No pudimos generar el PDF", { description: result.error });
      return;
    }

    setPdfUrl(result.url);
    setOpen(true);
  }

  return (
    <>
      <Button variant="outline" onClick={handleClick} disabled={loading}>
        <FileDownIcon />
        {loading ? "Generando..." : "Exportar PDF"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF generado</DialogTitle>
            <DialogDescription>Descargalo o compartilo por WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              nativeButton={false}
              render={<a href={pdfUrl ?? "#"} download target="_blank" rel="noopener noreferrer" />}
            >
              <DownloadIcon />
              Descargar PDF
            </Button>
            {whatsapp && pdfUrl ? (
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={
                  <a
                    href={whatsappHref(whatsapp.phone, whatsapp.messagePrefix + pdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <MessageCircleIcon />
                Compartir por WhatsApp
              </Button>
            ) : (
              <span title={whatsappDisabledReason} className="w-full">
                <Button variant="outline" disabled className="w-full">
                  <MessageCircleIcon />
                  Compartir por WhatsApp
                </Button>
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
