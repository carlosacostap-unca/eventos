# Roles y equipos de eventos

Las cuentas existentes con `role=admin` conservan la administración general. Las cuentas nuevas de personal ingresan por `/iniciar-sesion` y reciben permisos mediante asignaciones individuales a eventos.

| Operación | Administrador general | Administrador de evento | Acreditador |
| --- | --- | --- | --- |
| Crear eventos, gestionar tipos y personal | Sí | No | No |
| Asignar, cambiar o quitar roles por evento | Sí | No | No |
| Consultar nombres en Inscritos | Todos | Asignados | No |
| Configurar evento, modalidades y disertantes | Todos | Asignados | No |
| Certificados, materiales, reportes y exportaciones | Todos | Asignados | No |
| Corregir datos de inscripciones existentes | Todos | Asignados | No |
| Revisar y corregir datos personales al acreditar por DNI | Todos | Asignados | Asignados |
| Buscar inscriptos y marcar/desmarcar asistencia | Todos | Asignados | Asignados |
| Inscribir y acreditar personas nuevas con cupo | Todos | Asignados | Asignados |
| Confirmar una excepción administrativa de cupo | Sí | Sí | No |

Una persona puede administrar un evento y acreditar en otro. Al quitarle una asignación, su siguiente solicitud pierde el acceso, aunque conserve la sesión abierta. Una cuenta operativa sin asignaciones ve un listado vacío.

## Preparación del esquema

La migración es aditiva: amplía los roles de `administradores` y crea `asignaciones_evento` con una asignación única por persona y evento. Mantiene identificadores, cuentas generales, inscripciones y referencias históricas. Las reglas impiden que el personal cambie su rol o modifique asignaciones directamente en PocketBase.

Preparar un respaldo de PocketBase antes de aplicar cambios en el entorno de destino. Verificar que las variables del proceso apunten al entorno previsto. El esquema de modalidades y bloqueos de operación del proyecto debe estar actualizado.

```powershell
# Inspección: no modifica el esquema ni los registros.
npm run schema:event-roles

# Aplicación de la migración al entorno configurado, después de revisar la inspección.
npm run schema:event-roles -- --apply
```

La migración puede repetirse sin duplicar asignaciones ni cambiar cuentas. No crea personal real, no modifica contraseñas existentes y no envía mensajes. El esquema declarativo de instalaciones nuevas incluye los mismos cambios.

Desplegar el código junto con el esquema actualizado. La implementación se verificó primero en una base local aislada. El 23 de octubre de 2026 se aplicó y verificó la migración en la base real de Eventos: se conservaron las 4 cuentas administrativas, los 8 eventos, las 286 inscripciones y los 185 certificados existentes. La colección de asignaciones quedó inicialmente vacía; las personas y sus roles se asignan desde el panel.

El respaldo previo a la primera aplicación es `pre_roles_por_evento_20261023115325.zip` (3.239.574 bytes), conservado en PocketBase y descargado a `output/production-migration/pre_roles_por_evento_20261023115325/`, fuera de Git. La verificación posterior confirmó los campos, reglas, relaciones e índice único; también el acceso general y de servicio y la repetición sin cambios funcionales. PocketBase actualiza el metadato `updated` del esquema al reimportarlo, por lo que la comparación de repetición excluye únicamente las fechas técnicas de las colecciones.

## Operación desde el panel

1. Ingresar como administrador general y abrir **Personal**.
2. Crear la cuenta con nombre, email y contraseña inicial de al menos 12 caracteres. Comunicar las credenciales por un canal privado.
3. Abrir el evento y entrar en **Equipo**.
4. Elegir la persona y su rol en ese evento. Guardar la asignación.
5. Para cambiar el rol, guardar el nuevo rol de esa persona; para revocar, usar **Quitar acceso a este evento**.

Los administradores de evento reciben las secciones administrativas de sus eventos. La pestaña **Inscritos**, inmediatamente después de **Resumen**, muestra únicamente apellido y nombre de las personas inscritas, en orden alfabético. Los acreditadores ingresan directamente a acreditación, pueden registrar llegadas, corregir los datos personales durante esa confirmación e inscribir personas nuevas. La edición general de inscripciones, las respuestas de trabajos, la emisión de certificados y la administración general conservan sus permisos anteriores.

