# Arquitectura de Eventos UNCA

Abrir `eventos.html` en un navegador. Arquitectura revisada el 30 de septiembre de 2026 sobre el código local, con HEAD `ef6c1a272641ef26c0eff4f33ef20cf27968c244`. El diagrama describe módulos y relaciones del repositorio; no verifica el despliegue ni la disponibilidad de servicios externos.

El contenido está en español. Los controles fijos del visor y su atributo HTML lang usan el fallback en inglés de Archify.

## Alcance y fuentes

| Componente | Archivos del proyecto |
| --- | --- |
| Catálogo, evento público y panel | `app/page.tsx`, `app/[slug]/page.tsx`, `app/admin/`, `components/` |
| Entradas del servidor | `app/actions/`, `app/api/admin/` |
| Sesión administrativa | `app/actions/auth.ts`, `lib/auth/session.ts`, `lib/auth/session-token.ts` |
| Servicios de gestión | `lib/services/events.ts`, `event-types.ts`, `speakers.ts`, `registrations.ts`, `audit.ts` |
| Validación, cupos, métricas y CSV | `lib/domain/` |
| Cliente y esquema de PocketBase | `lib/pocketbase/client.ts`, `factory.ts`, `schema.ts` |
| Generación de certificados | `lib/services/certificates.ts`, `lib/certificates/pdf.ts`, `assets/certificates/` |
| Consulta por DNI y límites | `app/actions/public-certificates.ts`, `lib/services/certificate-lookup.ts`, `lib/certificates/public-access.ts` |
| Recursos del asistente | `app/mis-certificados/`, `lib/services/participant-resources.ts`, `lib/services/materials.ts` |
| Descargas | `app/api/certificados/[id]/route.ts`, `app/api/materiales/[id]/route.ts`, `lib/material-download.ts` |
| MCP local | `mcp/pocketbase-server.ts`, `mcp/pocketbase-core.ts` |
| Configuración operativa | `README.md`, `scripts/setup-pocketbase.ts`, `scripts/setup-materials.ts`, `scripts/import-pocketbase-schema.ts`, `nixpacks.toml` |

Las flechas de invocación y acceso señalan al componente consultado; las respuestas están implícitas. La relación «Autoriza IDs» representa la autorización temporal transportada en una cookie, no una llamada directa entre procesos. Todos los módulos encerrados en el límite Next.js pertenecen a la misma aplicación.

## Flujos actuales

- El navegador accede a Next.js mediante páginas, Server Actions y rutas API. El acceso a PocketBase permanece en el servidor, normalmente mediante una cuenta técnica derivada y las reglas de las colecciones.
- El panel gestiona tipos de eventos, eventos, perfiles reutilizables de disertantes, participaciones, inscripciones, acreditación, materiales y certificados. Los reportes usan las inscripciones y permiten exportar CSV.
- La generación de PDF ocurre durante la acción administrativa y guarda el archivo en PocketBase. La plantilla puede ser personalizada; el diseño predeterminado incorpora recursos institucionales y firmas.
- El portal busca por DNI normalizado, sin solicitar email. Comprueba las inscripciones acreditadas y firma sus IDs en una cookie HttpOnly de diez minutos. Persiste el límite de cinco intentos por combinación de origen y DNI en quince minutos mediante una clave HMAC.
- Los asistentes acreditados pueden consultar materiales aunque no tengan certificado emitido. Las descargas revalidan la acreditación y el alcance de la autorización. Next.js devuelve el archivo sin caché; para materiales obtiene el token de archivo y transmite el contenido sin exponerlo al navegador.
- El login acepta administradores y contempla un acceso alternativo mediante superusuario asociado a un registro administrador. La sesión administrativa es una cookie JWE de ocho horas; cada comprobación consulta el registro y su rol con la cuenta técnica. No se usa authRefresh para mantener la sesión.

La consulta inicial por DNI y la validación administrativa también acceden a PocketBase. Se documentan aquí para evitar agregar conexiones repetidas al mapa de alto nivel.

## Persistencia y operación

El esquema contiene administradores, cuentas_servicio, tipos_evento, eventos, disertantes, participaciones_disertantes, inscripciones, auditoria, certificados, materiales_evento, limites_consulta_certificados y envios_certificados. Esta última colección conserva historia: la aplicación ya no genera ni procesa envíos de correo.

Los archivos utilizan el almacenamiento configurado en PocketBase; el README admite local o S3 para materiales. El diagrama no supone qué almacenamiento está activo. El aprovisionamiento y las migraciones se ejecutan por scripts separados con credenciales administrativas.

El README describe Node 22 y Nixpacks en Dokploy. El MCP de PocketBase es un proceso local por stdio para herramientas de desarrollo; usa autenticación administrativa y restringe las colecciones permitidas. No forma parte del recorrido de las solicitudes web.

## Archivos y comprobación

- `eventos.architecture.json`: especificación editable de Archify.
- `eventos.html`: diagrama autónomo generado.
- `eventos.delivery.json`: SHA-256 y tamaño de la especificación y el HTML; 9/9 validaciones showcase, sin errores ni advertencias.
- `eventos.visual-check.json`: evidencia automática de Chrome en cuatro resoluciones, desde 1440×900 hasta 2048×1320.
- `eventos.visual-check.html`: galería de capturas en ambos temas.
- `eventos.review.json`: revisión visual complementaria, alcance y limitaciones.
