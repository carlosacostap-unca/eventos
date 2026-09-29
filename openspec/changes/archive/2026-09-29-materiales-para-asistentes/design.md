## Context

Las charlas usan el modelo de eventos existente. El portal público consulta por DNI y utiliza una autorización firmada de diez minutos. Antes, solo podía iniciar una consulta cuando existía un certificado emitido.

## Goals / Non-Goals

Permitir adjuntar múltiples materiales y descargarlos desde la acreditación, incluso en eventos sin certificados. No publicar archivos en la agenda abierta, cambiar el proveedor de almacenamiento ni generar certificados al cargar materiales.

## Decisions

- Colección propia vinculada al evento con título, nombre original, tamaño y archivo protegido. PocketBase utiliza su almacenamiento configurado, local o S3.
- Carga individual de hasta 25 MB por archivo, con extensiones permitidas para imágenes, PDF, Office y OpenDocument; límite multipart de 27 MB.
- Acciones administrativas autenticadas y auditoría de alta/eliminación. La eliminación quita el registro y su archivo mediante PocketBase.
- Autorización temporal que incluye IDs de inscripciones acreditadas. Se conservan tokens antiguos basados en certificados durante su vigencia.
- La consulta y cada descarga verifican la acreditación actual. Los materiales se autorizan por inscripción y evento; los certificados además por su inscripción asociada.
- Descarga transmitida por el servidor como adjunto binario, sin caché ni exposición del token de archivo de PocketBase.

## Risks / Trade-offs

La consulta mantiene el mecanismo existente basado solo en DNI y su límite de intentos. El control de tipo de archivo usa la extensión; los adjuntos no se ejecutan ni renderizan en línea. Cada material se carga por separado. El proxy del despliegue debe admitir 27 MB de solicitud.

## Migration Plan

Ejecutar `npm run schema:materials` antes de desplegar el código. La importación se limita a `materiales_evento` sin eliminar otras colecciones. Se verificó su aplicación y protección contra el PocketBase configurado. Para revertir la interfaz, conservar los archivos y la colección; no se necesita borrar materiales.

## Validation

Pruebas de carga, tipos y tamaños, autenticación, alcance por evento, asistencia revocada, tokens vencidos y compatibilidad con certificados anteriores. Prueba real de storage con datos ficticios temporales: subida, bloqueo de acceso directo, descarga autorizada sin certificado y revocación. Revisión en navegador de la carga administrativa y de la consulta y descarga del asistente en móvil.
