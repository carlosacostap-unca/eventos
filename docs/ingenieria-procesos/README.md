# Vista de ingeniería de procesos

Abrir [index.html](index.html) en un navegador. La carpeta completa funciona localmente, sin instalar dependencias, iniciar Next.js ni conectarse a PocketBase. También puede servirse como documentación estática. Para compartirla hay que conservar `vendor/`, `procesos.js`, `visor.js` y `visor.css` junto al HTML.

En la aplicación, iniciar sesión como administrador general y elegir **Procesos BPMN** en la navegación del panel. La ruta `/admin/documentacion/procesos` abre el visor y permite volver al panel. El HTML, los scripts, las hojas de estilo, los modelos y la vista técnica enlazada comprueban la misma autorización en cada solicitud. La documentación no concede acceso adicional a datos de eventos ni modifica los roles del personal. La configuración de empaquetado incluye los archivos documentales necesarios para producción.

La documentación está en español y representa el comportamiento observado en la revisión `3c7cd6698bdf98ab5ba9ad27157cdfbfd049a45e`, con fecha de análisis 31 de octubre de 2026. No contiene datos de personas ni métricas de producción.

## Navegación

El menú permite buscar procesos por título, categoría o reglas. Cada proceso tiene un enlace directo, por ejemplo `index.html#certificados`. El diagrama admite desplazamiento, zoom, vista ampliada y selección de elementos. Las pestañas muestran reglas, un listado accesible de actividades y fuentes de implementación, especificaciones y pruebas. Las fuentes de código están fijadas a la revisión analizada.

El botón Exportar descarga el modelo BPMN editable, una imagen SVG o una imagen PNG. Las exportaciones de imagen representan el diagrama completo, independientemente del zoom de lectura. El tema oscuro afecta la documentación; el lienzo mantiene fondo claro para conservar el contraste de la notación.

## Procesos incluidos

| Código | Proceso | Modelo editable |
|---|---|---|
| P01 | Preparar y publicar un evento | [preparacion.bpmn](bpmn/preparacion.bpmn) |
| P02 | Inscribir personas y exposiciones | [inscripcion.bpmn](bpmn/inscripcion.bpmn) |
| P03 | Corregir una inscripción o un trabajo | [correcciones.bpmn](bpmn/correcciones.bpmn) |
| P04 | Acreditar presencia y dar altas presenciales | [acreditacion.bpmn](bpmn/acreditacion.bpmn) |
| P05 | Entregar o reemplazar una presentación | [presentaciones.bpmn](bpmn/presentaciones.bpmn) |
| P06 | Emitir o regenerar certificados | [certificados.bpmn](bpmn/certificados.bpmn) |
| P07 | Consultar y descargar recursos | [consulta.bpmn](bpmn/consulta.bpmn) |
| P08 | Analizar resultados y exportar reportes | [reportes.bpmn](bpmn/reportes.bpmn) |

Los ocho modelos contienen 80 elementos de flujo y 77 conexiones. Son modelos descriptivos BPMN 2.0 con carriles, eventos de inicio y fin, tareas humanas, tareas del sistema y compuertas exclusivas con condiciones explícitas. Declaran `isExecutable="false"`; documentan recorridos y decisiones, sin definir un motor de ejecución. Los carriles agrupan responsabilidades dentro del proceso de servicio, no representan pools de organizaciones independientes.

P06 describe la decisión por sujeto del lote: inscripción individual o exposición. El lote aplica ese recorrido a los sujetos correspondientes. Un sujeto omitido no cancela la emisión de los demás. Las tareas agrupan validaciones internas; los modelos no enumeran cada llamada técnica ni todos los errores de infraestructura. Los finales de rechazo indican que la solicitud o sujeto no se confirmó, no la eliminación de datos anteriores.

Esta primera vista cubre el recorrido de participantes y operación del evento. La administración global de personal, perfiles de disertantes y tipos de evento, la carga administrativa de materiales y la validación pública por código de certificado no tienen todavía un modelo propio. No se representan pagos, revisión académica ni envío de correo como procesos implementados.

## Fuentes y diferencias de alcance

Se consultaron `openspec/specs/`, las guías de modalidades y presentaciones y las acciones, servicios y pruebas enlazados desde cada proceso. La implementación incluye evoluciones posteriores a algunos contratos de OpenSpec: múltiples trabajos por alumno, edición pública, segundo alumno expositor y plazos independientes. P05 se vincula a su guía e implementación porque no existe una capacidad OpenSpec principal dedicada a presentaciones.

P04 señala una diferencia concreta para revisar: `app/actions/accreditation.ts` autoriza la confirmación rápida con capacidad `accredit` y el servicio admite correcciones de identidad, mientras que `acceso-por-evento` y `edicion-datos-acreditacion` reservan la edición de inscripciones al administrador. La documentación distingue esa confirmación de la edición general. No se modificaron permisos ni comportamiento para resolver la diferencia.

Las preguntas e indicadores sugeridos son criterios para el análisis. Este visor no calcula tiempos de ciclo, no reconstruye trazas de ejecución y no realiza minería de procesos. Un enlace a una prueba indica evidencia relacionada; no afirma que la prueba se haya ejecutado en este trabajo documental.

## Mantenimiento

La fuente editorial es [modelos.mjs](modelos.mjs). Incluye responsables, reglas, referencias, elementos y conexiones. [generar.mjs](generar.mjs) produce los XML `.bpmn`, los datos embebidos del visor y [manifest.json](manifest.json) con hashes SHA-256.

Desde la raíz del repositorio:

```powershell
node docs/ingenieria-procesos/generar.mjs
node --check docs/ingenieria-procesos/visor.js
```

El generador comprueba IDs únicos, referencias existentes, entradas y salidas, condiciones de las compuertas y alcance desde el inicio. Después de modificar modelos hay que abrirlos en el visor, comprobar que importan sin advertencias y revisar etiquetas, carriles y rutas. Modificar los XML descargados en otro modelador no actualiza automáticamente la fuente editorial ni el visor: los cambios deben reconciliarse en `modelos.mjs`.

La verificación de esta entrega importa los ocho modelos en Chrome y comprueba elementos y conexiones, búsqueda, selección, pestañas, temas, exportaciones BPMN/SVG/PNG y ausencia de desbordes horizontales en 1440×900, 1600×1000, 1920×1080, 2048×1320 y 390×844. La documentación puede desplazarse verticalmente. Las capturas y exportaciones de prueba quedan en `output/playwright/`, excluido de Git. No se requieren migraciones ni pruebas con escrituras de base de datos para abrir esta vista.

## Dependencias y notación

El visor utiliza una copia local de [bpmn-js 18.31.0](https://github.com/bpmn-io/bpmn-js/tree/v18.31.0), con licencia conservada en [vendor/LICENSE.bpmn-js](vendor/LICENSE.bpmn-js). Su marca permanece visible. No se incorporó una dependencia a la aplicación Next.js y el visor no descarga bibliotecas desde una CDN.

Referencias: [BPMN 2.0.2 de OMG](https://www.omg.org/spec/BPMN/2.0.2) y [documentación oficial del visor](https://bpmn.io/toolkit/bpmn-js/walkthrough/). La vista técnica anterior sigue disponible en [Arquitectura de Eventos UNCA](../arquitectura/README.md).
