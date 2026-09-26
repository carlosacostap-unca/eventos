## Context

El repositorio contiene una aplicación Next.js 16 con App Router y Tailwind CSS, todavía sin dominio ni persistencia. PocketBase ya existe en un VPS y debe utilizarse para autenticación administrativa, almacenamiento de registros y archivos. Véanse `proposal.md` y las especificaciones del cambio para el comportamiento requerido.

PocketBase recomienda precaución con SSR porque compartir una instancia autenticada del SDK entre solicitudes puede mezclar sesiones. Además, el requisito del producto establece que el navegador no debe acceder directamente a PocketBase y que las reglas de negocio deben permanecer en Next.js.

## Goals / Non-Goals

**Goals:**

- Mantener una frontera clara: navegador -> Next.js -> PocketBase.
- Aislar la autenticación por solicitud y mantener secretos fuera del cliente.
- Garantizar el cupo y la unicidad frente a solicitudes simultáneas.
- Hacer idempotentes la acreditación y la generación de certificados.
- Permitir que cada titular consulte y descargue sus certificados sin exponer datos de otras personas ni credenciales de PocketBase.
- Permitir despliegue y operación en la infraestructura existente de Dokploy y PocketBase.

**Non-Goals:**

- Crear cuentas para asistentes.
- Enviar certificados por email o depender de un proveedor de correo.
- Exponer el SDK o la URL privada de PocketBase al código del navegador.
- Implementar lógica mediante hooks personalizados dentro de PocketBase.
- Incorporar lista de espera, pagos, venta de entradas, códigos QR o múltiples roles administrativos en esta primera versión.
- Usar tiempo real; las vistas operativas se actualizarán mediante navegación, acciones y refresco controlado.

## Decisions

### Next.js como única capa de aplicación

Las páginas públicas y privadas usarán Server Components para lectura y Server Actions o Route Handlers para mutaciones y descargas. Toda entrada se validará en el servidor antes de ejecutar servicios de dominio. Los componentes cliente se limitarán a interacción visual y nunca importarán el SDK de PocketBase.

Alternativa considerada: acceder directamente a PocketBase desde el navegador. Se descarta porque distribuiría validaciones y permisos entre dos capas y contradiría el límite acordado.

### Clientes PocketBase aislados y privilegios mínimos

