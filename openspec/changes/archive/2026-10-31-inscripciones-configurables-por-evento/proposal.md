## Why

La aplicación utiliza un formulario fijo y un certificado individual por inscripción. Una jornada necesita distinguir asistentes de expositores, vincular al alumno con su director y codirector y entregar a esos integrantes un mismo PDF condicionado a la acreditación del alumno; resolverlo con configuración reutilizable permitirá atender futuros eventos con particularidades propias.

## What Changes

- Configurar modalidades por evento, con nombre, disponibilidad, formulario, integrantes vinculados y política de certificación; conservar «Asistente» como modalidad predeterminada de los eventos existentes.
- Mantener apellido, nombre, DNI y email como identidad obligatoria; añadir campos tipados, secciones, orden, obligatoriedad y grupos con cardinalidad configurables. El teléfono será un campo adicional disponible, sin exigirlo en esta jornada según la definición final.
- Ofrecer la configuración reutilizable «Asistente» y «Expositor con dirección»: alumno obligatorio, un director obligatorio y hasta un codirector opcional, todos con los cuatro datos de identidad.
- Registrar a cada integrante como participante del evento y expositor desde la inscripción del alumno; permitir acreditación individual y una sola identidad/modalidad por DNI y evento, incluso cuando un director participa en varias exposiciones.
- Emitir certificados individuales de asistencia o un certificado compartido por exposición, con todos sus integrantes. El PDF compartido se habilita para todos únicamente cuando el alumno está acreditado, independientemente de la presencia del director o codirector.
- Configurar entrega, plantilla, textos, vista previa y regla de habilitación por modalidad. Preservar PDFs existentes y exigir regeneración explícita para reemplazarlos.
- Adaptar acreditación, edición, listados, estadísticas, exportación y consulta pública a modalidades, vínculos y certificados compartidos, sin otorgar acceso a materiales por la acreditación de otra persona.
- Versionar las configuraciones utilizadas, copiar configuraciones entre eventos y migrar de forma aditiva los datos existentes.

## Capabilities

### New Capabilities

- `modalidades-y-formularios-por-evento`: administración y reutilización de modalidades, formularios tipados, versiones y configuración de certificación.
- `participantes-y-exposiciones`: inscripción individual o grupal consistente, exclusividad por documento, vínculos, cupo, acreditación y operación por modalidad.
- `certificados-por-modalidad`: emisión individual o compartida, elegibilidad por responsable, descarga por integrantes y compatibilidad con certificados existentes.
- `reportes-por-modalidad`: consulta, métricas y exportaciones que distinguen personas únicas, exposiciones, modalidades y acreditación.

### Modified Capabilities

- `edicion-datos-acreditacion`: corrección de identidad y respuestas conservando modalidad, vínculos, cupo y asistencia; control del impacto en certificados compartidos.
- `materiales-para-asistentes`: separar autorización de materiales por acreditación propia de autorización de certificados compartidos por acreditación del alumno vinculado.

## Impact

- Dominio y PocketBase: `lib/domain/models.ts`, `lib/pocketbase/schema.ts`, migraciones aditivas de modalidades/versiones, exposiciones, integrantes y destinatarios de certificados; conservar unicidad de DNI por evento.
- Administración y formularios públicos: `components/event-form.tsx`, `components/registration-form.tsx`, edición, alta presencial y acciones/servicios de eventos e inscripciones.
- Acreditación y reportes: páginas administrativas, `lib/domain/csv.ts` y ruta de exportación.
- Certificados y portal: `lib/services/certificates.ts`, `lib/certificates/pdf.ts`, textos, recursos del participante, consulta pública y rutas de descarga.
- Pruebas de dominio, servicios, acciones, integración transaccional y recorridos de navegador. Se reutilizan Next.js, Zod, PocketBase y pdf-lib.
- El cambio activo `gestion-integral-de-eventos` contiene antecedentes aún no archivados de inscripción, acreditación, reportes y certificados; se documentará su reconciliación antes de archivar para no restaurar reglas anteriores. Esta propuesta no altera sus archivos ni implementa código.
