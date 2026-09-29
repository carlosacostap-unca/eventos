## Why

Las charlas necesitan compartir diapositivas, imágenes y documentos con sus asistentes acreditados desde el mismo portal donde consultan el certificado.

## What Changes

- Agregar una sección administrativa de materiales por evento, con carga, listado, descarga y eliminación.
- Guardar los archivos en el storage de PocketBase con protección de acceso.
- Mostrar los materiales al consultar el DNI de una inscripción acreditada, aun antes de emitir el certificado.
- Comprobar nuevamente acreditación y evento en cada descarga de material o certificado.

## Capabilities

### New Capabilities
- `materiales-para-asistentes`: Adjuntos por evento y descarga restringida a asistentes acreditados.

### Modified Capabilities

Ninguna de las especificaciones principales existentes.

## Impact

Nueva colección `materiales_evento`, comando de actualización acotada `schema:materials`, formularios administrativos, rutas de descarga y ampliación de la autorización temporal del portal. Las sesiones anteriores basadas en certificados conservan compatibilidad. No cambia la forma de configurar el storage ni las credenciales.
