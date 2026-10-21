## Purpose

Brindar a los administradores información operativa y resultados confiables sobre inscripción, asistencia y procedencia de participantes de cada evento.

## ADDED Requirements

### Requirement: Resumen estadístico por evento
El sistema SHALL mostrar para cada evento el cupo, total de inscripciones públicas, altas presenciales, personas acreditadas, personas ausentes y porcentaje de asistencia.

Los reportes SHALL distinguir personas únicas por modalidad, reservas principales, exposiciones y documentos emitidos; un director compartido no debe duplicar el total de personas ni transformar un certificado grupal en varios documentos.

#### Scenario: Consulta de estadísticas
- **WHEN** un administrador abre el resumen de un evento
- **THEN** el sistema calcula y muestra las métricas usando los estados vigentes de sus participantes

#### Scenario: Evento sin inscriptos
- **WHEN** un evento no posee participantes
- **THEN** el sistema muestra contadores en cero y un porcentaje de asistencia sin error de cálculo

### Requirement: Listado filtrable de participantes
El sistema SHALL permitir consultar y filtrar participantes por texto, origen de inscripción, estado de acreditación, modalidad y función.

#### Scenario: Filtro de asistentes presenciales
- **WHEN** un administrador selecciona origen presencial y estado acreditado
- **THEN** el sistema muestra únicamente los registros que cumplen ambos criterios

### Requirement: Exportación CSV
El sistema SHALL permitir exportar un archivo CSV del listado completo o filtrado con datos personales, modalidad, origen, estado, respuestas configuradas y fechas relevantes, y un CSV de vínculos con una fila por integrante y exposición claramente diferenciada del listado de personas únicas.

#### Scenario: Exportación filtrada
- **WHEN** un administrador exporta un listado con filtros activos
- **THEN** el sistema descarga un CSV que contiene las mismas personas y criterios visibles en la consulta

### Requirement: Protección de datos administrativos
El sistema SHALL limitar estadísticas, listados y exportaciones a administradores autenticados.

#### Scenario: Solicitud de reporte sin autorización
- **WHEN** una persona no autenticada solicita un reporte o exportación
- **THEN** el sistema rechaza la solicitud sin revelar datos personales
