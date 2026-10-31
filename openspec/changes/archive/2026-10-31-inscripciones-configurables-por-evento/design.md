## Context

Véase `proposal.md` para el problema y el alcance acordado. El código ya implementa eventos, inscripciones públicas y presenciales, acreditación, correcciones, materiales y certificados con Next.js, Zod, PocketBase y pdf-lib.

Hallazgos que condicionan el diseño:

- `lib/domain/models.ts`, `components/registration-form.tsx` y `app/actions/registrations.ts` fijan cuatro datos de identidad. El teléfono mencionado inicialmente no forma parte de la definición final de esta jornada; quedará disponible como campo configurable.
- `inscripciones` ya representa personas por evento, con índice único `(evento, documento_normalizado)`, estado personal de acreditación y reserva pública. Se conserva como identidad operativa, evitando un segundo padrón de directores.
- `lib/services/registrations.ts` cuenta todas las altas públicas para el cupo y asigna números únicos; debe distinguir solicitudes principales de integrantes vinculados.
- `lib/services/certificates.ts` genera por inscripción acreditada y guarda un certificado por `inscripcion`. Tanto esa generación como las descargas presuponen acreditación del titular.
- `lib/services/participant-resources.ts` descarta personas sin acreditación antes de obtener cualquier recurso. El formulario público actual busca por DNI, aunque el cambio inicial `gestion-integral-de-eventos`, aún activo, conserva referencias anteriores a DNI más email. La especificación vigente de materiales refleja el flujo actual por DNI.
- Solo `edicion-datos-acreditacion` y `materiales-para-asistentes` están en las especificaciones principales. Los antecedentes de eventos, inscripción, acreditación, reportes y certificados permanecen en el cambio inicial; esta propuesta añade capacidades diferenciadas y modifica explícitamente los dos contratos vigentes afectados.
- El SDK instalado ofrece `createBatch()` para operaciones transaccionales. La versión y habilitación del servidor remoto no se verificaron en esta fase; constituyen una comprobación concreta de despliegue antes de habilitar altas grupales.

## Goals / Non-Goals

**Goals:**

- Separar identidad, modalidad, función dentro de una exposición, acreditación y derecho al certificado.
- Mantener la lógica en Next.js, el navegador sin acceso directo a PocketBase y las restricciones únicas en persistencia.
- Parametrizar los formularios y un conjunto acotado de políticas, con versiones verificables y componentes accesibles.
- Migrar sin cambiar identificadores, acreditaciones, reservas, documentos PDF ni enlaces existentes.

**Non-Goals:**

- Construir un lenguaje de reglas arbitrarias, ejecutar código introducido por el administrador o un diseñador visual libre de PDF.
- Añadir evaluación de trabajos, carga de resúmenes, pagos, envío de emails o cuentas de participantes.
- Implementar cupos independientes por modalidad, conversiones automáticas de Asistente a Expositor, múltiples alumnos responsables por exposición o cambios públicos de integrantes ya confirmados.
- Extender a directores ausentes el acceso a materiales por la presencia del alumno ni cambiar el mecanismo actual de identificación del portal.

## Decisions

### 1. Una identidad de participante y vínculos separados

Se conserva `inscripciones` como participante único por evento. Su modalidad es estable; `origen` sigue indicando pública o presencial y un campo independiente `tipo_alta` distingue principal de vinculada. Las funciones de alumno, director o codirector pertenecen al vínculo con la exposición, no a la identidad personal. Una persona puede dirigir varias exposiciones y conserva una sola acreditación.

Modelo propuesto, con nombres finales coherentes con las convenciones del esquema:

| Entidad | Datos y restricciones principales |
| --- | --- |
| `modalidades_inscripcion` | Evento, código estable, nombre, orden, habilitación, versión publicada y presentación actual de certificado: entrega, plantilla y textos. Unicidad evento/código. |
| `versiones_modalidad` | Modalidad, número, esquema JSON validado de campos/secciones/roles, responsable y política de certificación; inmutables después de publicarse. Unicidad modalidad/número. |
| `inscripciones` | Identidad actual, modalidad, tipo de alta, origen, acreditación y reserva existentes; versión/respuestas de su solicitud principal cuando corresponda. Mantiene unicidad evento/DNI normalizado. |
| `exposiciones` | Evento, modalidad, versión de configuración, participante alumno responsable y respuestas de la exposición. Una exposición principal por alumno y evento en esta entrega. |
| `integrantes_exposicion` | Exposición, participante, función y respuestas particulares de ese vínculo. Unicidad exposición/participante; cardinalidades y pertenencia al evento verificadas en servidor. |
| `operaciones_inscripcion` | Clave de idempotencia, huella de entrada, estado confirmado y referencia al resultado; se crea en la misma transacción que la inscripción. Unicidad evento/clave. |
| `certificados` | Mantiene ID, archivo e `inscripcion` de referencia: titular individual o alumno responsable. Añade modalidad, alcance, exposición opcional, versión y huella de datos emitidos. |
| `destinatarios_certificado` | Relación certificado/participante, única por par. Un destinatario individual o todos los integrantes vigentes de la exposición. |

