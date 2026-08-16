@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

import "./globals.css";

export const metadata = {
  title: "Room Booking — Hoofddorp",
  description: "Book the room and generate an invoice automatically.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

const PRICE = 65;

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  const n = Math.round((d2 - d1) / 86400000) + 1;
  return n > 0 ? n : 0;
}

function euro(n) {
  return "€ " + n.toFixed(2).replace(".", ",");
}

function prettyDate(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Home() {
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    checkIn: "",
    checkOut: "",
    notes: "",
  });
  const [nightsOverride, setNightsOverride] = useState("");
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const autoNights = nightsBetween(form.checkIn, form.checkOut);
  const nights = nightsOverride === "" ? autoNights : Number(nightsOverride);
  const total = nights * PRICE;

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => {});
  }, []);

  const upcoming = useMemo(
    () => [...bookings].sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    [bookings]
  );

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, nights, unitPrice: PRICE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setBookings((b) => [...b, data.booking]);
      setStatus({
        type: data.emailStatus === "sent" ? "success" : "warn",
        message:
          data.emailStatus === "sent"
            ? `Invoice ${data.booking.invoiceNumber} generated and emailed.`
            : `Invoice ${data.booking.invoiceNumber} generated, but the email did not send. ${
                data.emailError || ""
              }`,
        pdf: data.pdfBase64,
        invoiceNumber: data.booking.invoiceNumber,
      });
      setForm({ guestName: "", guestEmail: "", checkIn: "", checkOut: "", notes: "" });
      setNightsOverride("");
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  function downloadPdf(base64, name) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";
  const label = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="mb-3 h-1.5 w-16 rounded-full bg-teal-800" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Room Booking — Hoofddorp
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Thijs Ouwerkerkstraat 1 · {euro(PRICE)} per night · invoice sent
            automatically on booking
          </p>
        </header>

        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Guest name</label>
              <input
                className={field}
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                placeholder="e.g. Pedro Cruz"
                required
              />
            </div>

            <div>
              <label className={label}>Check-in</label>
              <input
                type="date"
                className={field}
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={label}>Check-out</label>
              <input
                type="date"
                className={field}
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                required
              />
            </div>

            <div>
              <label className={label}>
                Nights{" "}
                {nightsOverride === "" && autoNights > 0 && (
                  <span className="normal-case text-slate-400">(auto)</span>
                )}
              </label>
              <input
                type="number"
                min="1"
                className={field}
                value={nightsOverride === "" ? autoNights || "" : nightsOverride}
                onChange={(e) => setNightsOverride(e.target.value)}
                placeholder="—"
              />
            </div>

            <div>
              <label className={label}>Guest email (optional)</label>
              <input
                type="email"
                className={field}
                value={form.guestEmail}
                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                placeholder="guest@example.com"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">
              {nights > 0 ? `${nights} × ${euro(PRICE)}` : "Select dates"}
            </span>
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {euro(total)}
            </span>
          </div>

          <button
            type="submit"
            disabled={busy || nights < 1 || !form.guestName}
            className="mt-5 w-full rounded-lg bg-teal-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? "Generating invoice…" : "Confirm booking & send invoice"}
          </button>
        </form>

        {status && (
          <div
            className={`mt-5 rounded-xl border p-4 text-sm ${
              status.type === "success"
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : status.type === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <p>{status.message}</p>
            {status.pdf && (
              <button
                onClick={() => downloadPdf(status.pdf, status.invoiceNumber)}
                className="mt-2 font-medium underline underline-offset-2"
              >
                Download the PDF
              </button>
            )}
          </div>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
            Bookings ({bookings.length})
          </h2>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No bookings yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.guestName}</p>
                    <p className="text-xs text-slate-500">
                      {prettyDate(b.checkIn)} – {prettyDate(b.checkOut)} · {b.nights}{" "}
                      nights · {b.invoiceNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                      {euro(b.total)}
                    </p>
                    <p
                      className={`text-xs ${
                        b.emailStatus === "sent" ? "text-teal-700" : "text-amber-600"
                      }`}
                    >
                      {b.emailStatus === "sent" ? "invoice sent" : "not emailed"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

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
