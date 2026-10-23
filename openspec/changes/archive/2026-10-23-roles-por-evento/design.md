## Context

Ver `proposal.md` para la motivación. `administradores` es una colección de autenticación cuyo único rol actual es `admin`; `loginAction` y `getAuthenticatedAdmin` rechazan otros valores. La cookie conserva identidad durante ocho horas y la sesión ya revalida la cuenta con PocketBase. Las acciones usan `requireAdmin`, pero los servicios acceden mediante `cuentas_servicio`, con permisos amplios.

El panel incluye configuración, modalidades, disertantes compartidos, acreditación, exposiciones, certificados, materiales y reportes. Existen rutas administrativas de exportación, descarga y previsualización fuera del layout. `createWalkIn` y `registerWithModality` admiten `allowOverCapacity`; el cupo actual cuenta inscripciones públicas y las altas presenciales reciben número cero. Las modalidades usan un bloqueo de operación por evento, mientras el alta presencial heredada no lo utiliza.

## Goals / Non-Goals

**Goals:**
- Centralizar decisiones de permisos y verificar pertenencia antes de acceder a datos con la cuenta de servicio.
- Preservar identificadores de usuarios y referencias de auditoría y acreditación.
- Evitar permisos obsoletos en cookies y asegurar el límite presencial del acreditador bajo concurrencia.

**Non-Goals:**
- No introducir un proveedor de identidad nuevo ni delegar creación de eventos, administración general o asignaciones a los equipos de evento.
- No cambiar reglas públicas de inscripción ni acceso de asistentes a sus descargas.
- No permitir a acreditadores editar datos de inscripciones existentes; mantienen marcado y desmarcado de asistencia como parte de la operatoria actual.

## Decisions

### Identidad y asignaciones separadas

Conservar `administradores`: `role=admin` sigue representando administración general; agregar `role=personal` para cuentas operativas. Crear `asignaciones_evento` con relaciones obligatorias `usuario` y `evento`, rol `administrador_evento|acreditador` e índice único `(usuario, evento)`. El rol de evento pertenece a la asignación, de modo que una persona puede administrar A y acreditar B. Un rol global por persona impediría ese caso.

Proponer pantalla global de personal para crear cuentas operativas y una sección Equipo en cada evento para asignar cuentas existentes, cambiar el rol y revocar. Ambas requieren administrador general; no se agrega una interfaz para conceder nuevos administradores generales en este alcance. Las contraseñas iniciales se ingresan en un formulario protegido, se entregan al mecanismo de autenticación de PocketBase y nunca se registran en auditoría. No se incorpora envío de invitaciones por correo.

Ampliar las reglas solo para que la cuenta de servicio gestione personal y asignaciones; mantener a cuentas operativas sin lectura o escritura directa de datos administrativos. Restringir la actualización propia para que no permita modificar `role` ni convertirse en administrador general. Mantener intacto el aislamiento de `cuentas_servicio`. La alternativa de dar a `personal` la regla protegida actual concedería permisos excesivos y se descarta.

### Política de autorización central

Separar autenticación de autorización en `lib/auth/`. Resolver la cuenta vigente en cada solicitud y consultar asignación por evento para las operaciones limitadas; no persistir permisos o listas de eventos como fuente de verdad en la cookie. Mantener una función explícita de administrador general y agregar comprobaciones por capacidad/evento. La cuenta general existente obtiene todas las capacidades de evento.

| Operación | General | Administrador asignado | Acreditador asignado |
| --- | --- | --- | --- |
| Crear eventos, tipos globales, personal y asignaciones | Sí | No | No |
| Configuración, modalidades, disertantes, exposiciones | Sí | Sí | No |
| Certificados, materiales, reportes y exportaciones | Sí | Sí | No |
| Editar inscripciones existentes | Sí | Sí | No |
| Buscar inscripciones y marcar/desmarcar asistencia | Sí | Sí | Sí |
| Inscribir presencialmente con cupo | Sí | Sí | Sí |
| Confirmar excepción de cupo existente | Sí | Sí | No |

Filtrar `Mis eventos` por asignaciones en el servidor; personal sin asignaciones ve un estado vacío. El acreditador entra a acreditación y solo recibe esa navegación. Aplicar controles dentro de cada página, Server Action y Route Handler: los layouts y los botones no bastan. Una autorización inexistente devuelve una respuesta sin datos; una sesión ausente dirige al ingreso. Mantener control de autorización fuera de los bloques que convierten errores de dominio en mensajes genéricos.

