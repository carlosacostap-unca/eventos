# Arquitectura de Eventos UNCA

Abrir `eventos.html` en un navegador. El diagrama representa el código local revisado el 16 de septiembre de 2026, incluidos los cambios sin commit. No acredita que los servicios externos estén desplegados.

El contenido está en español. Los controles fijos del visor y su atributo HTML lang usan el fallback en inglés de Archify.

## Alcance y fuentes

| Componente | Archivos del proyecto |
| --- | --- |
| Páginas públicas, formularios y panel | `app/page.tsx`, `app/eventos/[slug]/page.tsx`, `app/admin/`, `components/` |
| Entradas del servidor | `app/actions/`, `app/api/admin/` |
| Sesión administrativa | `app/actions/auth.ts`, `lib/auth/session.ts`, `lib/auth/session-token.ts` |
| Eventos, inscripciones, acreditación y auditoría | `lib/services/events.ts`, `lib/services/registrations.ts`, `lib/services/audit.ts` |
| Validación, cupos, métricas y CSV | `lib/domain/` |
| Cliente y esquema de PocketBase | `lib/pocketbase/client.ts`, `lib/pocketbase/factory.ts`, `lib/pocketbase/schema.ts` |
| Certificados PDF | `lib/services/certificates.ts`, `lib/certificates/pdf.ts` |
| Procesamiento y SMTP | `app/api/internal/certificados/procesar/route.ts`, `lib/email/queue.ts`, `lib/email/mailer.ts` |
| Configuración operativa | `README.md`, `scripts/setup-pocketbase.ts`, `nixpacks.toml` |

Las flechas representan invocaciones o accesos iniciados por el origen; las respuestas están implícitas. Los servicios de negocio y el procesador de correo son módulos del mismo servidor Next.js. El login y la renovación del token acceden directamente a PocketBase desde la capa de autenticación; se resumen en la tarjeta de acceso para mantener el mapa legible.

PocketBase contiene siete colecciones: administradores, cuentas_servicio, eventos, inscripciones, auditoria, certificados y envios_certificados. La cola es esta última colección. El procesador consulta pendientes, obtiene el PDF, envía con Nodemailer y guarda el resultado e historial. El panel permite reencolar fallos.

La generación de PDF ocurre durante la acción administrativa; únicamente el envío queda pendiente. El programador externo debe configurarse para invocar el endpoint protegido. El esquema se aprovisiona por separado mediante `npm run schema:apply`, usando credenciales administrativas. Las operaciones habituales utilizan una cuenta técnica con reglas de colección.

## Archivos y comprobación

- `eventos.architecture.json`: especificación editable de Archify.
- `eventos.html`: diagrama autónomo generado.
- `eventos.delivery.json`: comprobante de entrega con SHA-256 y tamaño de especificación y HTML; 9/9 validaciones showcase, 0 errores y 0 advertencias.
- `eventos.visual-check.json`: evidencia automática en Chrome a 1440×900, 1600×1000, 1920×1080 y 2048×1320; sin desbordamiento.
- `eventos.visual-check.html`: galería de capturas en ambos temas.
- `eventos.review.json`: revisión perceptual complementaria de las capturas; no sustituye la evidencia automática.
