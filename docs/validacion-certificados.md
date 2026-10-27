# Validación pública de certificados

La pantalla `/validar-certificado` se enlaza desde la agenda, los eventos y Mis certificados. Acepta el código completo del pie del PDF, con o sin el rótulo `Código de validación:` o el prefijo histórico `ID`.

Las nuevas emisiones imprimen `CERT-<id del registro de certificados>`. El ID se asigna antes de componer el PDF y se guarda en ese mismo registro, tanto en certificados individuales como grupales y con cualquier plantilla. Cada trabajo tiene un registro propio. Regenerar conserva el ID; generar reutiliza los PDFs existentes.

Los códigos históricos `<id del evento>-<id de la inscripción>` siguen permitiendo buscar sin migrar datos ni reemplazar archivos. Cuando se reutilizó el mismo código para varias exposiciones, se muestran los trabajos y sus participantes para compararlos con el PDF. El código histórico no permite distinguir por sí solo esos trabajos.

La consulta devuelve evento, fecha, fecha de emisión, modalidad, título del trabajo e integrantes, con apellido, nombre y número de documento de cada persona. No devuelve correos, enlaces de archivos ni cookies de descarga. Se consulta el registro de emisión actual: el código permite cotejar los datos, no detectar modificaciones del archivo PDF presentado.

Solo se muestran emisiones con archivo e inscripción acreditada del mismo evento, que no esté en borrador. Para modalidades también se comprueban modalidad, exposición, huella vigente y destinatarios. Si los datos de un trabajo cambiaron y requieren regeneración, no se muestra como registrado vigente. Una emisión eliminada deja de aparecer. Los errores del servicio se distinguen de las búsquedas sin coincidencias.

El formulario acepta únicamente IDs de PocketBase y aplica el límite persistente existente de 20 consultas cada 15 minutos por origen, compartido entre códigos de esta pantalla. No requiere cambios de esquema. Los certificados emitidos anteriormente mantienen sus archivos hasta que se solicite expresamente regenerarlos.
