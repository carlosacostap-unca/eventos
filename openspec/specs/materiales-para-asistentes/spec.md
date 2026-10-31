# Materiales para asistentes

## Purpose

Compartir archivos de las charlas con asistentes acreditados a través del portal de certificados, conservando el acceso restringido a los eventos de su inscripción.

## Requirements

### Requirement: Gestión administrativa de materiales
El sistema SHALL permitir al administrador general y a administradores asignados al evento adjuntar, listar, descargar y eliminar materiales de ese evento, almacenando los archivos en el storage configurado. Los acreditadores SHALL carecer de acceso administrativo a los materiales.

#### Scenario: Carga válida
- **WHEN** un administrador autorizado adjunta una imagen, PDF o documento Office/OpenDocument de hasta 25 MB
- **THEN** el archivo queda asociado al evento con título, nombre original y tamaño
- **AND** la operación queda auditada

#### Scenario: Archivo inválido
- **WHEN** el archivo está vacío, supera 25 MB o tiene una extensión no admitida
- **THEN** el sistema rechaza la carga con un mensaje explicativo

#### Scenario: Eliminación
- **WHEN** el administrador autorizado confirma la eliminación de un material de su evento
- **THEN** el sistema elimina el archivo y deja de ofrecerlo a los asistentes

#### Scenario: Gestión o descarga administrativa no autorizada
- **WHEN** un acreditador o un administrador sin asignación intenta gestionar o descargar administrativamente un material del evento
- **THEN** el sistema rechaza la solicitud sin exponer el archivo ni modificarlo

### Requirement: Acceso desde la acreditación
El sistema SHALL mostrar los materiales de las inscripciones acreditadas encontradas mediante la consulta por DNI, sin exigir certificado emitido.

#### Scenario: Certificado pendiente
- **WHEN** una persona acreditada consulta su documento y su certificado aún no existe
- **THEN** puede descargar los materiales disponibles y ve que el certificado no fue emitido

#### Scenario: Evento sin certificados
- **WHEN** el evento no entrega certificados pero tiene materiales
- **THEN** el asistente acreditado puede descargar esos materiales

### Requirement: Descarga protegida
El sistema SHALL exigir una autorización temporal válida y acreditación propia vigente en el evento correspondiente para descargar materiales o certificados individuales desde el portal de participantes. Para certificados compartidos MUST exigir pertenencia vigente a la exposición y acreditación vigente del alumno responsable, independientemente de la acreditación propia del director o codirector. El derecho a un certificado compartido MUST NOT otorgar por sí mismo acceso a materiales.

#### Scenario: Acceso sin autorización
- **WHEN** se solicita una descarga sin autorización, con autorización vencida o para un evento ajeno
- **THEN** el sistema rechaza la descarga sin exponer enlaces ni tokens del storage

#### Scenario: Acreditación revocada
- **WHEN** se revoca la acreditación propia después de una consulta válida
- **THEN** las nuevas descargas de materiales y certificados individuales dejan de estar autorizadas
- **AND** el acceso a certificados compartidos se evalúa según pertenencia y acreditación del alumno responsable

#### Scenario: Enlace directo al almacenamiento
- **WHEN** alguien intenta acceder al archivo del material directamente en el storage sin autorización
- **THEN** el almacenamiento rechaza la solicitud

#### Scenario: Certificados ya disponibles
- **WHEN** una inscripción acreditada tiene un certificado emitido y elegible
- **THEN** el portal ofrece su descarga junto a los materiales del evento

#### Scenario: Director ausente con certificado compartido
- **WHEN** un director no acreditado consulta una exposición cuyo alumno está acreditado y posee certificado emitido
- **THEN** el portal permite descargar ese mismo PDF compartido
- **AND** no permite descargar materiales de ese evento hasta que el propio director se acredite

#### Scenario: Revocación del responsable
- **WHEN** se revoca la acreditación del alumno de una exposición con certificado compartido
- **THEN** las nuevas descargas de ese certificado se bloquean para todos sus integrantes incluso con autorizaciones anteriores
