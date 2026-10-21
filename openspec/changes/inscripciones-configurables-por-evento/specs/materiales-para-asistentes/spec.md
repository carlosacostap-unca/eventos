## MODIFIED Requirements

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
