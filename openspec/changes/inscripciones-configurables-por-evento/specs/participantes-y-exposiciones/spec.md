## Purpose

Representar a cada persona una sola vez dentro de un evento y vincular a los integrantes de las exposiciones, conservando su modalidad, acreditación individual y consistencia de inscripción.

## ADDED Requirements

### Requirement: Inscripción grupal completa y consistente
El sistema SHALL confirmar una exposición únicamente cuando existan el alumno responsable y todos los integrantes obligatorios válidos, y MUST guardar participantes, respuestas, vínculos y reserva de cupo como una operación indivisible e idempotente frente a reintentos de la misma solicitud. Un fallo MUST dejar el evento sin nuevas altas parciales ni reservas huérfanas.

#### Scenario: Alumno con director y codirector
- **WHEN** un alumno envía una inscripción válida en modalidad Expositor con los tres integrantes
- **THEN** la exposición y sus integrantes quedan disponibles en administración y acreditación, todos en modalidad Expositor

#### Scenario: Error durante el registro del director
- **WHEN** falla la persistencia de un integrante o vínculo
- **THEN** no se confirma ni queda registrada parcialmente la exposición y el usuario puede reintentar

#### Scenario: Reenvío después de una respuesta perdida
- **WHEN** se reenvía la misma solicitud ya confirmada con su identificador de operación
- **THEN** se devuelve la confirmación existente sin crear otra exposición ni consumir otro lugar

### Requirement: Exclusividad por documento y evento
El sistema MUST mantener un solo participante por DNI normalizado y evento, con una única modalidad. Ninguna alta pública, presencial o vinculada MUST permitir que una persona sea simultáneamente Asistente y Expositor. La inscripción pública MUST impedir que una persona se repita en distintas funciones de una misma exposición.

#### Scenario: Director intentado como asistente
- **WHEN** se intenta inscribir como asistente el DNI de alguien incorporado como director o codirector
- **THEN** el sistema rechaza el alta y en administración permite localizar su registro de expositor para acreditarlo

#### Scenario: Asistente informado como director
- **WHEN** una exposición incluye como director a alguien ya inscripto como asistente
- **THEN** se rechaza la solicitud completa con una indicación para resolver el conflicto mediante la administración, sin conversión automática

#### Scenario: Altas simultáneas en distintas modalidades
- **WHEN** se presentan simultáneamente el mismo DNI como asistente y como integrante expositor
- **THEN** se confirma como máximo una modalidad y la otra operación no deja registros parciales

#### Scenario: Misma persona en otro evento
- **WHEN** el DNI está registrado únicamente en otro evento
- **THEN** se permite la nueva inscripción si cumple las condiciones del evento actual

### Requirement: Integrantes compartidos entre exposiciones
El sistema SHALL permitir que un director o codirector integre varias exposiciones del mismo evento mediante vínculos a su participante existente, conservando una sola acreditación personal. La reutilización MUST comprobar modalidad compatible y coherencia de los datos sin permitir que un formulario público sobrescriba información de un participante existente.

#### Scenario: Director de dos alumnos
- **WHEN** dos alumnos registran al mismo director con datos normalizados coincidentes
- **THEN** existen dos exposiciones vinculadas al mismo participante director y una sola fila de acreditación para esa persona

#### Scenario: Identidad divergente
- **WHEN** una nueva solicitud usa el DNI de un integrante existente pero informa otros nombres o email incompatibles
- **THEN** se rechaza sin modificar al integrante existente y se indica que debe intervenir la administración

### Requirement: Acreditación independiente de la modalidad y de los vínculos
El sistema SHALL permitir buscar, acreditar y revocar la acreditación de cualquier participante por nombre, apellido, email o DNI, mostrando su modalidad, funciones y exposiciones vinculadas. La operación MUST ser idempotente, registrar actor y fecha y mantener intacta la modalidad y la acreditación de las demás personas.

#### Scenario: Director que concurre sin el alumno
- **WHEN** llega un director ya informado y se lo acredita
- **THEN** queda acreditado como Expositor sin crear un Asistente ni acreditar al alumno
- **AND** esa acción por sí sola no habilita el certificado de la exposición

#### Scenario: Alumno presente y director ausente
- **WHEN** se acredita al alumno y el director conserva su estado pendiente
- **THEN** se habilita la elegibilidad del certificado grupal y ambos estados personales se conservan

#### Scenario: Acreditación repetida o no autorizada
- **WHEN** se repite una acreditación ya confirmada o se solicita sin autorización administrativa
- **THEN** la repetición no duplica la operación y el acceso no autorizado no modifica datos

### Requirement: Cupo público y alta presencial compatibles
El sistema SHALL mantener el cupo público común del evento para solicitudes principales de Asistente o alumno Expositor, reservando un lugar por solicitud principal. Los directores y codirectores vinculados MUST ser identificables como altas vinculadas y no consumir una reserva pública adicional. Se MUST conservar el cierre manual, por finalización y por cupo, y la excepción presencial administrativa con confirmación de exceso.

#### Scenario: Último lugar entre modalidades
- **WHEN** un asistente y un alumno expositor solicitan simultáneamente el último lugar
- **THEN** se confirma como máximo una solicitud principal y sus integrantes sin superar el cupo

#### Scenario: Exposición con tres integrantes
- **WHEN** se confirma un alumno con director y codirector
- **THEN** se ocupa una reserva pública y se registran tres personas distintas para acreditación y estadísticas

#### Scenario: Alta presencial de expositor
- **WHEN** un administrador registra presencialmente a un alumno expositor
- **THEN** debe completar los grupos y campos de esa modalidad y la acreditación inicial se aplica solo a la persona presente
- **AND** el exceso de cupo requiere la confirmación administrativa vigente

#### Scenario: Evento cerrado
- **WHEN** se intenta confirmar públicamente en un evento cerrado, finalizado o completo
- **THEN** el sistema rechaza la solicitud sin incorporar participantes vinculados
