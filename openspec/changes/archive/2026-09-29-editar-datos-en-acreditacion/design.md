## Context

Todos los eventos comparten la pantalla de acreditación. Las inscripciones almacenan identidad, asistencia, origen y cupo en un mismo registro.

## Goals / Non-Goals

Permitir corregir los cuatro datos personales sin salir de acreditación, para inscripciones públicas y presenciales, acreditadas o ausentes. No cambiar asistencia al editar ni regenerar automáticamente certificados ya emitidos.

## Decisions

- Formulario desplegable por participante con campos controlados, guardar, cancelar y mensajes de validación.
- Acción de servidor con sesión administrativa obligatoria y validación compartida de inscripciones.
- Servicio que verifica pertenencia al evento y busca documentos normalizados duplicados excluyendo la propia inscripción. El índice único protege frente a concurrencia.
- Actualización limitada a datos personales y documento normalizado; auditoría de actor, entidad y nombres de campos modificados.
- Revalidar acreditación, resumen, reportes y listado administrativo de certificados.

## Risks / Trade-offs

Una corrección puede hacer que el participante deje de coincidir con la búsqueda actual. Los PDFs existentes conservan sus datos hasta usar la regeneración disponible. La auditoría se registra después de guardar, siguiendo el patrón existente del proyecto.

## Validation

78 pruebas aprobadas y una prueba de integración omitida en la suite; typecheck y lint finalizados correctamente. Las pruebas nuevas cubren validación, normalización, preservación de asistencia y cupo, duplicados, errores de consulta, concurrencia, pertenencia al evento y autenticación. No se realizó comprobación visual en navegador.
