## Purpose

Permitir que personal autorizado administre de forma segura múltiples eventos, sus datos públicos, el cupo disponible y el estado de las inscripciones.

## ADDED Requirements

### Requirement: Acceso administrativo autenticado
El sistema SHALL exigir autenticación para acceder al panel administrativo y SHALL impedir que una persona no autenticada consulte o modifique información privada.

#### Scenario: Acceso sin sesión
- **WHEN** una persona sin una sesión administrativa válida intenta abrir una ruta privada
- **THEN** el sistema la dirige al inicio de sesión sin mostrar datos administrativos

#### Scenario: Inicio de sesión válido
- **WHEN** un administrador presenta credenciales válidas
- **THEN** el sistema inicia una sesión segura y permite acceder al panel

### Requirement: Gestión de eventos
El sistema SHALL permitir a un administrador crear y editar eventos con título, descripción, fecha y hora, lugar, identificador público único, cupo máximo y estado de inscripción.

#### Scenario: Creación válida
- **WHEN** un administrador completa todos los datos obligatorios con un cupo entero mayor que cero
- **THEN** el sistema crea el evento y deja disponible su administración

#### Scenario: Datos inválidos
- **WHEN** un administrador intenta guardar un evento sin datos obligatorios o con un cupo inválido
- **THEN** el sistema rechaza la operación e identifica los campos que deben corregirse

### Requirement: Control manual y automático de inscripción
El sistema SHALL aceptar inscripciones públicas únicamente cuando el administrador las haya habilitado, el evento no haya finalizado y exista cupo disponible. El sistema SHALL considerar cerrado el formulario al alcanzar el cupo.

#### Scenario: Cupo completo
- **WHEN** la cantidad de inscripciones públicas alcanza el cupo máximo del evento
- **THEN** el sistema deja de aceptar nuevas inscripciones públicas y muestra que el cupo está completo

#### Scenario: Cierre anticipado
- **WHEN** un administrador deshabilita las inscripciones antes de completar el cupo
- **THEN** el formulario público deja de aceptar inscripciones

#### Scenario: Reapertura por aumento de cupo
- **WHEN** un administrador aumenta el cupo de un evento cuyas inscripciones están habilitadas y completas
- **THEN** el formulario vuelve a aceptar inscripciones hasta alcanzar el nuevo límite

### Requirement: Trazabilidad administrativa
El sistema SHALL registrar el administrador, la fecha y la acción para cambios sensibles de eventos, acreditaciones, altas presenciales y envíos de certificados.

#### Scenario: Registro de una acción sensible
- **WHEN** un administrador ejecuta una acción sensible
- **THEN** el sistema conserva un registro consultable con actor, fecha, entidad afectada y tipo de acción
