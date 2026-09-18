## Why

La organización necesita centralizar la publicación de eventos, la inscripción de asistentes, la acreditación presencial y la entrega de certificados. Hoy no existe en el proyecto un flujo que controle cupos, evite duplicados, registre asistencia y produzca información confiable para los administradores.

## What Changes

- Incorporar autenticación y un panel privado para administradores.
- Permitir crear y administrar múltiples eventos, sus datos, cupos y estado de inscripción.
- Publicar un formulario sin cuenta para que cada asistente se inscriba con nombres, apellidos, email y documento.
- Cerrar automáticamente la inscripción pública al completar el cupo y permitir que un administrador la cierre o reabra mediante el ajuste del cupo.
- Impedir inscripciones públicas duplicadas por documento dentro de un mismo evento.
- Permitir acreditar asistentes inscriptos y registrar asistentes presenciales, incluso por encima del cupo, dejando trazabilidad del alta administrativa.
- Generar certificados PDF configurables por evento únicamente para asistentes acreditados, previsualizarlos y enviarlos por email con seguimiento y reintentos.
- Mostrar estadísticas y permitir la consulta y exportación CSV de inscriptos, acreditados, ausentes y altas presenciales.
- Mantener las reglas de negocio, validaciones y autorizaciones en Next.js; PocketBase actuará como servicio de autenticación, persistencia y archivos, sin acceso directo desde el navegador.

## Capabilities

### New Capabilities

- `administracion-de-eventos`: autenticación administrativa y gestión del ciclo de vida, cupo y publicación de eventos.
- `inscripcion-publica`: formulario público, validaciones, control de cupo, prevención de duplicados y confirmación de inscripción.
- `acreditacion-de-asistentes`: consulta, acreditación y alta presencial con trazabilidad y excepción administrativa al cupo.
- `certificados-de-asistencia`: configuración, vista previa, generación PDF, envío y reenvío de certificados a personas acreditadas.
- `reportes-de-eventos`: métricas operativas, segmentación de participantes y exportación de listados.

### Modified Capabilities

No hay capacidades existentes que modificar.

## Impact

- Se reemplazará la página inicial de Next.js por la experiencia pública y el panel administrativo.
- Se incorporarán rutas, Server Actions o Route Handlers, servicios de dominio y controles de acceso ejecutados exclusivamente en Next.js.
- Se integrará el SDK de PocketBase mediante clientes aislados por solicitud y credenciales almacenadas solo en variables de entorno del servidor.
- Se definirán colecciones de PocketBase para administradores, eventos, inscripciones, acreditaciones y trabajos de certificados/email.
- Se incorporarán generación de PDF, proveedor de correo y procesamiento idempotente de trabajos en segundo plano.
- El despliegue deberá configurar la URL de PocketBase, credenciales de servidor, secretos de sesión y credenciales del proveedor de correo.
