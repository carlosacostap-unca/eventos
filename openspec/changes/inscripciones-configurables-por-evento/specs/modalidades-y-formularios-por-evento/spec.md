## Purpose

Permitir que la administración adapte las modalidades, los datos solicitados y la certificación de cada evento mediante configuraciones reutilizables, sin cambios de código para cada jornada.

## ADDED Requirements

### Requirement: Modalidades configurables e independientes por evento
El sistema SHALL permitir a administradores configurar una o varias modalidades de inscripción por evento, con identificador estable, nombre visible, orden, disponibilidad y política de certificación. La modalidad de participación MUST ser independiente del tipo de evento, del origen público o presencial y del estado de acreditación.

#### Scenario: Jornada con dos modalidades
- **WHEN** se configura una jornada con Asistente y Expositor habilitados
- **THEN** la página pública permite elegir una modalidad y presenta el formulario correspondiente
- **AND** la administración conserva esa modalidad durante la acreditación

#### Scenario: Evento habitual
- **WHEN** un evento dispone únicamente de Asistente
- **THEN** presenta directamente el formulario habitual sin exigir una selección innecesaria

#### Scenario: Modalidad deshabilitada o ajena
- **WHEN** se intenta enviar una inscripción para una modalidad deshabilitada o perteneciente a otro evento
- **THEN** el servidor rechaza la solicitud sin guardar participantes ni reservar cupo

### Requirement: Formularios tipados con identidad mínima
El sistema SHALL exigir apellido, nombre, DNI y email para cada persona registrada y SHALL permitir configurar campos adicionales de texto corto, texto largo, número, fecha, email, teléfono, selección única, selección múltiple y casilla de verificación, con etiqueta, ayuda, orden, obligatoriedad y restricciones compatibles con su tipo. El sistema MUST validar en el servidor según la configuración vigente, señalar los campos incorrectos y conservar los valores ingresados al corregir errores.

#### Scenario: Campo particular del evento
- **WHEN** un administrador agrega un teléfono obligatorio o una carrera de selección a una modalidad
- **THEN** esos campos se muestran y validan únicamente en esa configuración

#### Scenario: Datos manipulados o inválidos
- **WHEN** una solicitud omite un campo obligatorio, aporta una opción inexistente o intenta guardar campos no definidos
- **THEN** se rechaza sin persistencia parcial y se indican los errores correspondientes

#### Scenario: Identidad protegida
- **WHEN** se intenta eliminar o volver opcional alguno de los cuatro datos de identidad
- **THEN** la configuración no puede publicarse

### Requirement: Secciones y grupos de integrantes configurables
El sistema SHALL permitir ordenar secciones y definir grupos de personas con función visible, mínimo, máximo y sus campos adicionales. Una configuración grupal MUST identificar a un único integrante principal responsable de la inscripción y de la regla de acreditación del grupo. Un grupo opcional agregado MUST cumplir todos sus campos obligatorios.

#### Scenario: Configuración de expositor con dirección
- **WHEN** se utiliza la configuración de jornada definida para este cambio
- **THEN** se solicita un alumno principal, exactamente un director y cero o un codirector, con apellido, nombre, DNI y email para cada uno
- **AND** no se exige teléfono salvo que el administrador lo agregue explícitamente

#### Scenario: Codirector incompleto
- **WHEN** el alumno agrega un codirector pero omite su email
- **THEN** el formulario solicita completar ese dato o retirar el grupo opcional antes de confirmar

#### Scenario: Cardinalidad incompatible
- **WHEN** se intenta publicar una configuración sin responsable o con un mínimo mayor al máximo
- **THEN** el sistema rechaza la configuración e identifica el problema

### Requirement: Política y presentación de certificados por modalidad
El sistema SHALL permitir configurar por modalidad entrega habilitada o deshabilitada, alcance individual o compartido por grupo, plantilla, textos, destinatarios y una regla de habilitación soportada. Las combinaciones admitidas MUST incluir certificado individual por acreditación propia y certificado compartido para todos los integrantes por acreditación del responsable.

#### Scenario: Certificados distintos en una jornada
- **WHEN** se configura Asistente con certificado individual y Expositor con certificado compartido
- **THEN** ambas modalidades tienen textos, plantilla, vista previa y reglas independientes dentro del mismo evento

#### Scenario: Regla no soportada
- **WHEN** se intenta combinar certificado grupal con una modalidad sin integrantes o sin responsable
- **THEN** el sistema rechaza la configuración

### Requirement: Versiones y reutilización de configuraciones
El sistema SHALL conservar la versión del formulario y de los roles utilizada por cada inscripción, publicar nuevas versiones sin reinterpretar respuestas anteriores y permitir copiar configuraciones entre eventos sin copiar personas, acreditaciones o certificados emitidos. Una modalidad utilizada MUST poder deshabilitarse para nuevas altas sin eliminar los datos históricos.

#### Scenario: Cambio después de recibir inscripciones
- **WHEN** se añade un campo obligatorio o se modifica la estructura del formulario
- **THEN** las nuevas altas usan la versión publicada y las anteriores mantienen sus respuestas y su interpretación
- **AND** un formulario abierto con una versión anterior recibe una indicación de actualizar antes de confirmar

#### Scenario: Reutilización en otra jornada
- **WHEN** un administrador copia la configuración de un evento anterior
- **THEN** obtiene modalidades, campos, grupos y configuración de certificados editables e independientes, sin participantes ni PDFs emitidos

#### Scenario: Administración no autorizada
- **WHEN** alguien sin sesión administrativa intenta modificar o copiar configuraciones
- **THEN** el sistema rechaza la operación sin revelar información privada

### Requirement: Compatibilidad con eventos existentes
El sistema SHALL conservar en los eventos existentes la inscripción de Asistente con los cuatro campos actuales, su estado de entrega de certificados, sus textos y plantilla, y los certificados ya emitidos.

#### Scenario: Evento anterior a la migración
- **WHEN** se abre o administra un evento existente después de la actualización
- **THEN** la inscripción, acreditación, certificados y enlaces públicos siguen funcionando con la modalidad Asistente
