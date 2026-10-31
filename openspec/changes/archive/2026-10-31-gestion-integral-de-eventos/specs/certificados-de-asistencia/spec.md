## Purpose

Generar certificados individuales o compartidos según la modalidad del evento y permitir que sus destinatarios los consulten y descarguen de forma segura sin depender del correo electrónico.

## ADDED Requirements

### Requirement: Plantilla configurable y vista previa
El sistema SHALL permitir configurar por modalidad de cada evento una plantilla de certificado y previsualizar el resultado con datos de ejemplo antes de generar certificados definitivos, manteniendo compatibilidad con la configuración histórica del evento.

#### Scenario: Vista previa
- **WHEN** un administrador solicita la vista previa de la plantilla de un evento
- **THEN** el sistema muestra un PDF representativo sin crear certificados definitivos

### Requirement: Textos configurables por evento
El sistema SHALL permitir configurar de forma independiente las secciones de texto de los certificados por modalidad de cada evento, incluidas las variables del participante, documento, evento, lugar y fecha y el bloque de integrantes de certificados compartidos, manteniendo textos predeterminados para eventos sin configuración propia.

#### Scenario: Personalización de un evento
- **WHEN** un administrador guarda textos personalizados y solicita la vista previa del certificado
- **THEN** el sistema compone el PDF con esos textos y reemplaza las variables por los datos representativos del evento y del participante

#### Scenario: Evento existente sin personalización
- **WHEN** se genera o previsualiza un certificado de un evento que no posee textos configurados
- **THEN** el sistema utiliza todas las secciones de texto predeterminadas

### Requirement: Elegibilidad por asistencia
El sistema SHALL generar certificados individuales únicamente para titulares acreditados y certificados compartidos únicamente para exposiciones cuyo alumno responsable esté acreditado. Un director o codirector MUST poder descargar el mismo PDF del grupo sin acreditación propia cuando el alumno esté acreditado y la entrega de su modalidad esté habilitada.

#### Scenario: Persona acreditada
- **WHEN** se genera el lote de certificados de un evento
- **THEN** el sistema incluye cada inscripción individual acreditada y cada exposición cuyo alumno esté acreditado, según su modalidad

#### Scenario: Persona ausente
- **WHEN** un titular individual o el alumno responsable de una exposición no tiene asistencia acreditada
- **THEN** el sistema no genera ni habilita su certificado individual o compartido respectivamente

#### Scenario: Director ausente y alumno presente
- **WHEN** un director o codirector no está acreditado pero el alumno responsable de su exposición sí lo está
- **THEN** todos los integrantes pueden descargar el mismo PDF emitido de esa exposición con nombres, DNI y funciones de sus miembros

### Requirement: Generación idempotente
El sistema MUST evitar certificados duplicados para la misma inscripción individual o exposición y evento, incluso si un administrador inicia el proceso más de una vez. Los destinatarios de un certificado compartido MUST referenciar un solo archivo.

#### Scenario: Repetición del proceso masivo
- **WHEN** se vuelve a iniciar la generación para un evento ya procesado
- **THEN** el sistema reutiliza los certificados existentes y crea únicamente los que falten

### Requirement: Consulta pública de certificados
El sistema SHALL permitir que una persona consulte sus certificados mediante su documento normalizado, sin exigir una cuenta, conservando el flujo vigente de recursos y mostrando únicamente certificados propios o de exposiciones a las que pertenece. Los límites de consulta y la autorización temporal MUST conservarse.

#### Scenario: Datos coincidentes con varios certificados
- **WHEN** una persona proporciona un documento que corresponde a inscripciones con recursos elegibles
- **THEN** el sistema muestra únicamente los certificados propios y compartidos autorizados, identificados por evento, fecha y exposición cuando corresponda

#### Scenario: Datos incorrectos o sin certificados
- **WHEN** el documento no corresponde a una inscripción con recursos elegibles
- **THEN** el sistema muestra una respuesta genérica que no revela cuál dato existe ni información de otras personas

### Requirement: Protección contra consultas abusivas
El sistema MUST limitar los intentos de consulta y evitar que las respuestas permitan enumerar documentos, emails, inscripciones o certificados.

#### Scenario: Límite de intentos excedido
- **WHEN** un origen supera el número permitido de consultas dentro de la ventana configurada
- **THEN** el sistema rechaza temporalmente nuevas consultas con un mensaje genérico y sin revelar datos personales

### Requirement: Descarga temporal y privada
El sistema MUST autorizar cada descarga pública mediante una credencial temporal vinculada a los certificados encontrados y SHALL impedir su almacenamiento en cachés compartidas.

La descarga MUST reevaluar pertenencia, vigencia de datos y acreditación propia para certificados individuales o acreditación del alumno responsable para certificados compartidos.

#### Scenario: Descarga autorizada
- **WHEN** una persona solicita un certificado incluido en una consulta válida cuya autorización no venció
- **THEN** el sistema entrega el PDF como archivo descargable sin exponer credenciales de PocketBase

#### Scenario: Enlace directo o autorización vencida
- **WHEN** se intenta descargar un certificado sin autorización, con una autorización vencida o con una autorización que pertenece a otro certificado
- **THEN** el sistema rechaza la solicitud sin confirmar si el certificado existe

### Requirement: Gestión individual de certificados
El sistema SHALL permitir a un administrador descargar el certificado de una persona acreditada y consultar si el archivo ya fue generado.

#### Scenario: Descarga administrativa
- **WHEN** un administrador solicita descargar un certificado existente
- **THEN** el sistema entrega el PDF mediante una operación protegida por la sesión administrativa
