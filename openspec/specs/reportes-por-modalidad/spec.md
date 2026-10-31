# reportes-por-modalidad Specification

## Purpose

Ofrecer listados y resultados operativos que distingan modalidad de participación, acreditación personal, solicitudes principales y exposiciones sin duplicar a las personas compartidas entre grupos.

## Requirements

### Requirement: Listados con modalidad y funciones
El sistema SHALL permitir consultar participantes por búsqueda, origen, acreditación, modalidad y función dentro de una exposición, mostrando sus vínculos sin duplicar el participante principal en la vista de personas.

#### Scenario: Director de varios alumnos
- **WHEN** un administrador filtra Expositor y Director
- **THEN** encuentra una fila por persona y puede consultar todas sus exposiciones vinculadas

#### Scenario: Filtros combinados
- **WHEN** se seleccionan modalidad Expositor y estado no acreditado
- **THEN** aparecen los integrantes expositores pendientes aunque ya puedan descargar un certificado por acreditación del alumno

### Requirement: Métricas con unidades explícitas
El sistema SHALL informar personas únicas inscriptas y acreditadas por modalidad, porcentaje de acreditación personal, solicitudes públicas principales que ocupan cupo y cantidad de exposiciones. Los certificados compartidos MUST contarse como documentos por exposición y no como un documento por integrante.

#### Scenario: Dos alumnos y un director compartido
- **WHEN** hay dos exposiciones con dos alumnos distintos y el mismo director, sin codirectores
- **THEN** el reporte muestra tres personas expositoras, dos exposiciones y dos reservas públicas si ambas solicitudes fueron públicas
- **AND** muestra como máximo dos certificados grupales, sujetos a la acreditación de cada alumno

#### Scenario: Personas ausentes con certificado habilitado
- **WHEN** un director no se acredita pero accede al certificado de su grupo
- **THEN** sigue contando como no acreditado en las estadísticas de presencia

#### Scenario: Evento vacío
- **WHEN** no existen participantes ni exposiciones
- **THEN** los contadores y porcentajes se presentan sin errores de cálculo

### Requirement: Exportación consistente y protegida
El sistema SHALL exportar listados completos o filtrados con datos personales, modalidad, origen, estado y fecha de acreditación y respuestas adicionales. Para exposiciones SHALL ofrecer una exportación de integrantes con identificador de grupo, función, alumno responsable y estado del certificado, usando una fila por vínculo y encabezados que distingan los campos de cada versión.

#### Scenario: Exportación del listado de personas
- **WHEN** se exporta el listado filtrado de participantes
- **THEN** el archivo contiene las mismas personas del filtro, una fila por persona, y sus campos configurados

#### Scenario: Exportación de exposiciones
- **WHEN** se exportan dos exposiciones con un director compartido
- **THEN** aparecen dos grupos y un vínculo del director por grupo, sin que esas filas se confundan con personas únicas

#### Scenario: Acceso sin sesión
- **WHEN** una persona sin sesión administrativa solicita estadísticas o exportaciones
- **THEN** se rechaza la solicitud sin revelar información personal
- **AND** las exportaciones autorizadas conservan la auditoría vigente
