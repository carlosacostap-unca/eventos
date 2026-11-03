import type { EventProgram as Program } from "@/lib/content/event-programs";

function TimeRange({ start, end }: { start: string; end: string }) {
  return <span className="program-time"><time dateTime={start}>{start}</time> a <time dateTime={end}>{end}</time></span>;
}

export function EventProgram({ program }: { program: Program }) {
  return (
    <section className="panel event-program" id="programa" aria-labelledby="programa-heading">
      <header className="program-header">
        <p className="eyebrow">Agenda de la jornada</p>
        <h2 id="programa-heading">Programa completo</h2>
        <p><time dateTime={program.date}>{program.dateLabel}</time><br />{program.format} · Horarios de Argentina</p>
        <a className="button button-secondary" href={program.pdf} download>Descargar programa en PDF</a>
      </header>
      <div className="program-segments">
        {program.segments.map((segment) => segment.kind === "activity" ? (
          <div className="program-activity" key={segment.start}>
            <TimeRange start={segment.start} end={segment.end} />
            <strong>{segment.title}</strong>
          </div>
        ) : (
          <details className="program-block" key={segment.start} open>
            <summary>
              <h3>{segment.title}<span>{segment.talks.length} trabajos</span></h3>
              <TimeRange start={segment.start} end={segment.end} />
            </summary>
            <ol className="program-talks" role="list" start={segment.talks[0].number}>
              {segment.talks.map((talk) => (
                <li className="program-talk" key={talk.number}>
                  <TimeRange start={talk.start} end={talk.end} />
                  <div>
                    <h4><span className="program-number">{talk.number}.</span> {talk.title}</h4>
                    <p className="program-speakers"><span>Expone{talk.speakers.length > 1 ? "n" : ""}: </span>{talk.speakers.join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}
