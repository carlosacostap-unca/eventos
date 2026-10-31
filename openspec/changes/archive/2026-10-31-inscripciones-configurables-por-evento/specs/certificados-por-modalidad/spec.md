## Purpose

Emitir y ofrecer certificados según la modalidad de participación, incluyendo un único PDF por exposición compartido por sus integrantes y condicionado a la acreditación del alumno responsable.

## ADDED Requirements

### Requirement: Composición configurable de plantillas y datos del trabajo
El sistema SHALL admitir plantillas PDF con áreas de cuerpo, integrantes y fecha, conservando su marco, encabezado y firmas. Los textos SHALL poder utilizar respuestas principales configuradas mediante variables de campo, sin interpretar su contenido como instrucciones ni como otras variables. El sistema MUST mantener todos los nombres, DNI y funciones dentro de áreas legibles y continuar en páginas adicionales si es necesario.

#### Scenario: Certificado de una comunicación oral
- **WHEN** la modalidad solicita un título obligatorio y su certificado incluye ese campo
- **THEN** el PDF contiene el título, la identidad del alumno y los integrantes con DNI, respetando las áreas de la plantilla y sin conservar campos interactivos

#### Scenario: Corrección del título emitido
- **WHEN** se modifica una respuesta principal utilizada en un certificado emitido
- **THEN** el documento queda pendiente de regeneración y se conserva el mismo criterio de acceso para todos sus destinatarios

#### Scenario: Fondo sin áreas configuradas
- **WHEN** una modalidad utiliza una plantilla anterior sin campos de composición
- **THEN** el generador conserva el comportamiento anterior

### Requirement: Certificado individual de asistencia
El sistema SHALL generar un certificado individual para un Asistente solamente cuando su modalidad tenga entrega habilitada y su propia acreditación esté vigente, utilizando la plantilla y los textos configurados para esa modalidad.

#### Scenario: Asistente acreditado
- **WHEN** se ejecuta la generación y el asistente está acreditado
- **THEN** se emite o reutiliza su certificado individual de asistencia

#### Scenario: Asistente ausente o entrega deshabilitada
- **WHEN** el asistente no está acreditado o su modalidad no entrega certificados
- **THEN** no se genera ni se habilita la descarga de un certificado individual

### Requirement: Un certificado compartido por exposición
El sistema MUST emitir un único PDF de expositor por exposición, con apellido, nombre, DNI y función del alumno, del director y del codirector cuando exista. Todos los integrantes MUST acceder al mismo certificado y al mismo archivo almacenado, sin producir copias personalizadas por destinatario ni certificados individuales de expositor para los miembros de ese grupo.

#### Scenario: Tres integrantes descargan
- **WHEN** alumno, director y codirector consultan por separado un certificado disponible de su exposición
- **THEN** los tres obtienen el mismo identificador de certificado y exactamente los mismos bytes del PDF con todos sus integrantes

#### Scenario: Exposición sin codirector
- **WHEN** se genera el certificado de un grupo con alumno y director
- **THEN** el PDF incluye a ambos con sus funciones y no muestra un integrante vacío ni un codirector inexistente

### Requirement: Elegibilidad por acreditación del alumno responsable
El sistema MUST habilitar la generación y descarga del certificado compartido únicamente si el alumno responsable de esa exposición está acreditado y la entrega está habilitada. La acreditación propia del director o codirector MUST ser independiente de su derecho a ese PDF. Los requisitos de elegibilidad MUST reevaluarse al consultar y en cada descarga.

#### Scenario: Alumno presente y acompañantes ausentes
- **WHEN** el alumno está acreditado y su director y codirector no lo están
- **THEN** el certificado se puede generar y todos pueden descargarlo una vez emitido

#### Scenario: Solo director presente
- **WHEN** el alumno no está acreditado aunque su director o codirector sí lo estén
- **THEN** no se genera ni se permite descargar el certificado de esa exposición

