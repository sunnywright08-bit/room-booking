import { CONFIG } from "./config";

// Builds an .ics calendar file for a booking.
// Sent as an attachment — Gmail and Outlook show it as an invite
// with an "Add to calendar" / RSVP option.

function stamp(date) {
  // UTC timestamp format: 20260816T133000Z
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function dateOnly(iso) {
  // All-day format: 20260811
  return iso.replace(/-/g, "");
}

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
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

export function buildIcs(booking) {
  const { guestName, checkIn, checkOut, nights, total, invoiceNumber, id } = booking;

  // DTEND is exclusive for all-day events, so add one day to the
  // last night so the event covers the full stay.
  const start = dateOnly(checkIn);
  const end = dateOnly(addDays(checkOut, 1));

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
    "BEGIN:VEVENT",
    `UID:${id}@room-booking`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
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
