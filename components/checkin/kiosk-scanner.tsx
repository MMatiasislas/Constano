"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

import { scanQrCheckin, type CheckinScanResult } from "@/app/checkin/[gymSlug]/actions";
import { CheckinResultView } from "@/components/checkin/checkin-result-view";
import { ConfigurarPinPrimeraVez } from "@/components/checkin/configurar-pin-primera-vez";
import { SalirKioscoDialog } from "@/components/checkin/salir-kiosco-dialog";

const SCANNER_ELEMENT_ID = "qr-kiosk-reader";
const RESULT_DISPLAY_MS = 4000;

function extractToken(decodedText: string): string | null {
  try {
    const url = new URL(decodedText);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export function KioskScanner({
  gymSlug,
  gymName,
  hasKioskPin,
  isStaffOfThisGym,
  hasActiveSession,
}: {
  gymSlug: string;
  gymName: string;
  hasKioskPin: boolean;
  isStaffOfThisGym: boolean;
  hasActiveSession: boolean;
}) {
  const needsPinSetup = isStaffOfThisGym && !hasKioskPin;
  const [phase, setPhase] = useState<"setup_pin" | "camera">(
    needsPinSetup ? "setup_pin" : "camera"
  );
  const [scanResult, setScanResult] = useState<CheckinScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initializedRef = useRef(false);
  const processingRef = useRef(false);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "camera" || initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;

    async function handleDecoded(decodedText: string) {
      if (processingRef.current) return;
      processingRef.current = true;
      scannerRef.current?.pause(true);

      const token = extractToken(decodedText);
      const result: CheckinScanResult = token
        ? await scanQrCheckin(gymSlug, token)
        : { status: "invalid" };

      setScanResult(result);

      resultTimeoutRef.current = setTimeout(() => {
        setScanResult(null);
        processingRef.current = false;
        scannerRef.current?.resume();
      }, RESULT_DISPLAY_MS);
    }

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          handleDecoded,
          // onScanFailure se dispara en cada frame sin QR detectado — no hay
          // nada que hacer con eso, es el comportamiento normal de la lib.
          () => {}
        );
      } catch {
        if (!cancelled) {
          setCameraError("No pudimos acceder a la cámara. Revisá los permisos del navegador.");
        }
      }
    })();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [phase, gymSlug]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-foreground">{gymName}</span>
        <SalirKioscoDialog gymSlug={gymSlug} hasActiveSession={hasActiveSession} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16">
        {phase === "setup_pin" ? (
          <ConfigurarPinPrimeraVez onDone={() => setPhase("camera")} />
        ) : (
          <div className="relative flex w-full max-w-md flex-col items-center gap-6">
            <div id={SCANNER_ELEMENT_ID} className="w-full overflow-hidden rounded-2xl" />

            {!scanResult && !cameraError && (
              <p className="text-center text-2xl font-medium text-foreground">
                Escaneá tu código QR para marcar tu entrada
              </p>
            )}

            {cameraError && (
              <p className="text-center text-lg text-red-600 dark:text-red-400">{cameraError}</p>
            )}

            {scanResult && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/95 p-6">
                <CheckinResultView result={scanResult} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
