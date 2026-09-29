## Purpose

Permitir al personal administrativo corregir datos de inscripción durante la acreditación de cualquier evento, conservando la asistencia y la asignación de cupo.

## ADDED Requirements

### Requirement: Edición de identidad durante la acreditación
El sistema SHALL permitir a administradores editar apellidos, nombres, documento y email desde la lista de acreditación de cualquier evento.

#### Scenario: Corrección de una inscripción
- **WHEN** un administrador guarda datos válidos de una inscripción pública o presencial del evento
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
- **WHEN** se intenta editar sin sesión administrativa o usando una inscripción de otro evento
- **THEN** el sistema rechaza la operación sin modificar la inscripción

#### Scenario: Cancelación
- **WHEN** el administrador cancela la edición antes de guardar
- **THEN** el formulario se cierra sin modificar la inscripción

#### Scenario: Actualización de las vistas
- **WHEN** se guardan correctamente los datos
- **THEN** el sistema revalida acreditación, resumen, reportes y listado administrativo de certificados
