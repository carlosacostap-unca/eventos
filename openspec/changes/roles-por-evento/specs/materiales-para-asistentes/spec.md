## MODIFIED Requirements

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
