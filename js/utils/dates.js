

export function nowDateTimeInputValue() {
  return toDateTimeInputValue(new Date().toISOString());
}

export function toDateInputValue(value) {
  if (!value) return "";
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toDateTimeInputValue(value) {
  if (!value) return "";
  const parts = getDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromDateTimeInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function parseBrazilianDate(value) {
  if (!value) return "";
  const match = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3] || String(new Date().getFullYear());
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

export function parseBrazilianDateTime(value) {
  if (!value) return "";
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return "";

  const [, rawDay, rawMonth, year, rawHour, minute] = match;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");
  const hour = rawHour.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
}

export function inferDateFromNumber(number) {
  const firstNumber = String(number || "").split(",")[0].trim();
  const match = firstNumber.match(/^(\d{4})\.(\d{2,4})\./);
  if (!match) return "";

  const year = match[1];
  const monthDay = match[2];
  let month = "";
  let day = "";

  if (monthDay.length === 2) {
    month = monthDay.slice(0, 1);
    day = monthDay.slice(1);
  } else if (monthDay.length === 3) {
    month = monthDay.slice(0, 1);
    day = monthDay.slice(1);
  } else {
    month = monthDay.slice(0, 2);
    day = monthDay.slice(2);
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00.000Z`;
}

export function formatDate(value) {
  if (!value) return "-";
  const parts = getDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const parts = getDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function getDateParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
    hour: String(date.getHours()).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
  };
}
