# Presentaciones finales por trabajo

La modalidad con código `expositor` permite adjuntar opcionalmente un PDF o PowerPoint (`.pdf`, `.ppt`, `.pptx`) de hasta 25 MB al confirmar o editar una inscripción. El archivo pertenece a la exposición, no a la persona ni al evento completo; cada trabajo de un mismo alumno conserva su propia entrega.

En la página pública del evento, **Subir o reemplazar mi presentación** abre `/<slug>/presentaciones`. La consulta por DNI recupera exclusivamente los trabajos del alumno responsable o del segundo alumno expositor en ese evento. Los directores, codirectores y asistentes no pueden subir archivos de esos trabajos. Se utiliza la consulta limitada por origen y el permiso firmado de 30 minutos ya empleado para editar inscripciones. No se incorporan cuentas nuevas ni se comparte el archivo públicamente.

La entrega separada está disponible mientras el evento conserve estado `publicado`, aun si sus inscripciones están cerradas o no hay cupo. No inscribe personas, cambia integrantes ni acredita asistencia. Al cambiar de estado el evento se bloquean las entregas públicas. No se agrega una fecha límite adicional.

El formulario informa el nombre de la versión actual y permite reemplazarla. Una revisión del contenido detecta si otro alumno reemplazó el archivo desde la consulta y requiere volver a buscar el DNI; reenviar exactamente el mismo contenido y nombre es idempotente. Una subida inválida o una transacción fallida conserva la versión anterior. Las ediciones de respuestas e integrantes sin archivo conservan la entrega. Reemplazarla no invalida los certificados.

Los administradores generales y de evento acceden desde **Exposiciones** al estado de entrega, nombre, tamaño, formato y fecha. Pueden descargar ambos formatos y visualizar PDF en el panel o en otra pestaña. PowerPoint se descarga para abrirlo en una aplicación compatible; no se envían archivos a servicios de conversión externos. Los acreditadores no reciben acceso al archivo.

## Preparación de la base existente

La migración agrega seis campos opcionales a `exposiciones`, conservando registros, relaciones, índices y reglas actuales. `presentacion_final` es un campo de archivo protegido de un solo elemento. Los demás campos conservan nombre original, tamaño, formato, fecha y huella SHA-256. PocketBase usa su almacenamiento de archivos configurado.

Preparar un respaldo de la base de destino y revisar sus variables de conexión antes de aplicar:

```powershell
# Inspección sin modificar el esquema ni los registros.
npm run schema:presentations

# Agrega únicamente los campos faltantes; puede repetirse.
npm run schema:presentations -- --apply
```

Aplicar la migración antes de desplegar el código que recibe archivos. No hace falta modificar los trabajos existentes ni las versiones de los formularios. No ejecutar una importación destructiva para aplicar este cambio.

El 27 de octubre de 2026 se aplicó y verificó esta migración en la base real de Eventos. Se conservaron los 8 eventos, 390 inscripciones, 29 exposiciones, 73 vinculaciones de integrantes y 186 certificados, junto con las modalidades, usuarios, reglas e índices anteriores. La repetición confirmó cero campos pendientes. El respaldo previo verificado es `pre_presentaciones_finales_20261027185103.zip` (3.313.515 bytes, SHA-256 `edddfd03c6d934fa3c5839f8cc124e84dbfdc1052420ad1b7fe64f0ff5cf2948`), conservado en PocketBase y descargado a `output/production-migration/pre_presentaciones_finales_20261027185103/`, fuera de Git. El informe local es `verificacion.json` en ese directorio.

Las nuevas inscripciones adjuntan el archivo en el mismo batch transaccional que personas, exposición e integrantes. Se necesitan batches habilitados, al menos 100 solicitudes y un cuerpo de al menos 27 MB; el límite de Server Actions del proyecto ya es 27 MB. La entrega separada reemplaza el archivo y registra la auditoría en un solo batch bajo el bloqueo del evento. Los endpoints de descarga autorizan el evento real del recurso y devuelven respuestas privadas sin caché; únicamente PDF usa respuesta `inline`.

## Verificación local

```powershell
$env:POCKETBASE_URL='http://127.0.0.1:8099'
$env:POCKETBASE_ADMIN_EMAIL='test-admin@example.com'
$env:POCKETBASE_ADMIN_PASSWORD='TestOnly-Roles-2026!'
$env:SESSION_SECRET='local-only-roles-session-secret-2026-32chars'
$env:RUN_PRESENTATIONS_INTEGRATION='1'
npm test -- tests/presentations.integration.test.ts
```

La prueba rechaza otras URL y credenciales. Requiere la base local aislada preparada con las cuentas de servicio de prueba. Cubre migración repetida, subida inicial atómica, múltiples trabajos, archivos protegidos, reemplazo y reintentos, PDF y PowerPoint, segundo expositor, denegación al director y entre eventos, conservación de archivos al editar y entregas con inscripción cerrada. `KEEP_PRESENTATIONS_FIXTURE=1` conserva el evento sintético para revisar el navegador.

Para revertir la aplicación, conservar los campos y archivos de la base. No eliminar las presentaciones ya entregadas al volver a una versión anterior.
