## Purpose

Ofrecer una inscripción pública sencilla y confiable para cada evento, sin exigir una cuenta al asistente y respetando validaciones, duplicados y cupos.

## ADDED Requirements

### Requirement: Página pública por evento
El sistema SHALL publicar una URL única por evento que muestre su información y el estado actual de la inscripción.

#### Scenario: Evento disponible
- **WHEN** una persona abre la URL pública de un evento existente
- **THEN** el sistema muestra sus datos y el formulario si la inscripción está disponible

#### Scenario: Evento inexistente
- **WHEN** una persona abre un identificador público que no corresponde a un evento
- **THEN** el sistema responde con una página de evento no encontrado

### Requirement: Formulario de inscripción sin cuenta
El sistema SHALL permitir registrarse sin crear una cuenta mediante nombres, apellidos, email y número de documento. Todos esos datos MUST ser obligatorios y normalizados antes de guardarse.

El sistema SHALL aplicar además los campos y grupos configurados para la modalidad elegida y confirmar las altas grupales de forma transaccional, conservando la versión del formulario.

#### Scenario: Inscripción válida
- **WHEN** una persona envía datos válidos a un evento con inscripción disponible
- **THEN** el sistema registra la inscripción y muestra una confirmación inequívoca

#### Scenario: Datos inválidos
- **WHEN** una persona omite un campo obligatorio o proporciona un email o documento inválido
- **THEN** el sistema no crea la inscripción y señala los datos que deben corregirse

### Requirement: Prevención de duplicados por evento
El sistema SHALL admitir un mismo documento una sola vez dentro de cada evento, con independencia de diferencias de formato o espacios.

La unicidad MUST abarcar todas las modalidades: una persona no puede ser Asistente y Expositor simultáneamente. Un integrante compatible de varias exposiciones SHALL reutilizar su identidad mediante vínculos sin crear otra inscripción personal.

#### Scenario: Documento ya inscripto
- **WHEN** se intenta registrar en un evento un documento normalizado que ya posee una inscripción
- **THEN** el sistema no crea un duplicado e informa que la persona ya está registrada

#### Scenario: Mismo documento en otro evento
- **WHEN** una persona registrada en un evento se inscribe en otro
- **THEN** el sistema permite la nueva inscripción si cumple las demás condiciones

### Requirement: Reserva consistente de cupo
El sistema MUST garantizar que las solicitudes principales públicas confirmadas nunca superen el cupo común configurado, incluso cuando varias modalidades se procesan simultáneamente. Cada asistente o alumno expositor reserva un lugar; los directores y codirectores vinculados MUST distinguirse y no consumir reservas adicionales.

#### Scenario: Último lugar solicitado simultáneamente
- **WHEN** dos personas intentan ocupar al mismo tiempo el último lugar disponible
- **THEN** el sistema confirma como máximo una inscripción y comunica a la otra que el cupo se completó

#### Scenario: Formulario cerrado
- **WHEN** una persona intenta inscribirse con el formulario deshabilitado o el cupo completo
- **THEN** el sistema rechaza la inscripción sin guardar datos parciales