Se conserva el índice único de certificado por `inscripcion`: cada alumno tiene una sola exposición principal y no recibe además un certificado individual de expositor. Se agrega unicidad por exposición no vacía para certificados compartidos. Un director participa como destinatario en varios certificados sin convertir esos certificados en documentos individuales suyos.

La alternativa de guardar únicamente JSON de directores dentro del alumno no permitiría buscarlos, acreditarlos ni aplicar la exclusividad con Asistente. Crear una inscripción independiente por exposición duplicaría al director y distorsionaría presencia y cupos.

### 2. Editor declarativo y versiones del formulario

El panel del evento incorpora «Modalidades y formulario», con edición ordenada de campos y grupos, obligatoriedad, ayuda y vista previa. Una modalidad única se presenta directamente; con varias, el formulario público permite elegir antes de completar datos. Se ofrecen configuraciones iniciales Asistente y Expositor con dirección, además de copiar desde otro evento.

Las configuraciones son datos validados con Zod en servidor. Los campos tienen identificadores estables, independientes de sus etiquetas; las opciones y límites se validan por tipo. Se fijan límites de cantidad de campos, opciones, tamaño de respuestas y cardinalidades para impedir configuraciones imposibles de renderizar o persistir. No se admiten HTML ni expresiones ejecutables en etiquetas o reglas. Los valores de identidad no se ocultan ni vuelven opcionales.

Una versión publicada es inmutable; cambiar campos, roles o reglas crea otra. El envío incluye modalidad, versión y clave de operación, pero el servidor obtiene el esquema confiable. Si cambió la versión publicada mientras se completaba el formulario se rechaza el envío sin persistir, explicando que debe actualizarse. Los errores conservan los valores para corregirlos. Las inscripciones anteriores se consultan y editan con su versión original.

La configuración de presentación del certificado puede editarse sin alterar la estructura de respuestas; solo afecta vistas previas y futuras emisiones/regeneraciones. Su huella se guarda al emitir. Los cambios de presentación no invalidan automáticamente PDFs anteriores; los cambios de identidad o integrantes sí requieren regeneración para mostrar un documento vigente.

Se prefiere este editor limitado a integrar un constructor externo: aprovecha los componentes actuales y evita otra dependencia y otro modelo de validación.

### 3. Alta transaccional, exclusividad y cupo

Next.js valida disponibilidad, versión, datos personales, cardinalidades y documentos distintos dentro del grupo. Consulta participantes existentes: reutiliza integrantes de la misma modalidad con datos normalizados coherentes y rechaza modalidades incompatibles o divergencias de identidad sin sobrescribirlas. Nunca devuelve públicamente los datos ya almacenados para completar un formulario por DNI.

Para la confirmación se usa un batch transaccional del SDK: se preparan IDs, se crean los participantes faltantes, la reserva del principal, exposición, vínculos y operación de idempotencia. Una colisión de documento, cupo o clave provoca rollback completo y una relectura acotada antes de reintentar o informar conflicto. El registro de operación solo se consulta como reintento cuando también coincide la huella del contenido; la misma clave con otra entrada se rechaza. No basta con enviar escrituras secuenciales o compensar borrando participantes compartidos.

La comprobación de despliegue debe confirmar que el servidor admite batches transaccionales y los tiene habilitados. Si falta esa capacidad, las altas grupales permanecen deshabilitadas hasta habilitarla o actualizar el servidor; no se degrada a persistencia parcial ni se introducen hooks personalizados.

Se conserva el cupo común del evento, interpretado como reservas de solicitudes principales: un asistente o un alumno ocupa un lugar; un director/codirector vinculado no reserva otro. Es una decisión de continuidad para esta entrega, no un aforo de todas las personas que podrían concurrir. El contador y la reserva consultan únicamente altas principales públicas. Los integrantes vinculados usan número de reserva cero; los principales mantienen el índice de número positivo único. Las estadísticas distinguen reservas y personas.

Un participante ya vinculado que posteriormente presenta una solicitud principal compatible puede reutilizar su identidad si no tiene otra solicitud principal, reservando el lugar y promoviendo su `tipo_alta` dentro de la transacción. Se mantiene su acreditación y sus vínculos anteriores. No se convierte automáticamente entre modalidades.

