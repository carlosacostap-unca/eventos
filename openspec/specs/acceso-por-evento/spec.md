# Acceso por evento

## Purpose

Delegar la administración y la acreditación de eventos mediante permisos individuales por evento, conservando la administración general y el aislamiento de datos entre equipos.

## Requirements

### Requirement: Administrador general compatible
El sistema SHALL conservar las cuentas administrativas existentes como administradores generales con acceso a todos los eventos, creación de eventos, tipos globales y gestión de personal y asignaciones.

#### Scenario: Cuenta existente
- **WHEN** un administrador existente inicia sesión después de la actualización
- **THEN** conserva el acceso general y no requiere asignaciones individuales

### Requirement: Asignaciones administradas por la plataforma
El sistema SHALL permitir únicamente al administrador general crear cuentas operativas y asignar, cambiar o revocar su rol de administrador de evento o acreditador para uno o varios eventos. Una cuenta SHALL tener como máximo un rol por evento, pudiendo variar entre eventos. Las cuentas operativas SHALL usar el acceso autenticado existente; ninguna asignación SHALL conceder administración general.

#### Scenario: Equipo de un evento
- **WHEN** el administrador general selecciona una cuenta y un rol en el equipo de un evento
- **THEN** se guarda una asignación única para ese usuario y evento y se muestra el equipo actualizado
- **AND** quedan auditados el actor, el usuario destinatario, el evento y el rol

#### Scenario: Roles diferentes
- **WHEN** una persona es administradora del evento A y acreditadora del evento B
- **THEN** obtiene los permisos de cada rol únicamente dentro del evento correspondiente

#### Scenario: Intento de delegación no autorizado
- **WHEN** un usuario sin administración general intenta gestionar cuentas o asignaciones por interfaz, URL, acción directa o API
- **THEN** la operación se rechaza sin modificar cuentas ni permisos

### Requirement: Administración limitada al evento
El sistema SHALL permitir al administrador de evento gestionar resumen, configuración, modalidades y formularios, disertantes, acreditación, exposiciones, certificados, materiales y reportes únicamente en sus eventos asignados. El listado administrativo SHALL mostrarle solo esos eventos; la creación de eventos y la gestión global SHALL permanecer reservadas al administrador general.

#### Scenario: Gestión de un evento asignado
- **WHEN** una persona administra el evento A y abre sus secciones
- **THEN** puede realizar las operaciones administrativas existentes de A
- **AND** no puede asignar personal ni acceder a datos administrativos de B sin asignación

### Requirement: Operación de acreditación
El sistema SHALL permitir al acreditador buscar inscriptos, marcar asistencia y corregir una marcación de asistencia en eventos asignados. También SHALL permitirle inscribir presencialmente a una persona nueva y dejarla acreditada cuando haya cupo, respetando validación de datos, documentos únicos y modalidades vigentes. El acreditador SHALL acceder solo a la información necesaria para esas operaciones, sin configuración, edición de inscripciones existentes, reportes, exportaciones, materiales administrativos ni emisión de certificados.

#### Scenario: Persona ya inscripta
- **WHEN** el acreditador encuentra una inscripción de su evento y confirma su llegada
- **THEN** se registra la acreditación con fecha y actor, sin duplicar la inscripción

#### Scenario: Alta presencial disponible
- **WHEN** el acreditador presenta datos válidos de una persona nueva y existe cupo en su evento
- **THEN** se crea una inscripción presencial acreditada y se audita el actor

#### Scenario: Cupo agotado o formulario manipulado
- **WHEN** el acreditador intenta un alta sin cupo, incluso enviando una confirmación de excepción
- **THEN** el servidor rechaza el alta y no ofrece ni concede una excepción administrativa

#### Scenario: Último lugar concurrente
- **WHEN** dos altas de acreditadores compiten por el último lugar permitido
- **THEN** como máximo una obtiene ese lugar
- **AND** las altas presenciales previas se consideran al verificar disponibilidad para acreditadores

#### Scenario: Capacidad ilimitada
- **WHEN** el evento no tiene límite de cupo y los datos y la modalidad son válidos
- **THEN** el acreditador puede inscribir y acreditar a una persona nueva

### Requirement: Autorización efectiva y revocable
El sistema SHALL verificar identidad, permiso actual y pertenencia de cada recurso en las lecturas y escrituras administrativas, incluidas descargas y exportaciones. La navegación SHALL reflejar esos permisos. Una revocación o cambio de rol SHALL aplicarse en la siguiente solicitud aunque la sesión o la página sigan abiertas. Ante falta de identidad o imposibilidad de verificar permisos, el sistema SHALL denegar el acceso protegido.

#### Scenario: Acceso cruzado por identificador
- **WHEN** un usuario autorizado en A envía el identificador de una inscripción, archivo, certificado, exposición o disertante de B
- **THEN** se rechaza el acceso sin revelar sus datos ni modificar el recurso

#### Scenario: Revocación con sesión abierta
- **WHEN** el administrador general revoca la asignación mientras el usuario tiene una página abierta
- **THEN** la siguiente lectura o mutación protegida del usuario en ese evento se rechaza

#### Scenario: Cuenta operativa sin eventos
- **WHEN** una cuenta operativa inicia sesión sin asignaciones
- **THEN** ve un estado sin eventos asignados y no obtiene acceso administrativo a ningún evento

#### Scenario: Acceso directo al almacenamiento
- **WHEN** una cuenta operativa intenta eludir la aplicación accediendo directamente a los datos protegidos
- **THEN** no obtiene privilegios generales ni puede alterar su rol o asignaciones

#### Scenario: Funciones públicas
- **WHEN** un visitante consulta la agenda, se inscribe o accede a sus certificados y materiales mediante el flujo público existente
- **THEN** conserva ese flujo sin necesitar un rol de personal
