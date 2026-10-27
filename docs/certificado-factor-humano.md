# Muestra del certificado de Factor humano

Evento: **¿Por qué falla la tecnología?: El factor humano en la transformación digital**, del 27 de octubre de 2026. Identificador `g3b80v6m7b2147c`; modalidad Asistente `tjrywk2vdhem0tz`.

La propuesta conserva el diseño institucional e incorpora tres autoridades, de izquierda a derecha:

1. Mgter. Carlos A. Acosta Pasha, director del Laboratorio de Tecnologías de la Información y las Comunicaciones.
2. Mgter. María Alejandra Barrera, directora del Departamento de Informática.
3. Mgter. Natalia Edith Fernández, decana.

Las tres instituciones se identifican como Facultad de Tecnología y Ciencias Aplicadas, con Universidad Nacional de Catamarca en una línea separada. Cada institución se ubica inmediatamente debajo de su cargo, aunque no queden alineadas entre autoridades. La muestra incluye las firmas enviadas por el usuario de Carlos A. Acosta Pasha y María Alejandra Barrera, conservadas sin modificaciones en `assets/certificates/firma_acosta.png` y `assets/certificates/firma_barrera.jpeg`, y la imagen existente de Natalia. Las tres imágenes de firmas están incorporadas.

La configuración selecciona las variantes de tinta negra. En los PNG, el PDF convierte los canales de color a negro y conserva la transparencia original; la firma de Barrera utiliza su JPEG original con tinta negra. Se usan imágenes ordinarias sin máscaras de luminosidad ni funciones de transferencia, para evitar recuadros grises en los visores. Los archivos originales se conservan. Las firmas de Carlos y María Alejandra se ubican 8 puntos más abajo que en la muestra previa.

La configuración de revisión está en `assets/certificates/eventos/por-que-falla-la-tecnologia.json`. La muestra se genera localmente con `npx tsx scripts/preview-factor-humano-certificate.ts` y queda en `output/pdf/muestra-certificado-factor-humano-tres-firmas.pdf`, con datos ficticios. Este comando no consulta ni modifica la base, ni emite certificados de asistentes.

La configuración de asistentes está pendiente de revisión antes de aplicarse al evento publicado. Al guardarse, se deben combinar únicamente sus textos con la configuración vigente de esa modalidad. Los certificados emitidos no se reemplazan por cambiar textos: la regeneración se realiza expresamente cuando corresponda.

El diseño institucional admite una firma central opcional y una selección explícita de imagen por autoridad. Las configuraciones anteriores mantienen dos firmas cuando el nombre central está vacío. Los fondos personalizados conservan su composición propia.

## Certificado de la expositora

La variante `assets/certificates/eventos/por-que-falla-la-tecnologia-expositora.json` identifica a la Lic. Agustina Acuña, disertante `y5y1b7c4smhbp1l` vinculada al evento. Usa la frase «ha participado como expositora de la charla:» y conserva el diseño y las tres autoridades. La configuración de asistentes se mantiene separada.

La muestra se genera con `npx tsx scripts/preview-factor-humano-certificate.ts --expositora` y queda en `output/pdf/muestra-certificado-factor-humano-expositora.pdf`. Lleva una marca de pendiente de emisión; este comando de revisión no genera un código verificable ni crea registros.

El 27 de octubre de 2026 se emitió el certificado real `28265e8847fb0a2`, con código `CERT-28265e8847fb0a2`, asociado a la inscripción `d0fd39e0daa3c2e` y a la modalidad individual Expositora `dded68ef5d96466`. Esta modalidad tiene entrega habilitada y está oculta en la inscripción pública. Los datos de contacto proporcionados por el usuario se guardaron únicamente en la base y en archivos de trabajo ignorados por Git. Se verificaron la validación de la plataforma y la coincidencia exacta del PDF almacenado con el revisado. No se enviaron correos ni se modificó la configuración de asistentes.

El PDF de esa emisión se actualizó para mostrar «Código de validación:» en lugar de «ID», conservando el mismo código, la fecha de emisión y todas sus relaciones. La versión revisada está en `output/pdf/certificado-expositora-agustina-acuna-validacion.pdf`. La consulta de validación incluye también el número de documento de cada participante.
