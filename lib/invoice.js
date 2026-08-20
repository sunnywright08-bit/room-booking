import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CONFIG } from "./config";

const TEAL = rgb(0.09, 0.35, 0.47); // header/footer bar colour
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.45, 0.45, 0.45);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatLongDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatStayRange(checkIn, checkOut) {
  const a = new Date(checkIn + "T00:00:00Z");
  const b = new Date(checkOut + "T00:00:00Z");
  const sameMonth =
    a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    return `${ordinal(a.getUTCDate())} – ${ordinal(b.getUTCDate())} ${
      MONTHS[b.getUTCMonth()]
    } ${b.getUTCFullYear()}`;
  }
  return `${ordinal(a.getUTCDate())} ${MONTHS[a.getUTCMonth()]} – ${ordinal(
    b.getUTCDate()
  )} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

// Standard night count: check-out minus check-in.
// 25th -> 28th = 3 nights (nights of the 25th, 26th and 27th).
export function countNights(checkIn, checkOut) {
  const a = new Date(checkIn + "T00:00:00Z");
  const b = new Date(checkOut + "T00:00:00Z");
  const days = Math.round((b - a) / 86400000);
  return Math.max(days, 1);
}

// e.g. Pedro Cruz, week 33 of 2026 -> PC_INV26w33
export function buildInvoiceNumber(guestName, checkIn) {
  const initials = guestName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const d = new Date(checkIn + "T00:00:00Z");
  const yy = String(d.getUTCFullYear()).slice(-2);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + new Date(start).getUTCDay() + 1) / 7);
  return `${initials || "XX"}_INV${yy}w${String(week).padStart(2, "0")}`;
}

function euro(n) {
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

export async function generateInvoicePdf(booking) {
  const {
    guestName,
    checkIn,
    checkOut,
    nights,
    unitPrice,
    invoiceNumber,
    invoiceDate,
  } = booking;

  const total = nights * unitPrice;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const M = 70; // left margin
  const draw = (text, x, y, opts = {}) =>
    page.drawText(String(text), {
      x,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? BLACK,
    });

  // Header + footer bars
  page.drawRectangle({ x: 0, y: height - 55, width, height: 55, color: TEAL });
  page.drawRectangle({ x: 0, y: 0, width, height: 45, color: TEAL });

  // Biller block (left)
  let y = height - 110;
  draw(CONFIG.biller.name, M, y, { bold });
  y -= 15;
  for (const line of [
    CONFIG.biller.address,
    CONFIG.biller.postalCity,
    CONFIG.biller.country,
    CONFIG.biller.email,
  ]) {
    draw(line, M, y);
    y -= 15;
  }

  // Date + invoice number (right aligned)
  const rightEdge = width - M;
  const rightRow = (label, value, yy) => {
    const valueW = font.widthOfTextAtSize(value, 10);
    draw(value, rightEdge - valueW, yy);
    const labelW = bold.widthOfTextAtSize(label, 10);
    draw(label, rightEdge - valueW - 5 - labelW, yy, { bold });
  };
  rightRow("DATE:", formatLongDate(invoiceDate), height - 110);
  rightRow("INVOICE #:", invoiceNumber, height - 125);

  // Bill To block
  y -= 25;
  draw("Bill To:", M, y, { bold });
  y -= 24;
  for (const line of [
    CONFIG.payee.company,
    `Att. ${CONFIG.payee.attn}`,
    CONFIG.payee.address,
    CONFIG.payee.postalCity,
    `BTW: ${CONFIG.payee.btw}`,
    CONFIG.payee.phone,
    CONFIG.payee.email,
  ]) {
    draw(line, M, y);
    y -= 15;
  }

  // Line-items table
  y -= 30;
  const cols = [M, M + 240, M + 345, M + 390, rightEdge];
  const rowH = 20;
  const tableRow = (cells, yy, isBold) => {
    page.drawRectangle({
      x: cols[0],
      y: yy - 5,
      width: cols[4] - cols[0],
      height: rowH,
      borderColor: BLACK,
      borderWidth: 0.8,
    });
    for (let i = 1; i < 4; i++) {
      page.drawLine({
        start: { x: cols[i], y: yy - 5 },
        end: { x: cols[i], y: yy - 5 + rowH },
        color: BLACK,
        thickness: 0.8,
      });
    }
    cells.forEach((c, i) => {
      const maxW = cols[i + 1] - cols[i] - 10;
      const f = isBold ? bold : font;
      // Shrink the text until it fits its cell (min 6.5pt), then ellipsize.
      let size = 10;
      while (size > 6.5 && f.widthOfTextAtSize(String(c), size) > maxW) {
        size -= 0.25;
      }
      let text = String(c);
      while (text.length > 4 && f.widthOfTextAtSize(text, size) > maxW) {
        text = text.slice(0, -2) + "…";
      }
      draw(text, cols[i] + 5, yy + 2, { bold: isBold, size });
    });
  };

  tableRow(["DESCRIPTION", "Unit Price", "Qty", "Total"], y);
  y -= rowH;
  tableRow([
    `${guestName} ${formatStayRange(checkIn, checkOut)}`,
    euro(unitPrice),
    String(nights),
    euro(total),
  ], y);

  // Totals table
  y -= 55;
  const totalsRow = (label, value, yy) => {
    page.drawRectangle({
      x: cols[0],
      y: yy - 5,
      width: cols[4] - cols[0],
      height: rowH,
      borderColor: BLACK,
      borderWidth: 0.8,
    });
    page.drawLine({
      start: { x: cols[1], y: yy - 5 },
      end: { x: cols[1], y: yy - 5 + rowH },
      color: BLACK,
      thickness: 0.8,
    });
    draw(label, cols[0] + 5, yy + 2);
    draw(value, cols[1] + 5, yy + 2);
  };
  totalsRow("Total", euro(total), y);
  y -= rowH;
  totalsRow("Paid", "€ -", y);
  y -= rowH;
  totalsRow("Due", euro(total), y);

  // Payment instructions
  y -= 50;
  draw("Payment instructions:", M, y, { bold });
  y -= 25;
  draw("Cash or", M, y);
  y -= 25;
  draw("Bank transfer to:", M, y);
  y -= 25;
  draw(`IBAN: ${CONFIG.bank.iban}`, M, y);
  y -= 15;
  draw(`Account Name: ${CONFIG.bank.accountName}`, M, y, { bold });

  draw(
    "Generated automatically on booking confirmation.",
    M,
    60,
    { size: 8, color: GREY }
  );

  return Buffer.from(await pdf.save());
}