Cada solicitud autenticada creará su propia instancia del SDK para cargar y validar el token de administración guardado en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`. No se compartirá un `authStore` mutable global entre usuarios.

Las operaciones de datos pasarán por un cliente de servicio disponible solo en el servidor. El operador proporcionará únicamente la URL, el email y la contraseña del superusuario de PocketBase. El aprovisionador derivará y sincronizará una identidad técnica perteneciente a una colección de autenticación específica; las solicitudes normales usarán esa identidad limitada por reglas de API y no el superusuario.

Alternativa considerada: reutilizar un cliente global autenticado como superusuario. Se descarta por el riesgo de mezclar estado entre solicitudes y por otorgar permisos innecesarios.

### Modelo de datos

PocketBase contendrá, como mínimo:

- `administradores`: colección de autenticación del panel.
- `cuentas_servicio`: identidad técnica restringida para Next.js.
- `eventos`: datos públicos, slug único, fechas, lugar, cupo, estado y habilitación de inscripción, además de la plantilla de certificado.
- `inscripciones`: relación con evento, datos personales normalizados, origen `publica` o `presencial`, número de cupo público y estado de acreditación.
- `auditoria`: actor, acción, entidad, fecha y metadatos mínimos de cambios sensibles.
- `certificados`: relación única con inscripción, archivo PDF y datos de generación.
- `limites_consulta_certificados`: contador temporal asociado a una clave derivada para limitar intentos sin guardar el DNI ni la IP en claro.

Se crearán índices únicos para el slug del evento, para `(evento, documento_normalizado)`, para `(evento, numero_cupo_publico)` y para el certificado de cada inscripción. Un índice adicional por `documento_normalizado` permitirá resolver consultas de certificados entre eventos.

### Reserva de cupo resistente a concurrencia

Next.js calculará el siguiente número de cupo público y creará la inscripción con un índice único por evento y número. Ante una colisión concurrente, repetirá la lectura; si ya se alcanzó el máximo, rechazará la solicitud. Así, dos solicitudes no pueden confirmar el último lugar. Las altas presenciales tendrán el número de cupo público vacío y podrán exceder el máximo con autorización administrativa.

Alternativa considerada: contar inscripciones y luego insertar sin restricción única. Se descarta porque dos solicitudes concurrentes podrían exceder el cupo.

### Sesiones y autorización

El inicio de sesión validará credenciales contra `administradores` y conservará el token únicamente en una cookie segura. Una capa de acceso a datos validará la sesión dentro de cada operación protegida; el control temprano de navegación será solo una optimización y no la barrera de seguridad principal. La primera versión tendrá un único rol administrativo.

### Certificados y consulta pública protegida

La aplicación generará PDF a partir de una plantilla por evento y almacenará el archivo en PocketBase. La combinación evento-inscripción será idempotente. Al cerrar un evento, el administrador podrá previsualizar e iniciar el lote para acreditados.

La ruta pública `/mis-certificados` solicitará documento y email. Next.js normalizará ambos valores y buscará inscripciones que coincidan exactamente y posean un certificado generado. La respuesta solo mostrará título y fecha del evento y no distinguirá entre datos incorrectos, inscripciones sin acreditar o certificados todavía no generados.

Una consulta válida emitirá una autorización firmada, de corta duración y limitada a los identificadores de los certificados encontrados. El Route Handler de descarga validará esa autorización en el servidor antes de recuperar el archivo con la cuenta de servicio. Tanto la consulta como la descarga usarán `Cache-Control: no-store`; la página se excluirá de indexación.

Los intentos se limitarán en PocketBase por una clave HMAC derivada de origen y documento, sin persistir esos valores en claro. La ventana inicial será de 15 minutos con un máximo de 5 intentos. La protección será independiente de cada proceso Next.js y seguirá funcionando con reinicios o múltiples réplicas.

Alternativa considerada: permitir búsquedas solo por DNI. Se descarta porque los documentos son predecibles y permitirían consultas dirigidas o enumeración. También se descarta usar enlaces públicos permanentes porque podrían compartirse y conservar acceso indefinido.

La generación dejará de crear trabajos en `envios_certificados`. El código del proveedor, el procesador programado y su configuración se retirarán. Las colecciones y registros históricos de envío existentes no se eliminarán automáticamente durante la migración.

### Aprovisionamiento reproducible

El repositorio incluirá un comando de configuración que cree o actualice las colecciones, campos, índices y reglas requeridos mediante la API administrativa de PocketBase. Las credenciales necesarias se usarán solo al ejecutar ese comando y no formarán parte del código ni del historial Git.

## Risks / Trade-offs

- [La cuenta de servicio concentra acceso a datos] -> aplicar reglas de API de mínimo privilegio, secretos solo del servidor, rotación y bloqueo de acceso directo a PocketBase cuando la red lo permita.
- [El flujo de cupos depende de índices correctos] -> aprovisionar y verificar índices antes de habilitar inscripciones y probar concurrencia sobre el último lugar.
- [Datos personales sensibles en listados y exportaciones] -> exigir sesión en cada operación, evitar caché pública y registrar exportaciones en auditoría.
- [El DNI y el email pueden ser conocidos por terceros] -> exigir coincidencia exacta de ambos, limitar intentos, responder de forma genérica y usar autorizaciones breves.
- [Un atacante puede distribuir consultas entre varias direcciones IP] -> combinar origen y documento en la clave de límite, registrar señales mínimas y permitir incorporar un desafío adicional si el abuso real lo justifica.
- [Los enlaces de descarga pueden compartirse] -> limitar cada autorización a certificados concretos, darle vencimiento corto y evitar caché.
- [Una plantilla inválida puede producir certificados defectuosos] -> exigir vista previa y validación antes de iniciar el lote.
- [PocketBase o el VPS pueden no estar disponibles] -> mostrar errores recuperables, no confirmar operaciones no persistidas y mantener los trabajos pendientes para el siguiente intento.

## Migration Plan

1. Configurar en un entorno de prueba la URL de PocketBase y credenciales de aprovisionamiento.
2. Ejecutar el comando de esquema y verificar colecciones, reglas e índices.
3. Derivar y crear la cuenta de servicio, sincronizar el administrador con las credenciales suministradas y guardar los secretos en Dokploy.
4. Desplegar Next.js con las funciones públicas deshabilitadas por defecto.
5. Ejecutar pruebas de autenticación, concurrencia de cupo, acreditación, consulta pública y descarga protegida.
6. Habilitar un evento de prueba, generar un certificado, validar su consulta con DNI y email y después habilitar eventos reales.

Para revertir, se desplegará la versión anterior de Next.js y se deshabilitarán las inscripciones de los eventos. Las colecciones de límites y los registros históricos de envío no se eliminarán automáticamente para preservar información y permitir recuperación.

## Open Questions

- Identidad visual y dimensiones de la primera plantilla institucional de certificados.
