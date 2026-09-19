# Eventos UNCA

Aplicación de gestión integral de eventos construida con Next.js 16 y PocketBase. Permite publicar eventos, recibir inscripciones, acreditar asistentes, registrar altas presenciales, emitir certificados PDF, encolar su envío por correo y consultar estadísticas.

Toda la lógica de negocio y el acceso a PocketBase viven en el servidor de Next.js. El navegador usa páginas y Server Actions de Next.js y nunca recibe credenciales de servicio ni usa el SDK de PocketBase.

## Requisitos

- Node.js 22
- npm
- Una instancia reciente de PocketBase accesible desde el servidor de Next.js
- Un servidor SMTP para el envío real de certificados

## Configuración local

1. Instalá dependencias:

    npm install

2. Copiá .env.example como .env.local y completá sus valores.
3. Generá SESSION_SECRET e INTERNAL_JOBS_SECRET independientes, aleatorios y de al menos 32 caracteres.
4. Para PocketBase solo se requieren POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD.

El aprovisionador usa esas credenciales de superusuario para crear el esquema. También crea automáticamente una cuenta técnica derivada y limitada por las reglas de las colecciones; las operaciones normales de la aplicación usan esa cuenta limitada.

## Aprovisionamiento de PocketBase

El comando siguiente importa las colecciones, campos, reglas e índices y sincroniza la cuenta técnica y el administrador del panel con el email y la contraseña indicados:

    npm run schema:apply

Para actualizar solamente el esquema de una instancia ya configurada, sin cambiar las contraseñas de las cuentas, ejecutá:

    npm run schema:import

Se puede ejecutar nuevamente después de un despliegue: usa identificadores estables, actualiza el esquema y no elimina datos ajenos al manifiesto. Para comprobar una instalación nueva, ejecutalo dos veces y confirmá que ambas corridas finalicen con “Esquema de PocketBase actualizado correctamente”.

Colecciones creadas:

- administradores
- cuentas_servicio
- tipos_evento
- eventos
- inscripciones
- auditoria
- certificados
- envios_certificados

Los índices únicos impiden repetir el slug de un evento, el documento de una persona dentro del mismo evento, el número de cupo público y el certificado o trabajo de correo asociado.

## Desarrollo y verificación

    npm run dev
    npm run lint
    npm run typecheck
    npm test
    npm run build

La aplicación queda disponible en http://localhost:3000. El acceso administrativo está en /iniciar-sesion.

## Flujo operativo

1. Iniciá sesión con una cuenta de la colección administradores. También se acepta el superusuario de PocketBase configurado en el despliegue.
2. En Tipos de eventos, creá las categorías necesarias; podés editarlas y desactivarlas sin cambiar los eventos existentes.
3. Creá un evento, asignale un tipo y dejalo como borrador o con la inscripción deshabilitada.
4. Revisá su página pública y, cuando corresponda, publicalo y habilitá la inscripción.
5. Durante el evento, usá Acreditación para marcar asistentes o crear altas presenciales. Estas altas se acreditan de inmediato y pueden superar el cupo público.
6. En Certificados, validá la vista previa, generá el lote y controlá la cola.
7. En Reportes, filtrá participantes y exportá CSV.

## Procesador de correo

La generación de certificados crea trabajos persistentes pendientes. Un programador externo debe invocar periódicamente:

    curl -X POST \
      -H "Authorization: Bearer $INTERNAL_JOBS_SECRET" \
      https://eventos.example.com/api/internal/certificados/procesar

Una frecuencia de uno a cinco minutos es suficiente. Cada ejecución procesa hasta 20 trabajos. Los errores que se muestran en el panel se sanitizan y cada intento queda en el historial. Un envío fallido puede volver a encolarse desde la pantalla de certificados.

## Despliegue en Dokploy

Creá una aplicación desde este repositorio y elegí Nixpacks. El proyecto declara Node 22 en package.json.

- Comando de build: npm run build
- Comando de inicio: npm run start
- Puerto: 3000
- Health check sugerido: /
- Réplicas iniciales: 1, para evitar procesadores de correo simultáneos

Cargá en Dokploy las variables de .env.example. Para PocketBase son únicamente la URL, el email y la contraseña administrativa. La URL debe ser alcanzable desde el contenedor.

Después de desplegar:

1. Mantené los eventos como borrador o con inscripción deshabilitada.
2. Ejecutá npm run schema:apply en un trabajo temporal con las credenciales de superusuario.
3. Iniciá sesión y creá un evento de prueba.
4. Registrá una persona, acreditala y agregá un alta presencial.
5. Generá la vista previa y un certificado.
6. Ejecutá manualmente el endpoint interno y confirmá la recepción del correo.
7. Revisá estadísticas y el CSV.
8. Recién entonces habilitá la inscripción pública.

## Seguridad y rotación de secretos

- SESSION_SECRET cifra la cookie HttpOnly, Secure en producción y SameSite=Lax. Rotarlo cierra todas las sesiones administrativas.
- INTERNAL_JOBS_SECRET protege el procesador de correo. Rotá primero el valor en Dokploy y luego actualizá el programador.
- Al cambiar la contraseña administrativa de PocketBase, actualizala en Dokploy y ejecutá nuevamente npm run schema:apply para sincronizar la cuenta técnica y el acceso al panel.
- Usá TLS tanto para PocketBase como para la aplicación y SMTP.
- No expongas variables POCKETBASE_*, SMTP_* o secretos con prefijo NEXT_PUBLIC_.
- Las descargas, vistas previas y exportaciones administrativas vuelven a validar la sesión y deshabilitan caché.

## Respaldo y recuperación

Respaldá con regularidad el directorio pb_data de PocketBase y cualquier volumen asociado. Antes de una migración, hacé un respaldo consistente y probá la restauración en otra instancia.

Para recuperar el servicio:

1. Restaurá PocketBase y verificá sus colecciones.
2. Configurá POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD en Next.js.
3. Ejecutá npm run schema:apply para reconciliar el esquema sin borrar registros.
4. Rotá SESSION_SECRET e INTERNAL_JOBS_SECRET si el incidente pudo exponerlos.
5. Reanudá el procesador y reenviá solamente los trabajos fallidos desde el panel.

## OpenSpec

OpenSpec está instalado como dependencia de desarrollo. La configuración está en openspec/config.yaml y los skills en .agents/skills. Los cambios se documentan en español dentro de openspec/changes.



## MCP de PocketBase para Codex

El proyecto incluye un servidor MCP local por `stdio` en `mcp/pocketbase-server.ts`. Lee `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD` desde `.env.local`; las credenciales no se copian a la configuración de Codex ni se devuelven en las respuestas de las herramientas.

La configuración de proyecto está en `.codex/config.toml`. Abrí una nueva sesión de Codex dentro de este proyecto para cargar el servidor `pocketbase_eventos`. Las consultas se ejecutan directamente y las herramientas que escriben requieren aprobación según la política configurada. La eliminación también exige el argumento `confirm=true`.

Herramientas disponibles:

- `pocketbase_health`
- `pocketbase_list_collections`
- `pocketbase_describe_collection`
- `pocketbase_list_records`
- `pocketbase_get_record`
- `pocketbase_create_record`
- `pocketbase_update_record`
- `pocketbase_delete_record`

El MCP limita el acceso a las colecciones funcionales del proyecto y excluye `cuentas_servicio` y las colecciones internas de PocketBase. Para probar el protocolo, el arranque y la conectividad:

    npm run mcp:check
