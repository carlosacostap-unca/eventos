## Why

Actualmente cualquier cuenta administrativa accede a toda la plataforma. Se necesita delegar la gestión y la recepción de asistentes sin dar acceso a eventos ajenos ni a la administración general.

## What Changes

- Conservar el administrador actual como administrador general de la plataforma, con todos sus permisos.
- Incorporar asignaciones por usuario y evento con rol de administrador de evento o acreditador; una persona puede trabajar en varios eventos y tener un rol diferente en cada uno.
- Permitir únicamente al administrador general gestionar cuentas operativas y asignar, cambiar o revocar esos roles desde cada evento.
- Permitir al administrador de evento gestionar las secciones actuales de sus eventos asignados, incluida acreditación, sin gestionar usuarios, asignaciones, tipos globales ni crear eventos nuevos.
- Dar al acreditador acceso a la búsqueda de inscripciones, registro de asistencia y alta presencial con cupo disponible de sus eventos asignados.
- Aplicar autorización en el servidor a páginas, acciones, descargas y exportaciones, además de adaptar la navegación y el listado de eventos.
- Impedir al acreditador superar cupos, incluso manipulando formularios. Mantener las excepciones administrativas actuales para administradores autorizados.
- Conservar las cuentas generales existentes, las inscripciones, las modalidades y los accesos públicos.

## Capabilities

### New Capabilities

- `acceso-por-evento`: identidad del personal, permisos por evento, asignaciones exclusivas del administrador general y restricciones de acreditación y alta presencial.

### Modified Capabilities

- `edicion-datos-acreditacion`: precisar que la edición corresponde al administrador general o al administrador asignado al evento.
- `materiales-para-asistentes`: restringir la gestión administrativa de archivos a administradores autorizados para el evento.

## Impact

- Autenticación y sesión en `lib/auth/`, ingreso en `app/actions/auth.ts` y esquema/migraciones de PocketBase en `lib/pocketbase/` y `scripts/`.
- Panel `app/admin/`, acciones `app/actions/`, rutas `app/api/admin/` y navegación de `components/event-admin-nav.tsx`.
- Servicios de eventos, acreditación, inscripciones presenciales y modalidades; validación de pertenencia de recursos y cupos.
- Nuevas pantallas de personal/asignaciones y pruebas de aislamiento, revocación, compatibilidad y concurrencia de altas.
- La aplicación utiliza una cuenta de servicio con acceso amplio: cada entrada administrativa debe verificar el permiso del usuario antes de utilizarla. Las cuentas operativas no deben recibir acceso directo amplio a PocketBase.