### Acreditación rápida por DNI

El botón **Acreditar por DNI** del resumen abre `/admin/eventos/[id]/acreditacion`. La búsqueda exacta por DNI normalizado consulta únicamente ese evento; admite puntos y espacios. Primero muestra los datos personales para revisar, luego permite corregirlos y confirmar la asistencia en una sola actualización. Si la persona ya estaba acreditada, se informa y se conserva la fecha y el operador originales. Las correcciones no cambian modalidad, trabajos, integrantes ni cupos.

Cuando no hay coincidencia se ofrece el alta presencial con el DNI precargado, las modalidades y los campos configurados del evento. Confirmar el alta también acredita a la persona principal. Los cupos y las excepciones administrativas mantienen su política vigente: no se liberan lugares de personas ausentes automáticamente. Una falla de conexión requiere reintentar la búsqueda y nunca se interpreta como DNI inexistente.

**Pasar la tablet · Autoservicio** oculta la navegación y mantiene el mismo flujo bajo la sesión del equipo, para entregar temporalmente el dispositivo. No constituye una sesión pública ni un bloqueo del dispositivo. Al terminar se muestra una confirmación y se limpia la pantalla a los 8 segundos, o de inmediato con **Acreditar a otra persona**. Después de 90 segundos sin actividad también se limpia; no se interrumpen solicitudes pendientes. El listado operativo anterior queda en `/admin/eventos/[id]/acreditacion/listado`.

El acreditador no puede confirmar excepciones de cupo. Para sus altas se cuentan inscripciones principales públicas y presenciales; los integrantes vinculados mantienen la política vigente de cupo por inscripción principal. Los eventos con cupo ilimitado permiten nuevas altas. El control se repite dentro del bloqueo por evento para impedir que dos altas presenciales obtengan el último lugar. La inscripción pública conserva su política de cupo público existente.

Cuando un administrador de evento edita un disertante, se crea una copia local del perfil y se actualiza su participación en ese evento. Los perfiles de los otros eventos no cambian. El administrador general mantiene la edición global habitual.

## Reversión

Se puede volver a la versión anterior de la aplicación, que solo admite cuentas `admin`. Las cuentas operativas quedan sin ingreso y las cuentas generales conservan su acceso. Mantener la colección de asignaciones y los nuevos valores de rol para preservar datos y auditoría. No convertir personal en administradores generales ni ampliar sus reglas como mecanismo de reversión.

## Verificación

Se usó PocketBase local en `http://127.0.0.1:8099` con datos y credenciales exclusivamente sintéticos, separados de `.env.local`. Las pruebas de roles exigen tanto esa URL como la contraseña de prueba antes de escribir.

```powershell
$env:POCKETBASE_URL='http://127.0.0.1:8099'
$env:POCKETBASE_ADMIN_EMAIL='test-admin@example.com'
$env:POCKETBASE_ADMIN_PASSWORD='TestOnly-Roles-2026!'
$env:SESSION_SECRET='local-only-roles-session-secret-2026-32chars'
$env:RUN_EVENT_ROLES_INTEGRATION='1'
npm test -- tests/event-roles.integration.test.ts
```

La base debe tener creado el superusuario de prueba y estar vacía o ser descartable: esta suite prepara el esquema anterior de identidad para verificar la migración dos veces. No usarla en una base con información real.

Resultados del desarrollo:

- Diez pruebas de integración de roles aprobadas: compatibilidad de ingreso, combinación de roles, revocación, denegaciones directas, cuentas sin asignaciones, duplicados, auditoría, cupos y edición local de disertantes.
- Suite existente con integración habilitada: 184 pruebas aprobadas; las diez pruebas de roles se ejecutaron por separado.
- ESLint y TypeScript aprobados.
- Build de producción aprobado con `npm run build -- --webpack`. El build predeterminado con Turbopack falló por su proceso interno de CSS en este entorno; no fue un error de TypeScript ni de las rutas nuevas.
- Revisión con Playwright en escritorio y móvil: Personal, Equipo, listado filtrado y acreditación, incluyendo marcado de llegada, alta presencial y mensaje de cupo completo. Capturas sintéticas en `output/playwright/roles-*.png` (archivos locales ignorados por Git).
