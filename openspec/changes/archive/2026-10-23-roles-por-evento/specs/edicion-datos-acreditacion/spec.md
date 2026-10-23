## MODIFIED Requirements

### Requirement: Edición de identidad durante la acreditación
El sistema SHALL permitir al administrador general y al administrador de evento asignado editar apellidos, nombres, documento y email desde la lista de acreditación del evento autorizado. El acreditador SHALL carecer de permiso para editar inscripciones existentes.

#### Scenario: Corrección de una inscripción
- **WHEN** un administrador autorizado guarda datos válidos de una inscripción pública o presencial del evento
- **THEN** el sistema actualiza los datos personales y el documento normalizado, conservando asistencia, origen y cupo
- **AND** registra el actor y los campos modificados en auditoría

#### Scenario: Datos inválidos o documento duplicado
- **WHEN** la corrección contiene datos inválidos o un documento normalizado utilizado por otra inscripción del mismo evento
- **THEN** el sistema rechaza el guardado y muestra el error
- **AND** el formulario conserva los valores escritos para corregirlos

#### Scenario: Edición sin cambiar el documento propio
- **WHEN** se corrige otro campo manteniendo el documento de la propia inscripción
- **THEN** el sistema permite guardar sin tratarla como un duplicado

#### Scenario: Acceso no autorizado o evento incorrecto
- **WHEN** se intenta editar sin permiso administrativo para el evento, como acreditador o usando una inscripción de otro evento
- **THEN** el sistema rechaza la operación sin modificar la inscripción

#### Scenario: Cancelación
- **WHEN** el administrador cancela la edición antes de guardar
- **THEN** el formulario se cierra sin modificar la inscripción

#### Scenario: Actualización de las vistas
- **WHEN** se guardan correctamente los datos
- **THEN** el sistema revalida acreditación, resumen, reportes y listado administrativo de certificados