El alta presencial usa las mismas validaciones y transacción; acredita solamente a la persona que se está atendiendo, nunca a todos los integrantes. Las correcciones de integrantes son administrativas, validadas y auditadas, con bloqueo de eliminación del responsable o incumplimiento de la cardinalidad obligatoria.

### 4. Dos políticas de certificación explícitas

El motor soporta inicialmente estas combinaciones, seleccionables por modalidad:

| Alcance | Habilitación | Destinatarios | Contenido |
| --- | --- | --- | --- |
| Individual | Acreditación propia | Titular | Certificado habitual de asistencia |
| Grupo | Acreditación del responsable | Todos los integrantes actuales | Mismo PDF de expositor con alumno, director y codirector opcional |

El evento de ejemplo usa Asistente individual y Expositor grupal; los rótulos no gobiernan la lógica. La política se obtiene de la configuración versionada, no de comparar nombres como «Expositor». La deshabilitación de nuevas inscripciones no revoca certificados; la entrega habilitada es una opción independiente.

La acreditación del alumno habilita la elegibilidad; el administrador sigue iniciando la generación, como actualmente. No se promete emisión automática al acreditar. La ausencia de director/codirector no bloquea el PDF y su presencia no lo habilita si el alumno falta.

La emisión guarda una sola instancia de PDF y sus destinatarios en una unidad consistente. Se conserva la semántica de generación normal y regeneración explícita. Las restricciones únicas evitan documentos lógicos duplicados; la generación/regeneración debe serializarse por sujeto del certificado y revalidar su huella y elegibilidad antes de publicar. Un PDF compuesto con datos que cambiaron durante la generación no puede quedar publicado como vigente.

Se extienden `lib/domain/certificate-texts.ts` y `lib/certificates/pdf.ts` con un bloque de integrantes y variables de grupo, además de las variables individuales existentes. Los nombres, DNI y funciones se ordenan alumno/director/codirector. No se incluyen emails en el PDF. La vista previa y las pruebas deben verificar ajuste de líneas y áreas de firmas con nombres largos; nunca recortar integrantes para encajarlos.

La alternativa de tres certificados visualmente iguales incumple la decisión del usuario: deben compartir el mismo archivo con todos los integrantes.

### 5. Autorización por recurso y pertenencia actual

El portal conserva consulta por DNI normalizado, límites persistentes y cookie firmada temporal. Se amplía el resultado para identificar al participante aunque solo tenga derecho a un certificado compartido y no esté personalmente acreditado. La sesión contiene referencias de participante; no se concede acceso general a sus eventos ni se toma un ID de certificado como prueba suficiente de pertenencia.

En cada consulta y descarga se vuelve a comprobar:

1. Certificado individual: identidad titular, mismo evento, entrega habilitada, acreditación propia vigente y contenido vigente.
2. Certificado compartido: destinatario e integrante actual del grupo, mismo evento, entrega habilitada, alumno responsable actualmente acreditado y contenido vigente.
3. Materiales: inscripción propia del evento y acreditación personal vigente, con independencia de cualquier certificado grupal.

`participant-resources.ts` deja de filtrar todo exclusivamente por `acreditado = true` y calcula permisos separados para cada recurso. La vista de resultados admite varios certificados compartidos en un evento para un mismo director. Se conservará compatibilidad con cookies y certificados históricos, revalidando relaciones y elegibilidad en el servidor. La descarga mantiene respuesta genérica, almacenamiento privado y cabeceras `no-store`.

Revocar al alumno bloquea el certificado compartido para todos sin borrar el PDF; volver a acreditarlo permite reutilizarlo si sigue vigente. Revocar solamente al director afecta sus materiales, pero no ese certificado. Retirar un vínculo revoca el acceso de esa persona incluso con una cookie emitida previamente.

### 6. Correcciones, huellas y respuestas particulares

Las correcciones de identidad actualizan al participante único y se reflejan en todas las exposiciones vinculadas. Las respuestas de un director específicas de una exposición se guardan en el vínculo correspondiente para no sobrescribir las de otra exposición o versión.

Cada certificado guarda una huella de los datos personales, integrantes, funciones y sujeto utilizados al emitir. La lectura compara esa huella con los datos vigentes, evitando depender únicamente de marcar un estado durante la edición. Si cambian identidad o integrantes, se informa «Pendiente de regeneración» y se bloquea la descarga del PDF desactualizado hasta regenerarlo. Cambiar texto o plantilla requiere regeneración explícita si se quiere reemplazar el documento, pero no vuelve falso el contenido de identidad anterior.

