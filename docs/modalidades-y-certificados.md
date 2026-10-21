# Modalidades, formularios y certificados por evento

La configuración está en **Evento → Modalidades y formularios**. Cada evento nuevo comienza con Asistente. Se puede agregar Expositor con dirección o una modalidad personalizada y copiar una configuración desde otro evento. Copiar nunca incorpora participantes, acreditaciones o certificados emitidos; si el destino ya tiene inscripciones en modalidades coincidentes, se configura cada modalidad individualmente.

## Configurar una jornada

1. Mantener Asistente con apellido, nombre, DNI y email. Usar certificado individual condicionado a acreditación propia.
2. Agregar Expositor con dirección. La configuración inicial pide los mismos cuatro datos para el alumno, el título del trabajo obligatorio, un director obligatorio y un codirector opcional. El título lo completa el alumno una sola vez por exposición. El teléfono es un campo adicional disponible, no un requisito predeterminado de esta jornada.
3. Agregar y ordenar los campos particulares. Se admiten texto corto/largo, número con límites, fecha, email, teléfono, selección simple/múltiple y casilla. Las secciones agrupan campos y los grupos definen funciones, mínimos y máximos de personas.
4. Elegir para Expositor un PDF compartido condicionado a acreditación de la persona principal. Todos sus integrantes son destinatarios del mismo documento, con sus nombres, DNI y funciones.
5. Guardar la configuración y comprobar la vista previa PDF. Cada modalidad tiene su entrega, plantilla y textos. Se puede cargar un fondo PDF, PNG o JPG de hasta 10 MB o volver al fondo institucional.

Los cuatro datos de identidad siempre son obligatorios. El editor admite hasta 50 campos principales, 30 por función, cinco funciones y veinte integrantes vinculados en total. Los límites individuales y el tamaño de respuestas también se validan en servidor. Las reglas disponibles son individual por acreditación propia y grupal por acreditación del responsable; no se ejecutan reglas programadas por el administrador.

## Inscripción y operación

Una persona tiene un único registro y una modalidad por DNI normalizado dentro del evento. No puede ser asistente y expositor simultáneamente. Los directores y codirectores aparecen como expositores desde que se confirma la inscripción del alumno; pueden acreditarse sin crearles otra inscripción. Un director que acompaña a varios alumnos conserva una sola identidad y acreditación con varios vínculos de exposición.

El cupo público se aplica a solicitudes principales: un asistente o un alumno expositor reserva un lugar. Los integrantes vinculados no reservan lugares adicionales. Los reportes separan esas reservas del total de personas que podrían concurrir. No hay cupos separados por modalidad en esta entrega. En Configuración se puede marcar **Sin límite de cupo**; en ese caso no hay cierre ni confirmación presencial por exceso de cantidad, y se mantienen el cierre manual y la finalización del evento.

La acreditación confirma presencia individual; no cambia la modalidad ni acredita a otros integrantes. En alta presencial solo se acredita a la persona principal atendida y se mantiene la confirmación administrativa cuando se supera el cupo. Las personas vinculadas ya existentes se buscan en la lista para acreditarlas.

En **Acreditación** se corrigen identidad y respuestas principales; en **Exposiciones** se corrigen integrantes y respuestas de cada vínculo. Las correcciones se auditan. No se convierten automáticamente asistentes en expositores ni se sobrescriben públicamente datos de una identidad existente. Los conflictos se resuelven con la organización.

## Certificados y recursos

| Caso | Certificado | Materiales |
| --- | --- | --- |
| Asistente acreditado | Individual, si su modalidad entrega | Por acreditación propia |
| Alumno expositor acreditado | Compartido, si su modalidad entrega | Por acreditación propia |
| Director/codirector ausente, alumno acreditado | El mismo PDF compartido | No habilitados por la presencia del alumno |
| Director/codirector presente, alumno sin acreditar | No habilita el PDF de esa exposición | Por acreditación propia |

