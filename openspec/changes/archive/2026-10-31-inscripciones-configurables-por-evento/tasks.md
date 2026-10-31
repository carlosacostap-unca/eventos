## 1. Dominio y contratos de configuración

- [x] 1.1 Leer las guías locales pertinentes de `node_modules/next/dist/docs/` antes de editar código y registrar las convenciones aplicables a acciones, formularios y rutas; verificar que el diseño de implementación respeta las APIs instaladas.
- [x] 1.2 Definir tipos y validadores de modalidades, versiones, secciones, campos tipados y cardinalidades en el dominio; verificar aceptación de Asistente y Expositor con dirección y rechazo de identidades opcionales, IDs repetidos, límites inválidos y campos no definidos.
- [x] 1.3 Definir las políticas individual/acreditación propia y grupal/acreditación del responsable, entrega y destinatarios; verificar una matriz de elegibilidad con alumno, director y codirector presentes o ausentes y rechazo de combinaciones incompatibles.
- [x] 1.4 Definir normalización/coherencia de identidad, claves de idempotencia y huellas de contenido; verificar que diferencias de formato equivalentes no duplican personas y que datos divergentes no autorizan sobrescrituras públicas.

## 2. Persistencia y migración aditiva

- [x] 2.1 Añadir modalidades, versiones, exposiciones, vínculos, operaciones y destinatarios al esquema PocketBase y ampliar inscripciones/certificados; verificar en pruebas de esquema relaciones, índices de unicidad, reglas protegidas y conservación de los índices de DNI, reserva y certificado por inscripción.
- [x] 2.2 Crear una comprobación de despliegue de batches transaccionales con la identidad de servicio y límites configurados; verificar en entorno de prueba rollback de un batch con un fallo intermedio y bloqueo de altas grupales si la capacidad no está disponible.
- [x] 2.3 Implementar una migración específica con modo de comprobación, checkpoints y sin sincronización de credenciales; verificar un informe de cambios esperado antes de aplicar y ausencia de rotación de usuarios o secretos.
- [x] 2.4 Migrar eventos e inscripciones históricos a Asistente y su versión inicial, conservando entrega, plantilla, textos, IDs, origen, cupo y acreditación; verificar igualdad de totales y valores antes y después y una segunda ejecución sin duplicados.
- [x] 2.5 Migrar certificados históricos a individuales con destinatario titular y metadatos compatibles; verificar que IDs, archivos y enlaces siguen siendo los mismos y que la migración no genera nuevos PDFs.

## 3. Administración de modalidades y formularios

- [x] 3.1 Implementar servicios y acciones autenticadas para crear, ordenar, editar y deshabilitar modalidades por evento y publicar versiones inmutables; verificar aislamiento entre eventos, rechazo sin sesión y conservación de versiones utilizadas.
- [x] 3.2 Incorporar el editor de secciones, campos y grupos con ayuda, orden, obligatoriedad, cardinalidades y vista previa en administración; verificar que puede reproducir la jornada con cuatro datos por persona, director obligatorio y codirector opcional sin teléfono obligatorio.
- [x] 3.3 Implementar configuración por modalidad de entrega, alcance, regla, destinatarios, plantilla y textos; verificar independencia entre Asistente y Expositor y que cerrar una modalidad para nuevas altas no revoca sus certificados.
- [x] 3.4 Añadir las configuraciones iniciales y la copia desde otro evento; verificar que copia configuración y assets necesarios como datos independientes y no copia personas, exposiciones, acreditaciones ni PDFs emitidos.

## 4. Inscripción pública y confirmación transaccional

- [x] 4.1 Adaptar el formulario público para modalidad única directa o selección entre modalidades y renderizado de la versión publicada; verificar cambio de modalidad, accesibilidad de etiquetas y agregado/retiro del codirector opcional.
- [x] 4.2 Adaptar acciones y servicios para validar esquemas confiables, disponibilidad, versión y grupos completos; verificar errores por campo, conservación de valores y rechazo sin escrituras de versiones obsoletas, modalidad ajena, director ausente y codirector incompleto.
- [x] 4.3 Implementar confirmación batch de participantes faltantes, exposición, integrantes, respuestas y operación idempotente; verificar rollback completo ante fallos y reenvío tras respuesta perdida sin duplicados ni nueva reserva.
- [x] 4.4 Implementar reutilización de integrantes compatibles y exclusividad entre modalidades; verificar director compartido, conflicto asistente/director, datos divergentes, documentos repetidos dentro del grupo y carreras concurrentes para el mismo DNI.
- [x] 4.5 Adaptar contador y reserva al cupo público común por solicitud principal, manteniendo vinculados sin reserva adicional; verificar último lugar solicitado simultáneamente entre modalidades, cierre manual/finalización y promoción transaccional de un vinculado compatible a principal sin duplicar su identidad.

## 5. Acreditación, altas presenciales y correcciones

- [x] 5.1 Adaptar búsqueda y lista de acreditación con modalidad, funciones y exposiciones relacionadas; verificar una sola fila por director compartido y que pueda acreditarse como expositor aunque el alumno no esté presente.
- [x] 5.2 Mantener acreditación/revocación idempotentes por participante, con auditoría y revalidación; verificar que acreditar al alumno o al director no modifica la presencia ni la modalidad de los demás integrantes.
- [x] 5.3 Adaptar alta presencial a los formularios y vínculos configurados y a la excepción de cupo; verificar que solo se acredita a la persona atendida y se rechaza registrar como asistente a un director ya vinculado.
- [x] 5.4 Extender edición de identidad y respuestas según versión y agregar corrección administrativa validada de vínculos; verificar propagación a todas las exposiciones, bloqueo de duplicados de cualquier modalidad, cardinalidad obligatoria, conservación de asistencia/cupo y auditoría.

