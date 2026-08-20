import { CONFIG } from "./config";

// Builds an .ics calendar file for a booking.
// One event per night, 07:00 -> 08:00, repeating for the length
// of the stay. Times are Europe/Amsterdam.

const TZID = "Europe/Amsterdam";

function stamp(date) {
  // UTC timestamp format: 20260816T133000Z
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function localDateTime(iso, hour) {
  // Floating local time in the event's timezone: 20260811T190000
  const d = iso.replace(/-/g, "");
  return `${d}T${String(hour).padStart(2, "0")}0000`;
}

// Escape per the iCalendar spec.
function esc(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Long lines must be folded at 75 octets.
function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

// Amsterdam timezone definition, so every calendar client resolves
// the times identically (including across the DST changeover).
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "X-LIC-LOCATION:Europe/Amsterdam",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildIcs(booking) {
  const { guestName, checkIn, nights, total, invoiceNumber, id } = booking;

  // Each day of the stay: 07:00 -> 08:00.
  // The series repeats once per night for the length of the stay.
  const start = localDateTime(checkIn, 7);
  const end = localDateTime(checkIn, 8);

  const location = `${CONFIG.biller.address}, ${CONFIG.biller.postalCity}`;
  const description = [
    `Guest: ${guestName}`,
    `Nights: ${nights}`,
    `Total: € ${total.toFixed(2).replace(".", ",")}`,
    `Invoice: ${invoiceNumber}`,
  ].join("\n");

  const attendees = CONFIG.calendarRecipients.map(
    (email) =>
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Room Booking Hoofddorp//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${id}@room-booking`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=${TZID}:${start}`,
    `DTEND;TZID=${TZID}:${end}`,
    // One occurrence per night of the stay.
    `RRULE:FREQ=DAILY;COUNT=${nights}`,
    `SUMMARY:${esc(`Room booked — ${guestName}`)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    `ORGANIZER;CN=${esc(CONFIG.biller.name)}:mailto:${CONFIG.biller.email}`,
    ...attendees,
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n");
}
