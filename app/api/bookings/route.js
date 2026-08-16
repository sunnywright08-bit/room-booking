import { Resend } from "resend";
import { CONFIG } from "@/lib/config";
import {
  generateInvoicePdf,
  buildInvoiceNumber,
  countNights,
  formatStayRange,
  formatLongDate,
} from "@/lib/invoice";
import { getBookings, addBooking, hasClash } from "@/lib/store";

export async function GET() {
  const bookings = await getBookings();
  return Response.json({ bookings });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const guestName = (body.guestName || "").trim();
    const { checkIn, checkOut, guestEmail = "", notes = "" } = body;

    if (!guestName || !checkIn || !checkOut) {
      return Response.json(
        { error: "Guest name, check-in and check-out are all required." },
        { status: 400 }
      );
    }
    if (new Date(checkOut) < new Date(checkIn)) {
      return Response.json(
        { error: "Check-out cannot be before check-in." },
        { status: 400 }
      );
    }

    const existing = await getBookings();
    if (hasClash(existing, checkIn, checkOut)) {
      return Response.json(
        { error: "Those dates overlap an existing booking." },
        { status: 409 }
      );
    }

    const nights = Number(body.nights) || countNights(checkIn, checkOut);
    const unitPrice = Number(body.unitPrice) || CONFIG.pricePerNight;
    const invoiceDate = new Date().toISOString().slice(0, 10);
    const invoiceNumber = buildInvoiceNumber(guestName, checkIn);
    const total = nights * unitPrice;

    const booking = {
      id: crypto.randomUUID(),
      guestName,
      guestEmail,
      checkIn,
      checkOut,
      nights,
      unitPrice,
      total,
      invoiceNumber,
      invoiceDate,
      notes,
      createdAt: new Date().toISOString(),
    };

    const pdfBuffer = await generateInvoicePdf(booking);

    let emailStatus = "not_sent";
    let emailError = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const stay = formatStayRange(checkIn, checkOut);
        const { error } = await resend.emails.send({
          from: `${CONFIG.fromName} <${CONFIG.fromEmail}>`,
          to: [CONFIG.payee.email],
          cc: CONFIG.ccEmails,
          replyTo: CONFIG.biller.email,
          subject: `Invoice ${invoiceNumber} — ${guestName}, ${stay}`,
          text: [
            `Dear ${CONFIG.payee.attn},`,
            ``,
            `Please find attached invoice ${invoiceNumber} for the room rental at ${CONFIG.biller.address}, ${CONFIG.biller.postalCity}.`,
            ``,
            `Guest: ${guestName}`,
            `Stay: ${stay}`,
            `Nights: ${nights} @ € ${unitPrice.toFixed(2).replace(".", ",")}`,
            `Total due: € ${total.toFixed(2).replace(".", ",")}`,
            `Invoice date: ${formatLongDate(invoiceDate)}`,
            ``,
            `Payment by cash, or bank transfer to:`,
            `IBAN: ${CONFIG.bank.iban}`,
            `Account name: ${CONFIG.bank.accountName}`,
            ``,
            `Kind regards,`,
            CONFIG.biller.name,
          ].join("\n"),
          attachments: [
            {
              filename: `${invoiceNumber}.pdf`,
              content: pdfBuffer.toString("base64"),
            },
          ],
        });
        emailStatus = error ? "failed" : "sent";
        if (error) emailError = error.message || String(error);
      } catch (err) {
        emailStatus = "failed";
        emailError = err.message;
      }
    } else {
      emailError = "RESEND_API_KEY is not set — invoice generated but not emailed.";
    }

    booking.emailStatus = emailStatus;
    await addBooking(booking);

    return Response.json({
      booking,
      emailStatus,
      emailError,
      pdfBase64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
