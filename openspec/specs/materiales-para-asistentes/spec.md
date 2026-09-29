# Materiales para asistentes

## Purpose

Compartir archivos de las charlas con asistentes acreditados a través del portal de certificados, conservando el acceso restringido a los eventos de su inscripción.

## Requirements

### Requirement: Gestión administrativa de materiales
El sistema SHALL permitir a administradores adjuntar, listar, descargar y eliminar materiales de cada evento, almacenando los archivos en el storage configurado.

#### Scenario: Carga válida
- **WHEN** un administrador adjunta una imagen, PDF o documento Office/OpenDocument de hasta 25 MB
- **THEN** el archivo queda asociado al evento con título, nombre original y tamaño
- **AND** la operación queda auditada

#### Scenario: Archivo inválido
- **WHEN** el archivo está vacío, supera 25 MB o tiene una extensión no admitida
- **THEN** el sistema rechaza la carga con un mensaje explicativo

#### Scenario: Eliminación
- **WHEN** el administrador confirma la eliminación de un material de su evento
- **THEN** el sistema elimina el archivo y deja de ofrecerlo a los asistentes

### Requirement: Acceso desde la acreditación
El sistema SHALL mostrar los materiales de las inscripciones acreditadas encontradas mediante la consulta por DNI, sin exigir certificado emitido.

#### Scenario: Certificado pendiente
- **WHEN** una persona acreditada consulta su documento y su certificado aún no existe
- **THEN** puede descargar los materiales disponibles y ve que el certificado no fue emitido

#### Scenario: Evento sin certificados
- **WHEN** el evento no entrega certificados pero tiene materiales
- **THEN** el asistente acreditado puede descargar esos materiales

### Requirement: Descarga protegida
El sistema SHALL exigir una autorización temporal válida y acreditación vigente en el evento correspondiente para descargar materiales o certificados desde el portal de asistentes.

#### Scenario: Acceso sin autorización
- **WHEN** se solicita una descarga sin autorización, con autorización vencida o para un evento ajeno
- **THEN** el sistema rechaza la descarga sin exponer enlaces ni tokens del storage

#### Scenario: Acreditación revocada
- **WHEN** se revoca la acreditación después de una consulta válida
- **THEN** las nuevas descargas dejan de estar autorizadas

#### Scenario: Enlace directo al almacenamiento
- **WHEN** alguien intenta acceder al archivo del material directamente en el storage sin autorización
- **THEN** el almacenamiento rechaza la solicitud

#### Scenario: Certificados ya disponibles
- **WHEN** una inscripción acreditada tiene un certificado emitido
- **THEN** el portal ofrece su descarga junto a los materiales del evento