La acreditación habilita la elegibilidad; el administrador inicia la emisión desde **Certificados**. Generar reutiliza archivos ya emitidos. Regenerar reemplaza el PDF conservando su identificador y destinatarios vigentes. Cambiar plantilla o textos no modifica automáticamente documentos emitidos.

Corregir identidad o integrantes deja desactualizados los certificados afectados: su descarga queda pendiente de regeneración. Retirar un vínculo revoca el acceso de esa persona; revocar al alumno bloquea el PDF para todos los integrantes. La aplicación vuelve a verificar estas condiciones en cada descarga, aunque exista una autorización anterior.

El portal conserva su consulta por DNI y autorización temporal. Un director puede ver varios certificados de exposiciones del mismo evento. Los certificados históricos y las autorizaciones anteriores mantienen compatibilidad. Los materiales siguen exigiendo presencia propia.

Cambiar campos o grupos publica una nueva versión. Las inscripciones anteriores conservan su versión; no se les exige un campo agregado posteriormente. Un formulario abierto con una versión anterior debe actualizarse antes de confirmar.

### Títulos de trabajos y plantillas con composición propia

Los textos pueden incluir respuestas principales mediante `{campo:identificador}`. El editor muestra las variables disponibles junto a sus etiquetas. Por ejemplo, un campo obligatorio `titulo_trabajo` puede aparecer en Participación como `expositor de la comunicación oral: «{campo:titulo_trabajo}»`. Las respuestas se sustituyen como texto, sin interpretar variables que contengan. Corregirlas deja pendiente de regeneración un certificado emitido con esos datos.

Una plantilla PDF puede definir campos de texto vacíos `certificado.cuerpo`, `certificado.integrantes` y `certificado.fecha` en su primera página. El primero activa la composición de párrafo y es obligatorio; el segundo es necesario para grupos; el tercero coloca Lugar y fecha. Sus rectángulos y tamaños de fuente fijan las áreas de impresión. Deben quedar dentro de la página y sin superponerse, con fuente entre 9 y 30 puntos. El cuerpo une introducción, participante, documento, participación y evento; los campos del formulario y el participante se destacan en negrita cursiva. Los integrantes vinculados se detallan por función con su DNI; la persona principal figura en el cuerpo.

El generador conserva las imágenes y textos estáticos de esa plantilla, elimina los campos interactivos del PDF final y ajusta los textos dentro de sus áreas. Si no caben a nueve puntos, continúa en otras páginas del mismo documento. Las plantillas sin esos campos conservan la composición anterior. Los fondos deben estar limpios de nombres, DNI y trabajos de ejemplo: subir un certificado completo como fondo duplica sus datos al generar uno nuevo.

## Preparación y despliegue de la base

La migración específica utiliza las credenciales existentes para autenticar y **no crea usuarios ni cambia contraseñas**. No se debe sustituir por el aprovisionador general de credenciales. Antes de aplicarla, respaldar datos y archivos de PocketBase y suspender altas durante el backfill.

```powershell
npm run schema:modalities
npm run schema:modalities -- --apply
npm run schema:modalities-check -- --probe
```

El primer comando informa cantidades sin escribir. El segundo agrega el esquema y migra eventos, inscripciones y destinatarios históricos conservando IDs, reservas, asistencia y archivos. Los checkpoints son registros y relaciones únicos: ejecutar otra vez reanuda lo pendiente sin duplicar ni regenerar PDF. Antes de abrir nuevas modalidades, comprobar los totales y una descarga histórica.

El servidor PocketBase debe admitir batches transaccionales y tenerlos habilitados para la identidad de servicio. Configurar al menos 100 solicitudes por batch y tamaño suficiente para la plantilla permitida. La comprobación `--probe` intenta una transacción con un registro válido y otro deliberadamente inválido: debe fallar y persistir cero registros. Si el servidor no admite batches, no se pueden publicar modalidades ni confirmar altas configuradas; no se usan escrituras secuenciales como reemplazo.

