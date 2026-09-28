## Purpose

Generar certificados verificables para las personas efectivamente acreditadas y permitir que cada titular los consulte y descargue de forma segura sin depender del correo electrónico.

## ADDED Requirements

### Requirement: Plantilla configurable y vista previa
El sistema SHALL permitir configurar por evento una plantilla de certificado y previsualizar el resultado con datos de ejemplo antes de generar certificados definitivos.

#### Scenario: Vista previa
- **WHEN** un administrador solicita la vista previa de la plantilla de un evento
- **THEN** el sistema muestra un PDF representativo sin crear certificados definitivos

### Requirement: Textos configurables por evento
El sistema SHALL permitir configurar de forma independiente las secciones de texto de los certificados de cada evento, incluidas las variables del participante, documento, evento, lugar y fecha, manteniendo textos predeterminados para eventos sin configuración propia.

#### Scenario: Personalización de un evento
- **WHEN** un administrador guarda textos personalizados y solicita la vista previa del certificado
- **THEN** el sistema compone el PDF con esos textos y reemplaza las variables por los datos representativos del evento y del participante

#### Scenario: Evento existente sin personalización
- **WHEN** se genera o previsualiza un certificado de un evento que no posee textos configurados
- **THEN** el sistema utiliza todas las secciones de texto predeterminadas

### Requirement: Elegibilidad por asistencia
El sistema SHALL generar certificados únicamente para inscripciones con asistencia acreditada en el evento.

#### Scenario: Persona acreditada
- **WHEN** se genera el lote de certificados de un evento
- **THEN** el sistema incluye a cada persona acreditada con datos válidos

#### Scenario: Persona ausente
- **WHEN** una inscripción no tiene asistencia acreditada
- **THEN** el sistema no genera ni envía un certificado para esa inscripción

### Requirement: Generación idempotente
El sistema MUST evitar certificados duplicados para la misma inscripción y evento, incluso si un administrador inicia el proceso más de una vez.

#### Scenario: Repetición del proceso masivo
- **WHEN** se vuelve a iniciar la generación para un evento ya procesado
- **THEN** el sistema reutiliza los certificados existentes y crea únicamente los que falten

### Requirement: Consulta pública de certificados
El sistema SHALL permitir que una persona consulte sus certificados generados mediante la coincidencia exacta de su documento normalizado y el email normalizado informado durante la inscripción, sin exigir una cuenta.

#### Scenario: Datos coincidentes con varios certificados
- **WHEN** una persona proporciona un documento y un email que coinciden con inscripciones que poseen certificados generados
- **THEN** el sistema muestra únicamente los certificados de esas inscripciones, identificados por evento y fecha

#### Scenario: Datos incorrectos o sin certificados
- **WHEN** el documento y el email no coinciden o todavía no existen certificados disponibles
- **THEN** el sistema muestra una respuesta genérica que no revela cuál dato existe ni información de otras personas

### Requirement: Protección contra consultas abusivas
El sistema MUST limitar los intentos de consulta y evitar que las respuestas permitan enumerar documentos, emails, inscripciones o certificados.

#### Scenario: Límite de intentos excedido
- **WHEN** un origen supera el número permitido de consultas dentro de la ventana configurada
- **THEN** el sistema rechaza temporalmente nuevas consultas con un mensaje genérico y sin revelar datos personales

### Requirement: Descarga temporal y privada
El sistema MUST autorizar cada descarga pública mediante una credencial temporal vinculada a los certificados encontrados y SHALL impedir su almacenamiento en cachés compartidas.

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