#### Scenario: Revocación del alumno después de emitir
- **WHEN** se revoca la acreditación del alumno después de generar el PDF y de emitir autorizaciones de descarga
- **THEN** se bloquean nuevas descargas para todos sus integrantes, incluso con autorizaciones anteriores

#### Scenario: Director en varias exposiciones
- **WHEN** un director integra dos exposiciones y solamente el alumno de una está acreditado
- **THEN** puede obtener únicamente el certificado habilitado de esa exposición y no el de la otra

### Requirement: Generación idempotente y regeneración explícita
El sistema MUST mantener un certificado por inscripción individual o por exposición según su alcance, incluso con generación concurrente o reintentos. La generación habitual SHALL reutilizar los PDFs existentes; la regeneración explícita SHALL reemplazar el archivo conservando su identidad y destinatarios vigentes y registrar el resultado en auditoría.

#### Scenario: Dos lotes simultáneos
- **WHEN** se generan certificados de la misma exposición simultáneamente
- **THEN** queda un solo certificado lógico y todos sus integrantes acceden a ese archivo

#### Scenario: Cambio de texto o plantilla
- **WHEN** se modifica la presentación de una modalidad que ya tiene certificados emitidos
- **THEN** los PDFs conservan su contenido hasta que un administrador solicita regenerarlos

#### Scenario: Fallo de generación
- **WHEN** falla la composición o persistencia del nuevo PDF durante una regeneración
- **THEN** no se publica un archivo parcial ni se presenta una regeneración como exitosa

### Requirement: Vista previa grupal completa
El sistema SHALL permitir previsualizar por modalidad el certificado con datos representativos y reemplazar variables admitidas, incluyendo integrantes y funciones para certificados grupales. La vista previa MUST permitir comprobar nombres largos, DNI, textos y firmas sin crear certificados definitivos.

#### Scenario: Revisión antes de emitir
- **WHEN** se previsualiza la modalidad Expositor con tres integrantes y nombres extensos
- **THEN** el PDF muestra todos los integrantes y sus funciones de forma legible sin superponerse con las firmas

### Requirement: Consulta y descarga restringidas a integrantes vigentes
El sistema SHALL extender la consulta pública vigente por DNI para mostrar certificados individuales propios y compartidos de las exposiciones que integra la persona, con identificación suficiente para distinguirlas. MUST conservar límites de consulta, respuestas genéricas, autorización temporal, descarga privada y validación de pertenencia actual sin exigir acreditación propia a los integrantes vinculados de un certificado compartido elegible.

#### Scenario: Consulta de director ausente
- **WHEN** un director sin acreditación propia consulta su DNI y posee una exposición con alumno acreditado y PDF emitido
- **THEN** puede obtener autorización para ese PDF compartido
- **AND** esto no le otorga acceso a materiales por acreditación ajena

#### Scenario: Persona ajena o vínculo retirado
- **WHEN** una persona ajena solicita el certificado o un integrante retirado usa una autorización anterior
- **THEN** la descarga se rechaza con respuesta genérica y sin revelar el archivo

#### Scenario: Certificado aún sin emitir
- **WHEN** un integrante consulta una exposición elegible cuyo PDF no fue generado
- **THEN** el portal indica que el certificado está pendiente sin ofrecer un archivo inexistente

#### Scenario: Certificado histórico
- **WHEN** un asistente consulta un certificado emitido antes de esta actualización
- **THEN** mantiene su acceso por los mecanismos vigentes y descarga el PDF existente sin regeneración obligatoria

### Requirement: Correcciones de integrantes y contenido emitido
El sistema MUST detectar cuando una corrección de identidad o de integrantes deja desactualizado un certificado compartido, impedir que el portal lo presente como vigente y permitir su regeneración administrativa con los datos corregidos. Un integrante retirado MUST perder el acceso inmediatamente.

#### Scenario: Corrección del DNI de un director
- **WHEN** se corrige el DNI del director de una exposición con certificado emitido
- **THEN** el certificado queda señalado como pendiente de regeneración y se bloquea su descarga hasta actualizarlo
- **AND** el nuevo PDF se comparte entre todos los integrantes vigentes
