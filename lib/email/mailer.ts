import "server-only";

import nodemailer from "nodemailer";

import { DomainError } from "@/lib/domain/errors";
import { getServerEnv } from "@/lib/env";

export async function sendCertificateEmail(input: {
  to: string;
  participantName: string;
  eventTitle: string;
  pdf: Uint8Array;
  filename: string;
}) {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new DomainError("NOT_CONFIGURED", "El proveedor de correo no está configurado.");
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: "Tu certificado de " + input.eventTitle,
    text:
      "Hola " +
      input.participantName +
      ",\n\nAdjuntamos tu certificado de asistencia a " +
      input.eventTitle +
      ".\n",
    attachments: [
      {
        filename: input.filename,
        content: Buffer.from(input.pdf),
        contentType: "application/pdf",
      },
    ],
  });
}
