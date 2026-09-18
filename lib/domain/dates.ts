const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function parseArgentinaDateTime(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return text + ":00-03:00";
  }
  return text;
}

export function toArgentinaDateTimeLocal(value?: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return (
    part("year") +
    "-" +
    part("month") +
    "-" +
    part("day") +
    "T" +
    part("hour") +
    ":" +
    part("minute")
  );
}
