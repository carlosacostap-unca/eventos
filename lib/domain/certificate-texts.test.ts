import { describe, expect, it } from "vitest";

import {
  DEFAULT_CERTIFICATE_TEXTS,
  certificateDurationHours,
  certificateTextInputSchema,
  renderCertificateText,
  resolveCertificateTexts,
} from "@/lib/domain/certificate-texts";

describe("textos de certificados", () => {
  it("incluye las horas del evento en el texto de participación", () => {
    expect(certificateDurationHours("2026-09-28T19:00:00Z", "2026-09-28T22:00:00Z")).toBe("3");
    const horas = certificateDurationHours("2026-09-29T21:00:00Z", "2026-09-29T22:30:00Z");
    expect(horas).toBe("1,5");
    expect(renderCertificateText(DEFAULT_CERTIFICATE_TEXTS.participation, {
      participante: "Ana", documento: "12345", evento: "Jornada", tipoEvento: "Charla", horas, lugar: "Aula", fecha: "29 de septiembre",
    })).toBe("ha participado de la actividad de tipo Charla de 1,5 horas:");
    expect(() => certificateDurationHours("invalid", "invalid")).toThrow();
    expect(() => certificateDurationHours("2026-09-29T22:30:00Z", "2026-09-29T21:00:00Z")).toThrow();
  });
  it("sustituye el tipo configurado sin alterar su nombre", () => {
    const variables = { participante: "Ana", documento: "12345", evento: "Jornada", lugar: "Aula", fecha: "28 de septiembre" };
    for (const tipoEvento of ["Charla", "Taller Teórico-Práctico", "Curso"]) {
      expect(renderCertificateText("Tipo: {tipoEvento}", { ...variables, tipoEvento })).toBe(`Tipo: ${tipoEvento}`);
    }
    expect(renderCertificateText("Tipo: {tipoEvento}", variables)).toBe("Tipo: Evento");
  });
  it("completa las firmas de configuraciones antiguas y respeta campos vacíos", () => {
    const resolved = resolveCertificateTexts({ footer: "Texto existente", signatureLeftRole: "" });
    expect(resolved).not.toHaveProperty("footer");
    expect(resolved.signatureLeftName).toBe("Ms. Ing. Marcos Darío ARANDA");
    expect(resolved.signatureRightRole).toBe("Decana");
    expect(resolved.signatureLeftRole).toBe("");
  });
  it("conserva los textos predeterminados para eventos sin configuración", () => {
    expect(resolveCertificateTexts(undefined)).toEqual(DEFAULT_CERTIFICATE_TEXTS);
  });

  it("combina una configuración parcial con los valores predeterminados", () => {
    expect(resolveCertificateTexts({ participation: "por haber asistido" })).toEqual({
      ...DEFAULT_CERTIFICATE_TEXTS,
      participation: "por haber asistido",
    });
  });

  it("reemplaza todas las variables disponibles", () => {
    expect(
      renderCertificateText(
        "Se certifica a {participante}, {documento}, por {evento} en {lugar}, el {fecha}",
        {
          participante: "Pérez, Ana",
          documento: "35.500.599",
          evento: "Jornada universitaria",
          lugar: "Aula Magna",
          fecha: "2 de abril de 2027",
        },
      ),
    ).toBe(
      "Se certifica a Pérez, Ana, 35.500.599, por Jornada universitaria en Aula Magna, el 2 de abril de 2027",
    );
  });

  it("permite ocultar secciones y limita su longitud", () => {
    expect(
      certificateTextInputSchema.safeParse({
        ...DEFAULT_CERTIFICATE_TEXTS,
        participation: "",
      }).success,
    ).toBe(true);
    expect(
      certificateTextInputSchema.safeParse({
        ...DEFAULT_CERTIFICATE_TEXTS,
        participation: "x".repeat(241),
      }).success,
    ).toBe(false);
  });
});