## 6. Certificados individuales y compartidos

- [x] 6.1 Adaptar resolución de plantilla, textos y generación de sujetos elegibles por modalidad sin depender del nombre visible; verificar que Asistente usa presencia propia y cada exposición depende únicamente de su alumno responsable y entrega habilitada.
- [x] 6.2 Extender composición PDF y variables con nombres, DNI y funciones de todos los integrantes y vista previa por modalidad; verificar PDFs de dos y tres personas con nombres largos y renderizar para comprobar legibilidad, ajuste de líneas y firmas sin superposición.
- [x] 6.3 Implementar persistencia de un certificado por sujeto y destinatarios consistentes, con generación concurrente idempotente y regeneración explícita; verificar un solo ID y archivo por exposición, reutilización habitual, reemplazo explícito y conservación del documento anterior ante fallos.
- [x] 6.4 Incorporar huellas de identidad y miembros y detección de contenido desactualizado; verificar bloqueo hasta regenerar tras corrección de director o cambio de integrantes y protección frente a edición concurrente durante la composición.
- [x] 6.5 Adaptar la página administrativa de certificados con modalidad, exposición, integrantes, pendientes y resultados de lote; verificar que un director compartido no causa certificados individuales adicionales y que un cambio de plantilla no reemplaza automáticamente archivos emitidos.

## 7. Consulta pública, descarga y materiales

- [x] 7.1 Extender la consulta vigente por DNI y el servicio de recursos para separar acreditación personal de elegibilidad de certificados compartidos; verificar que un director ausente puede consultar el grupo elegible y que límites, respuestas genéricas y autorización temporal siguen funcionando.
- [x] 7.2 Adaptar resultados para mostrar certificados individuales y varias exposiciones del mismo evento, incluyendo pendientes de emisión o regeneración; verificar que el director distingue los grupos a los que pertenece sin ver exposiciones ajenas.
- [x] 7.3 Revalidar pertenencia, destinatario, evento, entrega, huella y acreditación del responsable en cada descarga; verificar que alumno, director y codirector obtienen exactamente el mismo PDF y que retirar un vínculo o revocar al alumno bloquea cookies anteriores.
- [x] 7.4 Conservar autorización de materiales por acreditación propia y compatibilidad de certificados/cookies históricos; verificar director ausente con certificado pero sin materiales, director acreditado con materiales, certificado histórico y acceso directo rechazado sin enlaces de storage expuestos.

## 8. Reportes y exportación

- [x] 8.1 Añadir filtros por modalidad y función junto a búsqueda, origen y presencia; verificar coincidencia entre lista filtrada y resultados operativos con directores compartidos y personas ausentes con certificado habilitado.
- [x] 8.2 Adaptar métricas para distinguir personas únicas, acreditaciones, reservas principales, exposiciones y documentos; verificar el caso de dos alumnos y un director compartido y los porcentajes de un evento sin participantes.
- [x] 8.3 Extender CSV de personas y agregar CSV de vínculos con respuestas por versión; verificar filtros, encabezados, una fila por unidad declarada, comillas/saltos de línea, tratamiento textual de fórmulas y acceso restringido con auditoría.

## 9. Validación integral y preparación de despliegue

- [x] 9.1 Ejecutar recorridos de navegador sobre evento histórico y jornada con ambas modalidades, errores y codirector opcional; verificar inscripción, acreditación individual, emisión compartida, consulta de director ausente y revocación del alumno con evidencias del recorrido.
- [x] 9.2 Ejecutar integración contra PocketBase de prueba para atomicidad, mismo DNI concurrente, director compartido y último cupo; verificar invariantes en los registros persistidos y limpieza de los datos exclusivos de prueba.
- [x] 9.3 Ejecutar `npm run test`, `npm run typecheck`, `npm run lint` y `npm run build` y corregir los fallos atribuibles al cambio; verificar éxito y registrar limitaciones de entorno si las hubiera.
- [x] 9.4 Documentar el editor, reglas de cupo y certificados, ejecución de migración y rollback compatible; verificar el procedimiento sobre una copia y entregar una matriz que vincule los seis archivos de requisitos con sus pruebas y evidencias.
- [x] 9.5 Reconciliar los antecedentes de `gestion-integral-de-eventos` antes de sincronizar/archivar esta funcionalidad; verificar que el resultado no reinstala certificado individual obligatorio para todo expositor ni acreditación propia para el director que descarga el PDF grupal, y ejecutar validación estricta de OpenSpec.

## 10. Recuperación de datos por DNI

- [x] 10.1 Añadir consulta exacta por documento sin confirmación de email, priorizando la identidad del evento actual o la inscripción previa más recientemente actualizada; limitar la respuesta a los cuatro campos de identidad y las consultas por origen mediante almacenamiento persistente.
- [x] 10.2 Empezar los formularios públicos por DNI y precargar datos editables para participante, director y codirector; permitir carga manual ante ausencia o fallo, descartar respuestas de documentos anteriores y conservar las preguntas particulares de cada modalidad.
- [x] 10.3 Verificar con PocketBase local la reutilización, edición, prevención de duplicados y conservación exacta de inscripciones y PDFs anteriores; comprobar en navegador la inscripción grupal, el evento anterior, la persona nueva y la respuesta demorada; ejecutar pruebas, tipos, lint, build y validación estricta.