### Pertenencia de recursos y disertantes compartidos

Validar el evento real de inscripciones, modalidades, exposiciones, certificados, archivos y relaciones antes de ejecutar una operación o descargar. Comprobar también el evento de origen al copiar modalidades. Para disertantes compartidos, permitir al administrador asignado editar los datos propios de la participación en su evento mediante una copia local del perfil: crear la copia y cambiar la relación en un batch atómico bajo el bloqueo del evento, conservando la foto si no se adjunta otra. Reservar al general modificaciones globales del perfil que afecten eventos ajenos. Rechazar identificadores ajenos aunque acompañen un `eventId` autorizado.

### Alta presencial con disponibilidad efectiva

Derivar `allowOverCapacity` del permiso actual en el servidor y de la confirmación explícita, nunca solo del formulario. Un acreditador recibe rechazo de cupo sin opción de excepción. Reutilizar el formulario y las validaciones actuales para altas y modalidades.

Para este rol, calcular disponibilidad contra las inscripciones principales que consumen lugar, tanto públicas como presenciales; en eventos heredados sin modalidades cada inscripción consume uno. En modalidades, contar altas principales, no duplicar integrantes vinculados; conservar la semántica vigente de un lugar por inscripción principal. El cupo ilimitado no impone techo.

Extender el bloqueo de operación por evento al alta presencial heredada y usar el mismo bloqueo en el alta pública heredada que compite por esos lugares; las modalidades ya utilizan el bloqueo. Releer la ocupación y validar dentro del bloqueo antes de persistir. Una excepción administrativa puede superar el cupo como hoy, pero esa ocupación impide nuevas altas de acreditadores hasta que haya disponibilidad. Conservar números de cupo públicos y origen presencial, sin reasignar registros históricos.

### Auditoría y compatibilidad

Reutilizar `auditoria` y `acreditado_por`, que ya relacionan `administradores`. Auditar creación operativa, altas, cambios y revocaciones de asignación con actor y destino sin credenciales. Conservar sesiones existentes por su identidad y leer el rol vigente desde la base. Adaptar los tests que actualmente simulan únicamente `requireAdmin` para distinguir identidad, alcance y capacidad.

## Risks / Trade-offs

- [Una entrada administrativa mantiene el control general antiguo] → Inventariar todas las páginas, acciones y rutas; probar accesos directos y recursos cruzados con dos eventos.
- [La cuenta de servicio evade restricciones de usuario] → Autorizar antes de invocarla y probar que la operación de servicio no se ejecuta ante denegación.
- [Revocación con página abierta] → Consultar permisos por solicitud, sin caché compartida de autorizaciones; probar la siguiente mutación con la misma cookie.
- [Perfil de disertante compartido] → Separar participación local de perfil global para que una edición local no modifique eventos ajenos.
- [Cupo heredado solo público] → Añadir validación presencial efectiva y pruebas concurrentes sin alterar la política pública ni renumerar cupos históricos.
- [Migración incompleta] → Denegar acceso operativo ante errores de esquema; conservar administración general y no convertir cuentas existentes.

## Migration Plan

1. Preparar migración aditiva e idempotente de rol operativo, reglas y asignaciones, junto con actualización del esquema declarativo. Probarla contra una base local aislada con usuarios y registros históricos.
2. Registrar copia de seguridad y comprobar reglas y relaciones en el entorno de destino antes de ejecutar la migración; aplicar cambios persistentes únicamente dentro de la autorización correspondiente.
3. Desplegar los controles del servidor y las pantallas. Verificar una cuenta general, una administradora de A y acreditadora de B, y otra cuenta sin asignaciones.
4. El administrador general crea las cuentas reales y asigna su equipo desde la aplicación. No crear usuarios reales ni enviar mensajes durante la preparación.
5. Ante rollback, volver a la versión anterior de aplicación que solo admite `admin`: las cuentas operativas quedan sin ingreso, mientras los generales conservan acceso. Mantener la tabla y el rol nuevos para conservar auditoría y evitar pérdida de datos; no ensanchar reglas ni convertir personal en generales.
