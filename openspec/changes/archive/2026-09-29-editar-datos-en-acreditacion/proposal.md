## Why

Durante la acreditación, las personas pueden detectar errores en sus datos de inscripción. El equipo necesita corregirlos desde la misma pantalla para todos los eventos.

## What Changes

- Agregar edición de apellidos, nombres, documento y email en la lista de acreditación.
- Validar los campos y la unicidad del documento dentro del evento.
- Conservar asistencia, origen y cupo; registrar la edición en auditoría.

## Capabilities

### New Capabilities
- `edicion-datos-acreditacion`: Corrección administrativa de datos de participantes durante la acreditación.

### Modified Capabilities

Ninguna.

## Impact

Formulario cliente, acción autenticada, servicio de inscripciones y estilos adaptables. Se reutilizan el esquema y el índice único de PocketBase. No requiere migración. Los PDFs emitidos previamente se actualizan mediante la regeneración existente de certificados.
