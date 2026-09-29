# Eventos UNCA

Aplicación de gestión integral de eventos construida con Next.js 16 y PocketBase. Permite publicar eventos con su tipo, costo y opción de certificado, cargar disertantes con fotos, recibir inscripciones, acreditar asistentes, registrar altas presenciales, emitir certificados PDF, ofrecer su descarga segura y consultar estadísticas.

Toda la lógica de negocio y el acceso a PocketBase viven en el servidor de Next.js. El navegador usa páginas y Server Actions de Next.js y nunca recibe credenciales de servicio ni usa el SDK de PocketBase.

## Requisitos

- Node.js 22
- npm
- Una instancia reciente de PocketBase accesible desde el servidor de Next.js

## Configuración local

1. Instalá dependencias:

    npm install

2. Copiá .env.example como .env.local y completá sus valores.
3. Generá SESSION_SECRET aleatorio y de al menos 32 caracteres.
4. Para PocketBase solo se requieren POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD.

El aprovisionador usa esas credenciales de superusuario para crear el esquema. También crea automáticamente una cuenta técnica derivada y limitada por las reglas de las colecciones; las operaciones normales de la aplicación usan esa cuenta limitada.

## Aprovisionamiento de PocketBase

El comando siguiente importa las colecciones, campos, reglas e índices y sincroniza la cuenta técnica y el administrador del panel con el email y la contraseña indicados:

    npm run schema:apply

Para actualizar solamente el esquema de una instancia ya configurada, sin cambiar las contraseñas de las cuentas, y migrar las vinculaciones existentes de disertantes, ejecutá:

    npm run schema:import

Se puede ejecutar nuevamente después de un despliegue: usa identificadores estables, actualiza el esquema y no elimina datos ajenos al manifiesto. Para comprobar una instalación nueva, ejecutalo dos veces y confirmá que la segunda corrida indique 0 vinculaciones de disertantes migradas.

Colecciones creadas:

- administradores
- cuentas_servicio
- tipos_evento
- eventos
- disertantes
- participaciones_disertantes
- inscripciones
- auditoria
- certificados
- envios_certificados
- limites_consulta_certificados

`envios_certificados` se conserva únicamente como historial de instalaciones anteriores. La aplicación no crea ni procesa nuevos envíos. Los índices impiden repetir el slug de un evento, el documento de una persona dentro del mismo evento, el número de cupo público, la participación de un disertante en un mismo evento y el certificado asociado. Un índice global por documento acelera el portal de certificados.

## Desarrollo y verificación

    npm run dev
    npm run lint
    npm run typecheck
    npm test
    npm run build

El acceso administrativo está en `/iniciar-sesion`. El portal público de certificados está en `/mis-certificados`.

## Flujo operativo

1. Iniciá sesión con una cuenta de la colección administradores. También se acepta el superusuario de PocketBase configurado en el despliegue.
2. En Tipos de eventos, creá las categorías necesarias; podés editarlas y desactivarlas sin cambiar los eventos existentes.
3. Creá un evento, asignale un tipo, indicá si es gratuito y si se entregará certificado, y dejalo como borrador o con la inscripción deshabilitada.
4. En la pestaña Disertantes agregá personas nuevas o reutilizá perfiles ya cargados en otros eventos, incluidos sus datos y foto. Las fotos nuevas admiten JPG, PNG o WebP de hasta 5 MB. Quitar un disertante de un evento solo elimina su participación; editar su perfil actualiza todos los eventos donde participa. Revisá la página pública en /identificador-publico y, cuando corresponda, publicá el evento y habilitá la inscripción. Los enlaces antiguos /eventos/identificador-publico redirigen a la URL corta.
5. Durante el evento, usá Acreditación para marcar asistentes o crear altas presenciales. Estas altas se acreditan de inmediato y pueden superar el cupo público.
6. En Certificados, validá la vista previa y generá el lote. Cada asistente podrá descargar sus PDF desde `/mis-certificados` usando el mismo DNI de la inscripción.
7. En Reportes, filtrá participantes y exportá CSV.

## Portal público de certificados

### Materiales de las charlas

