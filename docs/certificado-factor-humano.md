# Muestra del certificado de Factor humano

Evento: **¿Por qué falla la tecnología?: El factor humano en la transformación digital**, del 27 de octubre de 2026. Identificador `g3b80v6m7b2147c`; modalidad Asistente `tjrywk2vdhem0tz`.

La propuesta conserva el diseño institucional e incorpora tres autoridades, de izquierda a derecha:

1. Mgter. Carlos A. Acosta Pasha, director del Laboratorio de Tecnologías de la Información y las Comunicaciones.
2. Mgter. María Alejandra Barrera, directora del Departamento de Informática.
3. Mgter. Natalia Edith Fernández, decana.

Las tres instituciones se identifican como Facultad de Tecnología y Ciencias Aplicadas, con Universidad Nacional de Catamarca en una línea separada. Cada institución se ubica inmediatamente debajo de su cargo, aunque no queden alineadas entre autoridades. La muestra incluye las firmas enviadas por el usuario de Carlos A. Acosta Pasha y María Alejandra Barrera, conservadas sin modificaciones en `assets/certificates/firma_acosta.png` y `assets/certificates/firma_barrera.jpeg`, y la imagen existente de Natalia. Las tres imágenes de firmas están incorporadas.

La configuración selecciona las variantes de tinta negra. En los PNG, el PDF convierte los canales de color a negro y conserva la transparencia original; la firma de Barrera utiliza su JPEG original con tinta negra. Se usan imágenes ordinarias sin máscaras de luminosidad ni funciones de transferencia, para evitar recuadros grises en los visores. Los archivos originales se conservan. Las firmas de Carlos y María Alejandra se ubican 8 puntos más abajo que en la muestra previa.

La configuración de revisión está en `assets/certificates/eventos/por-que-falla-la-tecnologia.json`. La muestra se genera localmente con `npx tsx scripts/preview-factor-humano-certificate.ts` y queda en `output/pdf/muestra-certificado-factor-humano-tres-firmas.pdf`, con datos ficticios. Este comando no consulta ni modifica la base, ni emite certificados de asistentes.

La propuesta está pendiente de revisión antes de aplicarse al evento publicado. Al guardarse, se deben combinar únicamente sus textos con la configuración vigente de esa modalidad. Los certificados emitidos no se reemplazan por cambiar textos: la regeneración se realiza expresamente cuando corresponda.

El diseño institucional admite una firma central opcional y una selección explícita de imagen por autoridad. Las configuraciones anteriores mantienen dos firmas cuando el nombre central está vacío. Los fondos personalizados conservan su composición propia.
