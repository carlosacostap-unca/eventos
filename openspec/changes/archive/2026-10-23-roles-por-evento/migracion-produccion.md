# Migración de la base real

Fecha: 23 de octubre de 2026.

La migración de `roles-por-evento` se aplicó sobre la instancia real configurada para Eventos, después de inspeccionar el esquema y verificar un respaldo descargado.

## Resultado

- Se incorporó `personal` a los roles admitidos en `administradores`, conservando `admin` y los identificadores y credenciales existentes.
- Se configuraron las reglas de usuarios y se creó `asignaciones_evento` con relaciones a usuarios y eventos, roles de administrador de evento y acreditador, y el índice único por usuario/evento.
- Las asignaciones permanecieron vacías: la migración no creó personal ni asignó permisos a personas reales.
- Se verificaron el acceso general existente y la lectura del nuevo esquema mediante la cuenta de servicio.
- Se comprobaron los registros anteriores y los esquemas ajenos a esta migración. Se conservaron 4 cuentas administrativas, 8 eventos, 286 inscripciones y 185 certificados, junto con las otras colecciones.
- La repetición conservó campos, reglas, relaciones e índices y no alteró registros. La fecha técnica `updated` de cada colección puede variar por el comportamiento de importación de PocketBase.
- La comprobación de salud de la API fue satisfactoria después de la migración.

## Respaldo y evidencia local

Respaldo anterior a la primera aplicación: `pre_roles_por_evento_20261023115325.zip`.

- Tamaño: 3.239.574 bytes.
- SHA-256: `49857d16956e05b639f885d14e3b6d73d9cce82905985c241768db8ee30afad9`.
- Copia conservada en PocketBase y en `output/production-migration/pre_roles_por_evento_20261023115325/`.

Se creó además un segundo respaldo de verificación después de la primera aplicación. El informe final está en `output/production-migration/pre_roles_por_evento_20261023115451/verificacion.json` y confirma conservación de registros, acceso general y de servicio, y repetición sin cambios funcionales.

Los respaldos y archivos técnicos de `output/` permanecen excluidos de Git. Este documento contiene únicamente el resumen operativo; no incluye datos personales ni credenciales.