El modo de comprobación de la migración informa también si batches está habilitado y su límite de solicitudes. La aplicación de la migración se detiene antes de escribir si batches está deshabilitado o el límite es menor a 100.

La aplicación usa un bloqueo persistente con índice único para coordinar réplicas mientras modifica un evento o emite certificados. Un bloqueo de una operación interrumpida vence a los diez minutos y puede recuperarse; ante una operación activa el usuario puede reintentar. No hay un mutex de proceso como garantía de cupo.

En caso de regresión, cerrar nuevas altas de modalidades y mantener los lectores compatibles con los datos nuevos. No eliminar colecciones ni volver a una aplicación que interprete a todos como asistentes. Restaurar un respaldo requiere conciliar las inscripciones posteriores al respaldo.

## Verificación y trazabilidad

Las guías instaladas de Next.js consultadas fueron `01-app/02-guides/forms.md`, `01-app/01-getting-started/07-mutating-data.md`, `01-app/01-getting-started/15-route-handlers.md` y la referencia de `revalidatePath`. Se mantienen acciones asíncronas separadas del cliente, validación/autorización dentro de cada acción, parámetros de ruta asíncronos, formularios con `useActionState` y respuestas de descarga privadas sin caché.

| Especificación del cambio | Evidencia principal |
| --- | --- |
| modalidades-y-formularios-por-evento | `lib/domain/modalities.test.ts`, `app/actions/modalities.test.ts`, integración de versiones y copia, recorrido del editor con publicación de v2 |
| participantes-y-exposiciones | `tests/modalities.integration.test.ts`: grupos completos, reintento idempotente, mismo DNI concurrente, director compartido, promoción a principal y último cupo |
| certificados-por-modalidad | `lib/services/certificate-subjects.test.ts`: ocho combinaciones de presencia; integración de mismo ID/bytes, revocación y regeneración; PDFs de dos y tres integrantes renderizados |
| reportes-por-modalidad | Integración de exportaciones y filtros, `lib/domain/csv.test.ts`, recorrido de Reportes con personas, reservas, exposiciones y documentos diferenciados |
| edicion-datos-acreditacion | Pruebas existentes de acciones/servicio, integración de corrección del director y edición de vínculos con versión original |
| materiales-para-asistentes | Pruebas existentes de recursos/descarga, integración de director ausente con certificado y sin materiales, acreditación propia habilitando materiales y certificado histórico migrado |

Las pruebas de integración nuevas se ejecutan **solo** con `POCKETBASE_URL=http://127.0.0.1:8099` y `RUN_MODALITIES_INTEGRATION=1`; rechazan otra URL antes de escribir. Se usó PocketBase 0.40.1 aislado. `KEEP_MODALITIES_FIXTURE=1` permite conservar una jornada sintética para revisar el navegador; por defecto las pruebas eliminan sus eventos. Las credenciales de producción nunca se deben reutilizar en esta base.

Los artefactos visuales se guardan en `output/playwright/` y `output/pdf/`, excluidos de Git. La entrega debe comprobar `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` y la validación estricta del cambio OpenSpec. Estas comprobaciones no implican despliegue ni aplicación de la migración en producción.

Se comprobaron en navegador publicación del formulario v2 con un campo obligatorio, rechazo de codirector incompleto y retiro del grupo opcional, confirmación de expositor con director existente, acreditación del alumno, emisión de un PDF nuevo reutilizando dos existentes, consulta del director ausente con varias exposiciones, retirada de acceso tras revocar al alumno y formulario de cuatro campos de un evento histórico migrado. Los reportes de la jornada sintética mostraron seis personas únicas, cuatro reservas principales, tres exposiciones y tres PDFs. Se revisaron visualmente certificados de dos y tres integrantes con nombres largos; los grupos más extensos continúan en páginas adicionales dentro del mismo PDF sin reducir el texto por debajo de nueve puntos.