Cada evento tiene una pestaña **Materiales** para subir y eliminar imágenes, PDF, PowerPoint y documentos Office/OpenDocument. Se adjuntan uno por vez, con título opcional y hasta 25 MB por archivo. Los archivos se guardan en la colección `materiales_evento`, en el storage configurado en PocketBase (local o S3), con el campo de archivo protegido.

Antes de desplegar esta funcionalidad, ejecutar `npm run schema:materials`. Este comando crea o actualiza únicamente la colección de materiales, sin eliminar otras colecciones ni cambiar cuentas o credenciales. El aprovisionamiento completo también incluye esta colección. El proxy del despliegue debe admitir solicitudes multipart de al menos 27 MB.

Al consultar su DNI en `/mis-certificados`, una persona acreditada ve los materiales de sus eventos aunque aún no se haya emitido un certificado, incluso cuando el evento no entrega certificados. La autorización firmada dura diez minutos y guarda los IDs de sus inscripciones acreditadas. Cada descarga comprueba nuevamente la acreditación y la pertenencia al evento. Revocar la asistencia impide nuevas descargas. Los tokens del storage nunca se entregan al navegador; el servidor transmite el archivo como adjunto, sin caché. Las autorizaciones anteriores basadas en certificados siguen funcionando durante su vigencia.

La consulta exige una coincidencia exacta con el DNI normalizado de una inscripción acreditada, sin solicitar email. Una consulta válida crea una autorización firmada, HttpOnly y válida por diez minutos, limitada a las inscripciones acreditadas encontradas. La descarga vuelve a validar esa autorización y la asistencia, y responde con `Cache-Control: private, no-store`.

El límite inicial es de cinco intentos por combinación de origen y DNI en una ventana de quince minutos. PocketBase guarda solamente una clave HMAC derivada con `SESSION_SECRET`; no guarda el DNI ni la IP en claro. La colección de límites y las inscripciones no tienen reglas públicas: todas las consultas pasan por Next.js con la cuenta técnica.

## Despliegue en Dokploy

Creá una aplicación desde este repositorio y elegí Nixpacks. El proyecto declara Node 22 en package.json.

- Comando de build: npm run build
- Comando de inicio: npm run start
- Puerto: 3000
- Health check sugerido: /
- Réplicas iniciales: 1

Cargá en Dokploy las variables de `.env.example`. PocketBase debe ser alcanzable desde el contenedor. No se requiere un proveedor de correo ni un programador externo.

Después de desplegar:

1. Mantené los eventos como borrador o con inscripción deshabilitada.
2. Ejecutá npm run schema:apply en un trabajo temporal con las credenciales de superusuario.
3. Iniciá sesión y creá un evento de prueba.
4. Registrá una persona, acreditala y agregá un alta presencial.
5. Generá la vista previa y un certificado.
6. Abrí `/mis-certificados`, consultá con el DNI de prueba y descargá el PDF.
7. Confirmá que una combinación incorrecta, un enlace sin autorización y una autorización vencida no permitan descargarlo.
8. Revisá estadísticas y el CSV.
9. Recién entonces habilitá la inscripción pública.

## Seguridad y rotación de secretos

- SESSION_SECRET cifra la sesión administrativa y firma la autorización temporal de certificados. Rotarlo invalida ambas.
- Al cambiar la contraseña administrativa de PocketBase, actualizala en Dokploy y ejecutá nuevamente npm run schema:apply para sincronizar la cuenta técnica y el acceso al panel.
- Usá TLS tanto para PocketBase como para la aplicación.
- No expongas variables `POCKETBASE_*`, `SESSION_SECRET` ni otros secretos con prefijo `NEXT_PUBLIC_`.
- Las descargas públicas y administrativas, las vistas previas y las exportaciones deshabilitan caché y vuelven a validar su autorización.

## Respaldo y recuperación

Respaldá con regularidad el directorio pb_data de PocketBase y cualquier volumen asociado. Antes de una migración, hacé un respaldo consistente y probá la restauración en otra instancia.

Para recuperar el servicio:

1. Restaurá PocketBase y verificá sus colecciones.
2. Configurá POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD en Next.js.
3. Ejecutá npm run schema:apply para reconciliar el esquema sin borrar registros.
4. Rotá SESSION_SECRET si el incidente pudo exponerlo.
5. Verificá una consulta y descarga desde `/mis-certificados`.

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
