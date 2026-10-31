## MODIFIED Requirements

### Requirement: Edición de identidad durante la acreditación
El sistema SHALL permitir a administradores editar apellidos, nombres, documento, email y respuestas configuradas desde la lista de acreditación de cualquier evento, incluyendo alumnos, directores y codirectores. La corrección MUST conservar modalidad, vínculos, origen, asistencia y cupo, respetar la versión de formulario aplicable y registrar el actor y los campos modificados. La edición de identidad MUST actuar sobre el participante único del evento y reflejarse en todas sus exposiciones.

#### Scenario: Corrección de una inscripción
- **WHEN** un administrador guarda datos válidos de una inscripción pública, presencial o vinculada del evento
- **THEN** el sistema actualiza los datos personales y el documento normalizado, conservando asistencia, origen, modalidad, vínculos y cupo
- **AND** registra el actor y los campos modificados en auditoría

#### Scenario: Datos inválidos o documento duplicado
- **WHEN** la corrección contiene datos inválidos o un documento normalizado utilizado por otro participante del mismo evento, de cualquier modalidad
- **THEN** el sistema rechaza el guardado y muestra el error
- **AND** el formulario conserva los valores escritos para corregirlos

#### Scenario: Edición sin cambiar el documento propio
- **WHEN** se corrige otro campo manteniendo el documento de la propia inscripción
- **THEN** el sistema permite guardar sin tratarla como un duplicado

#### Scenario: Acceso no autorizado o evento incorrecto
- **WHEN** se intenta editar sin sesión administrativa o usando una inscripción de otro evento
- **THEN** el sistema rechaza la operación sin modificar la inscripción

#### Scenario: Cancelación
- **WHEN** el administrador cancela la edición antes de guardar
- **THEN** el formulario se cierra sin modificar la inscripción

#### Scenario: Actualización de las vistas
- **WHEN** se guardan correctamente los datos
- **THEN** el sistema revalida acreditación, resumen, reportes, exposiciones y listado administrativo de certificados

#### Scenario: Director compartido con certificados emitidos
- **WHEN** se corrigen los datos de un director vinculado a varias exposiciones
- **THEN** los datos corregidos se reflejan en todas ellas y los certificados compartidos afectados se señalan como pendientes de regeneración
- **AND** la corrección no cambia la acreditación de ninguno de los alumnos

#### Scenario: Corrección de respuestas de una versión anterior
- **WHEN** se edita una inscripción cuyo formulario es anterior al vigente
- **THEN** se validan y conservan sus campos según la versión utilizada sin exigirle automáticamente campos agregados después
