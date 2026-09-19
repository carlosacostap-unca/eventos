"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";

function subscribeToOrigin() {
  return () => {};
}

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

export function EventSharePanel({
  eventTitle,
  publicPath,
  slug,
}: {
  eventTitle: string;
  publicPath: string;
  slug: string;
}) {
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => "",
  );
  const publicUrl = origin ? new URL(publicPath, origin).toString() : "";
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!publicUrl) return;

    let active = true;
    QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: { dark: "#102a43", light: "#ffffff" },
    })
      .then((value) => {
        if (active) setQrDataUrl(value);
      })
      .catch(() => {
        if (active) {
          setFeedback({
            kind: "error",
            message: "No se pudo generar el código QR.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [publicUrl]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setFeedback({ kind: "success", message: "URL copiada al portapapeles." });
    } catch {
      setFeedback({
        kind: "error",
        message: "No se pudo copiar la URL. Podés seleccionarla manualmente.",
      });
    }
  }

  async function copyQr() {
    try {
      if (!qrDataUrl || !navigator.clipboard?.write || !("ClipboardItem" in window)) {
        throw new Error("Image clipboard unavailable");
      }
      const image = await fetch(qrDataUrl).then((response) => response.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      setFeedback({ kind: "success", message: "QR copiado como imagen." });
    } catch {
      setFeedback({
        kind: "error",
        message:
          "El navegador no permitió copiar la imagen. Podés descargar el QR en PNG.",
      });
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${slug}.png`;
    link.click();
    setFeedback({ kind: "success", message: "QR descargado en formato PNG." });
  }

  return (
    <section className="panel share-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Difusión</p>
          <h2>Compartir inscripción</h2>
        </div>
      </div>
      <div className="share-layout">
        <div className="share-copy">
          <p>
            Distribuí el formulario público de <strong>{eventTitle}</strong> mediante
            su enlace o código QR.
          </p>
          <label className="field">
            <span>URL pública del formulario</span>
            <div className="share-url-row">
              <input
                value={publicUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
                aria-label="URL pública del formulario"
              />
              <button
                className="button button-secondary"
                type="button"
                onClick={copyUrl}
                disabled={!publicUrl}
              >
                Copiar URL
              </button>
            </div>
          </label>
          {feedback ? (
            <p
              className={"share-feedback share-feedback-" + feedback.kind}
              role="status"
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
        <div className="share-qr">
          <div className="share-qr-frame">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`Código QR para inscribirse en ${eventTitle}`}
                width={320}
                height={320}
                unoptimized
              />
            ) : (
              <span>Generando QR…</span>
            )}
          </div>
          <div className="share-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={copyQr}
              disabled={!qrDataUrl}
            >
              Copiar QR
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={downloadQr}
              disabled={!qrDataUrl}
            >
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