Edición, cambios de vínculos, acreditación, configuración y generación registran actor, entidad, campos modificados y resultado en auditoría sin volcar respuestas personales completas en logs. Se revalidan las vistas administrativas y recursos afectados.

### 7. Operación y exportaciones con unidades explícitas

La acreditación muestra una fila por participante con modalidad, funciones y exposiciones; permite abrir sus datos y vínculos. Los filtros combinan búsqueda, origen, estado personal, modalidad y función. «Asistente» describe una modalidad; «Acreditado» describe presencia y se usa en las etiquetas operativas para evitar confusión.

Los reportes separan personas, reservas públicas, exposiciones y archivos emitidos. El porcentaje de acreditación usa personas únicas. Se conservan una exportación de personas y otra de vínculos por exposición: el director repetido en varias filas de vínculos no infla el total de personas. Campos adicionales se exportan por identificador y versión con encabezados comprensibles. Se mantienen sesión administrativa, filtros y auditoría; las celdas se escapan y se trata como texto la entrada que una planilla pudiera interpretar como fórmula.

## Risks / Trade-offs

- [Alta grupal sin soporte transaccional remoto] → Verificar la capacidad concreta antes de activar la función y probar rollback por fallo intermedio y colisiones reales; no usar escrituras secuenciales.
- [Director inscripto previamente como asistente] → Rechazar con una indicación operativa y mostrar su registro al administrador; las conversiones de modalidad quedan fuera de esta entrega.
- [El cupo no equivale al aforo físico] → Mostrar por separado reservas principales y personas totales; mantener esta política documentada y no introducir cupos por modalidad implícitamente.
- [Exposición contiene datos informados por otra persona] → No permitir sobrescrituras públicas de identidad existente; validar coincidencias sin revelar datos privados.
- [Cookie antigua conserva acceso después de una revocación] → Revalidar acreditación del responsable y pertenencia actual en cada descarga, también con IDs históricos de certificados.
- [Identidad corregida mientras se genera un PDF] → Comparar la huella antes de publicar y antes de descargar; probar la carrera entre edición y emisión.
- [Certificados compartidos con nombres extensos] → Usar bloque de integrantes con ajuste de texto y comprobar visualmente PDFs de dos y tres integrantes con casos extremos.
- [Especificaciones iniciales no archivadas contienen reglas anteriores] → Mantener esta propuesta separada; antes de sincronizar/archivar reconciliar los contratos de inscripción, acreditación y certificados del cambio inicial, incluyendo la consulta actual por DNI y la excepción grupal.

## Migration Plan

1. Preparar una migración específica, aditiva, reejecutable y con modo de comprobación que no cree ni rote credenciales. Respaldar registros y archivos y validar relaciones e índices en una copia de prueba. No ejecutar indiscriminadamente `scripts/setup-pocketbase.ts`, que además sincroniza credenciales.
2. Incorporar colecciones y campos nuevos inicialmente opcionales, con reglas de acceso restringidas a servidor/administración y archivos privados. Verificar batches transaccionales y sus límites con la identidad de servicio.
3. Crear por cada evento una modalidad Asistente y su versión inicial, copiando entrega, plantilla y textos existentes. Las modalidades y versiones poseen claves de migración únicas para poder reanudar el proceso.
4. Asociar inscripciones históricas a esa modalidad como principales, manteniendo IDs, documentos, origen, reservas y acreditaciones. No alterar PDFs ni historiales de envío.
5. Asociar certificados históricos a alcance individual, su titular como destinatario y modalidad correspondiente, conservando ID, archivo y enlaces. Registrar metadatos de compatibilidad para no exigir regeneración por falta de huella histórica.
6. Desplegar lectores compatibles con datos anteriores y migrados; completar el backfill y verificar totales, unicidad, acceso a materiales y descarga de certificados existentes antes de activar nuevas modalidades.
7. Habilitar configuración por evento y ensayar la jornada completa en un entorno de prueba: asistente, alumno, director/codirector ausentes y presentes, director compartido, revocación, conflicto de DNI y concurrencia en último cupo.
8. En una regresión, deshabilitar nuevas altas multimodales y mantener las rutas capaces de leer los datos nuevos. No volver a una aplicación que clasifique automáticamente a todos como asistentes ni eliminar colecciones para revertir; una restauración de respaldo solo procede con conciliación de altas posteriores. Los eventos históricos pueden seguir con su modalidad predeterminada.

La propuesta no ejecuta migraciones, no modifica el servidor ni registra la jornada real. El despliegue debe aplicar las restricciones de acceso y autorización vigentes del entorno.
