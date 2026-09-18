## 1. Base técnica y PocketBase

- [x] 1.1 Instalar el SDK de PocketBase, validación de esquemas, generación de PDF y el adaptador de correo, y verificar que `npm install` y `npm run build` finalicen correctamente.
- [x] 1.2 Definir y validar variables de entorno exclusivamente del servidor para PocketBase, sesiones, aprovisionamiento, trabajos internos y correo; verificar que la aplicación falle al iniciar con un mensaje seguro cuando falte una variable obligatoria.
- [x] 1.3 Implementar tipos y modelos de dominio para eventos, administradores, inscripciones, auditoría, certificados y envíos; verificar con pruebas de validación casos válidos y límites inválidos.
- [x] 1.4 Crear un comando idempotente de aprovisionamiento de PocketBase para colecciones, campos, reglas e índices únicos; verificar ejecutándolo dos veces en un entorno de prueba sin duplicar ni eliminar datos.
- [x] 1.5 Implementar clientes PocketBase aislados por solicitud para sesión administrativa y acceso de servicio, sin SDK en módulos cliente; verificar mediante una prueba que dos sesiones concurrentes no compartan autenticación.

## 2. Autenticación y panel administrativo

- [x] 2.1 Implementar inicio y cierre de sesión administrativo con cookie `HttpOnly`, `Secure` y `SameSite=Lax`; verificar credenciales válidas, inválidas y eliminación de sesión.
- [x] 2.2 Implementar la capa de autorización que valida la sesión dentro de cada lectura y mutación privada; verificar que rutas, acciones y descargas rechacen solicitudes anónimas.
- [x] 2.3 Crear la estructura adaptable del panel con navegación, estados de carga, mensajes de error y cierre de sesión; verificar su uso en tamaños móvil y escritorio.

## 3. Administración de eventos

- [x] 3.1 Implementar validaciones y servicios para crear, editar y consultar eventos, incluidos slug único, fechas, lugar, cupo y habilitación; verificar errores de campos y conflictos de slug.
- [x] 3.2 Crear las pantallas administrativas de listado, alta y edición de eventos; verificar que los datos guardados reaparezcan correctamente y que los errores se muestren junto al campo correspondiente.
- [x] 3.3 Implementar el estado efectivo de inscripción combinando habilitación manual, finalización y cupo; verificar cierre anticipado, cierre automático y reapertura al aumentar el cupo.
- [x] 3.4 Registrar en auditoría los cambios sensibles de eventos; verificar actor, fecha, entidad y acción después de crear o modificar un evento.

## 4. Inscripción pública

- [x] 4.1 Crear la página pública por slug con datos del evento y estados disponible, cerrado, completo, finalizado y no encontrado; verificar cada variante con datos controlados.
- [x] 4.2 Implementar normalización y validación del formulario de nombres, apellidos, email y documento; verificar campos vacíos, formatos inválidos y normalización consistente del documento.
- [x] 4.3 Implementar la reserva de número de cupo con restricción única, reintento de colisiones y límite máximo; verificar con solicitudes simultáneas que solo una obtiene el último lugar.
- [x] 4.4 Aplicar unicidad de documento por evento y mensajes seguros para duplicados; verificar que el mismo documento se rechace en un evento y se permita en otro.
- [x] 4.5 Construir la experiencia del formulario y su confirmación sin cuenta; verificar que errores no creen registros parciales y que un alta exitosa no se repita al recargar.

## 5. Acreditación y altas presenciales

- [x] 5.1 Implementar consulta paginada y búsqueda por nombre, apellido, email o documento dentro de un evento; verificar coincidencias parciales y eventos sin resultados.
- [x] 5.2 Implementar acreditación idempotente y corrección de asistencia con fecha, responsable y auditoría; verificar intentos repetidos y revocaciones.
- [x] 5.3 Implementar el alta presencial con validación de duplicados, acreditación inmediata, origen presencial y excepción explícita de cupo; verificar el flujo en un evento completo.
- [x] 5.4 Crear la interfaz operativa de acreditación con búsqueda rápida, estados visibles, confirmación de excepciones y respuesta inmediata; verificar el flujo completo en pantalla móvil.

## 6. Certificados y correo

- [x] 6.1 Implementar carga y configuración de una plantilla por evento, incluyendo validación de formato y dimensiones; verificar rechazo de archivos inválidos y persistencia de una plantilla válida.
- [x] 6.2 Implementar la composición y vista previa PDF con datos de ejemplo; verificar que la vista previa no cree certificados ni trabajos de correo.
- [x] 6.3 Implementar generación idempotente para todas las personas acreditadas y almacenamiento del PDF; verificar que ausentes queden excluidos y que repetir el lote no duplique archivos ni registros.
- [x] 6.4 Implementar la cola persistente de envíos, el adaptador de correo y el procesador interno autenticado por secreto; verificar estados pendiente, enviado y fallido con un proveedor simulado.
- [x] 6.5 Implementar reintentos seguros, descarga y reenvío individual desde el panel; verificar que cada intento conserve historial sin regenerar certificados existentes.
- [x] 6.6 Crear la vista administrativa del lote con progreso y detalle de errores sanitizados; verificar que una falla parcial no marque como enviados los trabajos restantes.

## 7. Estadísticas y exportaciones

- [x] 7.1 Implementar el cálculo de cupo, inscripciones públicas, altas presenciales, acreditados, ausentes y porcentaje de asistencia; verificar resultados para eventos vacíos y con estados mixtos.
- [x] 7.2 Crear el tablero estadístico y el listado filtrable por texto, origen y asistencia; verificar que los contadores y resultados se actualicen con los mismos criterios.
- [x] 7.3 Implementar exportación CSV del listado completo o filtrado con codificación y escape correctos; verificar columnas, acentos, comas, saltos de línea y protección de la descarga.
- [x] 7.4 Registrar las exportaciones en auditoría sin copiar datos personales al registro; verificar actor, evento, filtros y fecha.

## 8. Integración, seguridad y despliegue

- [ ] 8.1 Añadir pruebas integrales del flujo crear evento -> inscribir -> completar cupo -> acreditar -> agregar presencial -> generar certificado -> enviar -> reportar; verificar que el escenario finalice sin accesos directos del navegador a PocketBase.
- [x] 8.2 Revisar caché, mensajes de error y respuestas para evitar exposición de credenciales, tokens o datos personales; verificar con pruebas de rutas públicas y privadas.
- [x] 8.3 Documentar configuración local y de Dokploy, aprovisionamiento, creación del primer administrador, programador del procesador de correo, rotación de secretos y recuperación; verificar las instrucciones en un entorno limpio.
- [x] 8.4 Ejecutar lint, pruebas y build de producción, corregir fallos y verificar que todos finalicen correctamente con Node 22.
- [ ] 8.5 Desplegar primero con inscripciones deshabilitadas, ejecutar una prueba de humo contra PocketBase y el proveedor de correo, y verificar el primer evento de prueba antes de habilitar acceso público.
