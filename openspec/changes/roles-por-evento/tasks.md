## 1. Datos y compatibilidad

- [x] 1.1 Agregar rol operativo y colección de asignaciones al esquema declarativo, con relaciones e índice único usuario/evento; verificar pruebas de esquema que preserven `admin`, `service`, auditoría y referencias de acreditación.
- [x] 1.2 Crear migración aditiva e idempotente con reglas para gestión por servicio y protección del rol propio; verificar dos ejecuciones en PocketBase local aislado, rechazo de autoasignación y elevación de rol, y conservación de registros existentes.

## 2. Identidad y autorización

- [x] 2.1 Adaptar ingreso y sesión para cuentas generales y operativas, resolviendo rol vigente sin confiar en permisos guardados en cookie; verificar ingreso de ambos tipos, cuenta inválida y compatibilidad de sesiones generales existentes.
- [x] 2.2 Implementar política central de capacidades y asignaciones por evento, más acceso exclusivo general; verificar matriz general/administrador/acreditador/sin asignación, rol distinto por evento y revocación usando la misma sesión.
- [x] 2.3 Agregar listado administrativo filtrado por asignaciones y estado vacío para personal sin eventos; verificar que las respuestas no contengan eventos ajenos.

## 3. Equipo y personal

- [x] 3.1 Implementar alta de cuentas operativas por administrador general con validación y auditoría sin credenciales; verificar creación válida, email duplicado y rechazo de acciones invocadas por roles operativos.
- [x] 3.2 Implementar gestión de asignaciones y sección Equipo por evento; verificar asignar, cambiar rol, revocar, evitar duplicados y auditar actor, destino, evento y rol.
- [x] 3.3 Adaptar navegación global, enlaces de evento y pantalla de acreditación según capacidades; verificar que acreditadores vean solo sus eventos y operaciones, y que administradores asignados no reciban creación global ni gestión de equipos.

## 4. Protección de operaciones y recursos

- [x] 4.1 Aplicar autorización individual a páginas administrativas, creación/edición de eventos y tipos, acciones de modalidades, exposiciones y configuración; verificar llamadas directas denegadas sin invocar la operación de servicio.
- [x] 4.2 Aplicar controles de evento a acreditación, edición de inscripciones, materiales y certificados; verificar con dos eventos que el acreditador solo pueda buscar, marcar/desmarcar y dar altas, y que recursos ajenos no se puedan consultar ni modificar.
- [x] 4.3 Autorizar reportes, exportaciones, descargas administrativas y previsualización por evento real del recurso; verificar denegaciones con identificadores ajenos, acreditadores y sesiones ausentes, conservando los accesos públicos existentes.
- [x] 4.4 Restringir copia de modalidades al origen y destino autorizados y separar edición de participación de disertante de su perfil global; verificar que un administrador de A no altere perfiles compartidos o información de B.

## 5. Alta presencial y cupo

- [x] 5.1 Derivar permiso de excepción del actor en el servidor y adaptar formularios de altas heredadas y por modalidad; verificar rechazo de acreditadores con `confirmarExcepcion` manipulado y conservación de excepciones explícitas de administradores autorizados.
- [x] 5.2 Implementar ocupación efectiva para acreditadores con principales públicos y presenciales, respetando cupo ilimitado y miembros vinculados; verificar sucesivas altas hasta agotar el cupo, duplicados y preservación del origen y números públicos existentes.
- [x] 5.3 Coordinar altas heredadas públicas/presenciales con el bloqueo por evento y verificar la disponibilidad dentro del bloqueo, manteniendo la coordinación de modalidades; probar dos solicitudes por el último lugar, recuperación ante fallo y que una denegación no deje inscripciones parciales.

## 6. Verificación integral y entrega

- [x] 6.1 Ejecutar la matriz de integración contra base local aislada con dos eventos, roles combinados, cuenta sin asignaciones y revocación con sesión abierta; verificar lecturas, mutaciones, descargas y reglas directas de PocketBase.
- [x] 6.2 Verificar visualmente los flujos de ingreso, personal, Equipo, Mis eventos y acreditación para cada rol en escritorio y móvil; comprobar que los mensajes de cupo y acceso permitan completar las operaciones autorizadas.
- [x] 6.3 Ejecutar las pruebas relevantes y la suite existente, `npm run lint`, `npm run typecheck` y `npm run build`; documentar resultados y cualquier limitación real de entorno.
- [x] 6.4 Documentar migración, creación de cuentas, asignación y revocación de roles y rollback conservando datos; verificar que la guía permita operar sin convertir personal en administradores generales ni modificar la base real durante las pruebas.
