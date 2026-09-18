## Purpose

Facilitar la operación del día del evento mediante búsqueda rápida, registro confiable de asistencia y alta controlada de personas no inscriptas previamente.

## ADDED Requirements

### Requirement: Consulta operativa de inscriptos
El sistema SHALL permitir a un administrador buscar participantes de un evento por nombre, apellido, email o documento y ver su estado de inscripción y asistencia.

#### Scenario: Búsqueda de una persona
- **WHEN** un administrador introduce un dato parcial o completo de una persona
- **THEN** el sistema muestra las coincidencias del evento con su estado actual

### Requirement: Acreditación idempotente
El sistema SHALL permitir marcar la asistencia de una persona inscripta y SHALL conservar la fecha y el administrador responsable sin duplicar la acreditación.

#### Scenario: Primera acreditación
- **WHEN** un administrador acredita a una persona inscripta
- **THEN** el sistema la marca como asistente y registra fecha y responsable

#### Scenario: Acreditación repetida
- **WHEN** se intenta acreditar nuevamente a una persona ya acreditada
- **THEN** el sistema mantiene una sola acreditación e informa su estado existente

### Requirement: Alta presencial con excepción de cupo
El sistema SHALL permitir que un administrador registre y acredite a una persona presencial aunque el cupo público esté completo. El sistema SHALL advertir cuando el alta supera el cupo y SHALL identificar su origen como presencial.

#### Scenario: Alta presencial con evento completo
- **WHEN** un administrador confirma el alta de una persona nueva en un evento sin cupo público disponible
- **THEN** el sistema registra y acredita a la persona, marca el origen presencial y conserva la excepción en la auditoría

#### Scenario: Alta presencial duplicada
- **WHEN** el documento de la persona ya existe en el evento
- **THEN** el sistema no crea otra inscripción y permite trabajar con el registro existente

### Requirement: Corrección de asistencia
El sistema SHALL permitir que un administrador corrija una acreditación realizada por error y SHALL conservar la trazabilidad de la corrección.

#### Scenario: Revocación de una acreditación
- **WHEN** un administrador desmarca una asistencia y confirma la acción
- **THEN** el sistema actualiza el estado y registra quién realizó la corrección y cuándo
