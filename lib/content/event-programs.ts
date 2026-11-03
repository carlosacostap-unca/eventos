export type ProgramTalk = {
  number: number;
  start: string;
  end: string;
  title: string;
  speakers: string[];
};

type ProgramActivity = { kind: "activity"; start: string; end: string; title: string };
type ProgramBlock = { kind: "block"; start: string; end: string; title: string; talks: ProgramTalk[] };
export type EventProgram = {
  date: string;
  dateLabel: string;
  format: string;
  pdf: string;
  segments: (ProgramActivity | ProgramBlock)[];
};

// Transcripción del programa oficial adjunto. Vinculada al ID para conservarla
// aunque se cambie el enlace del evento, sin mostrarla en otros eventos.
const jornadasProgram: EventProgram = {
  date: "2026-11-04",
  dateLabel: "Miércoles 4 de noviembre de 2026",
  format: "Modalidad pitch",
  pdf: "/programas/xii-jornadas-estudiantiles-2026.pdf",
  segments: [
    { kind: "activity", start: "08:30", end: "09:00", title: "Acreditaciones" },
    { kind: "activity", start: "09:00", end: "09:30", title: "Acto inaugural" },
    {
      kind: "block", start: "09:30", end: "11:00", title: "Bloque I",
      talks: [
        { number: 1, start: "09:30", end: "09:35", title: "Análisis conceptual y modelado inicial del Sistema Catastral de Catamarca bajo el estándar LADM-ISO 19152", speakers: ["Lautaro Agustín Moya Salcedo"] },
        { number: 2, start: "09:35", end: "09:40", title: "Protección del patrimonio natural, cultural y turístico en el entorno del dique Escaba, Tucumán, Argentina", speakers: ["Teresa Agostina Guzmán", "Lorena Ayelén Mediavilla"] },
        { number: 3, start: "09:40", end: "09:45", title: "Evaluación de prestaciones de la placa Heltec HTIT-Tracker en el desarrollo de nodos IoT para aplicaciones Agro-Ganaderas", speakers: ["Enzo Facundo Vega Ramírez"] },
        { number: 4, start: "09:45", end: "09:50", title: "Riesgos geológicos por movimientos en masa en Villa Vil, Catamarca", speakers: ["Francisco Andrade"] },
        { number: 5, start: "09:50", end: "09:55", title: "SmartHerd: desarrollo de una plataforma web para la gestión y el monitoreo inteligente del ganado mediante tecnologías IoT", speakers: ["Guillermo Daniel Espinoza González"] },
        { number: 6, start: "09:55", end: "10:00", title: 'Delimitación de áreas potencialmente susceptibles a inundación del Dique "Las Pirquitas" mediante un Sistemas de Información Territorial', speakers: ["Josué Enzo Matías Batallan", "Ariana Belén Bazán"] },
        { number: 7, start: "10:00", end: "10:05", title: "Comprensión de conceptos de Álgebra Lineal desde la perspectiva de registros semióticos de representación", speakers: ["Santiago Ismael Palferro"] },
        { number: 8, start: "10:05", end: "10:10", title: "Síntesis verde y aplicación de nanopartículas de óxidos de hierro para la remoción de plomo en medios acuosos", speakers: ["Ayelén Anabel Guzmán"] },
        { number: 9, start: "10:10", end: "10:15", title: "Análisis de la Cuenca del Río Concepción", speakers: ["Mateo Alejandro Rocha"] },
        { number: 10, start: "10:15", end: "10:20", title: "Sistema Integral de Gestión para Cafetería", speakers: ["Jonatan Quipildor"] },
        { number: 11, start: "10:20", end: "10:25", title: "Análisis de la amenaza fluvial y geotécnica en el trayecto de la costanera del Río del Valle", speakers: ["Gabriel Hernán Ramírez Pereyra"] },
        { number: 12, start: "10:25", end: "10:30", title: "Enrutamiento bioinspirado con Physarum polycephalum para Arquitecturas Segmentadas de Satélites en Órbita Baja: Una propuesta aplicada al escenario de la CONAE", speakers: ["Joaquín Alfredo Centeno"] },
        { number: 13, start: "10:30", end: "10:35", title: "Determinación y clasificación de Riesgos geológicos en la Localidad Rincón - Departamento Pomán", speakers: ["Candelaria Natalia Strada Ogas"] },
        { number: 14, start: "10:35", end: "10:40", title: "Monitoreo Ambiental del Cuerpo de Agua y la Vegetación en el Dique Sumampa mediante el uso de SIG (Dpto. Paclín, Catamarca)", speakers: ["Cielo Abigail Ortiz", "Lautaro Agustín Moya Salcedo"] },
        { number: 15, start: "10:40", end: "10:45", title: "Análisis multitemporal y mapeo del riesgo de inundación de la cuenca del río Siján, departamento Pomán, Catamarca", speakers: ["Ramón Agustín Carrizo"] },
        { number: 16, start: "10:45", end: "10:50", title: "Interpretación del concepto de derivada mediante conceptos de optimización en contextos reales", speakers: ["Donato Costa"] },
      ],
    },
    { kind: "activity", start: "10:50", end: "11:00", title: "Espacio para preguntas" },
    { kind: "activity", start: "11:00", end: "11:30", title: "Pausa para coffee break" },
    {
      kind: "block", start: "11:30", end: "13:00", title: "Bloque II",
      talks: [
        { number: 17, start: "11:30", end: "11:35", title: "Rally latinoamericano de Innovación - Equipo IMPULSAR - BioFiltro Inteligente", speakers: ["Brenda Morena Barrionuevo", "Lucas Gabriel Agüero Vélez"] },
        { number: 18, start: "11:35", end: "11:40", title: "Rally latinoamericano de Innovación - Equipo INGENIHADAS -", speakers: ["Ayelén Nieva", "Priscila Milagros Duarte"] },
        { number: 19, start: "11:40", end: "11:45", title: "Aplicación de la teledetección satelital para la identificación de áreas de interés geológico-minero en la sierra de Calalaste, departamento de Antofagasta de la Sierra, provincia de Catamarca, Argentina", speakers: ["Ana Gabriela Arroyo"] },
        { number: 20, start: "11:45", end: "11:50", title: "Desarrollo de competencias lingüísticas y comunicativas en Inglés con Fines Específicos en estudiantes de Ingeniería de Minas mediante el uso de aplicaciones de Inteligencia Artificial Generativa", speakers: ["Julieta Elizabeth Coria"] },
        { number: 21, start: "11:50", end: "11:55", title: "Optimización energética en nodos IoT para trazabilidad ganadera mediante arquitecturas embebidas y técnicas DVFS", speakers: ["Bruno Ruartes"] },
        { number: 22, start: "11:55", end: "12:00", title: "Un Aplicativo Desarrollado con IA para la Visualización de Transformaciones Lineales", speakers: ["Marcelo Efraín Moreno"] },
        { number: 23, start: "12:00", end: "12:05", title: "Caracterización morfométrica y análisis del riesgo hídrico de la cuenca El Tala", speakers: ["Tomás Elías Luna Tula"] },
        { number: 24, start: "12:05", end: "12:10", title: "Sistematización de los proyectos mineros en estado de exploración del depto. Belén, provincia de Catamarca", speakers: ["Ana Virginia Pinto"] },
        { number: 25, start: "12:10", end: "12:15", title: "Evaluación de la cinética de liberación de Pb, Cu y As en las principales escombreras de Minas Capillitas.", speakers: ["Cinthia Anahí del Valle Arias"] },
        { number: 26, start: "12:15", end: "12:20", title: "Del cauce al territorio: Caracterización del riesgo hídrico en la cuenca del río Pómán, Catamarca.", speakers: ["Anabella Acosta"] },
        { number: 27, start: "12:20", end: "12:25", title: "Riesgo Volcánico en el Complejo Volcánico Copahue-Comahue", speakers: ["Paula Lazarte"] },
        { number: 28, start: "12:25", end: "12:30", title: "Evaluación Experimental de Redes LoRaWAN Tipo Mesh: Condiciones de Implementación y Desempeño", speakers: ["Priscila Guadalupe Plaza"] },
        { number: 29, start: "12:30", end: "12:35", title: "Estrategias de SEO académico e ingeniería del conocimiento para la visibilidad digital del RIAA de la FTyCA en Instagram", speakers: ["Sheila Yanela Ibáñez"] },
        { number: 30, start: "12:35", end: "12:40", title: "Análisis morfométrico y estrategias de manejo hidromorfológico para la mitigación del riesgo del río Siján", speakers: ["Ramón Agustín Carrizo"] },
        { number: 31, start: "12:40", end: "12:45", title: "Hitos de la migración del RIAA de DSpace 6 a DSpace 8", speakers: ["Paula Agostina Rojas Frías", "Francisco Nicolás Leiva"] },
      ],
    },
    { kind: "activity", start: "12:45", end: "13:00", title: "Espacio para preguntas y palabras de cierre" },
  ],
};

export function getEventProgram(eventId: string): EventProgram | undefined {
  return eventId === "f1e49cae123d848" ? jornadasProgram : undefined;
}
