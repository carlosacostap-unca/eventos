## Purpose

Generar y distribuir certificados verificables a las personas efectivamente acreditadas, con control administrativo y seguimiento confiable de cada envío.

## ADDED Requirements

### Requirement: Plantilla configurable y vista previa
El sistema SHALL permitir configurar por evento una plantilla de certificado y previsualizar el resultado con datos de ejemplo antes de generar certificados definitivos.

#### Scenario: Vista previa
- **WHEN** un administrador solicita la vista previa de la plantilla de un evento
- **THEN** el sistema muestra un PDF representativo sin crear envíos ni certificados definitivos

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

### Requirement: Envío de certificados con seguimiento
El sistema SHALL enviar por email los certificados generados y conservar para cada destinatario los estados pendiente, enviado o fallido, junto con la fecha y el detalle útil del último intento.

#### Scenario: Envío exitoso
- **WHEN** el proveedor de correo acepta el mensaje con el certificado
- **THEN** el sistema marca el envío como enviado y registra la fecha

#### Scenario: Envío fallido
- **WHEN** el proveedor de correo rechaza el mensaje o no responde correctamente
- **THEN** el sistema marca el envío como fallido, conserva el error y permite reintentarlo sin duplicar certificados

### Requirement: Gestión individual de certificados
El sistema SHALL permitir a un administrador descargar y reenviar el certificado de una persona acreditada.

#### Scenario: Reenvío individual
- **WHEN** un administrador solicita reenviar un certificado existente
- **THEN** el sistema crea un nuevo intento de envío y conserva el historial del resultado
