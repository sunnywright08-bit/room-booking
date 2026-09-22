// All the fixed details for the room rental business.
// Edit these values any time — no code logic lives here.

export const CONFIG = {
  pricePerNight: 65, // EUR

  biller: {
    name: "Jason Mariarathanam",
    address: "Thijs Ouwerkerkstraat 1",
    postalCity: "2132 ZW Hoofddorp",
    country: "The Netherlands",
    email: "Jason.Mariarathanam@gmail.com",
  },

  // These details are PRINTED ON THE INVOICE PDF. Keep them correct —
  // redirecting email never changes them (see the DELIVERY section below).
  payee: {
    company: "TALESH B.V.",
    attn: "D. Yahoo",
    address: "Nieuweweg 45A",
    postalCity: "2132CL Hoofddorp",
    btw: "NL81414437B01",
    phone: "0651810786",
    email: "yahood_@hotmail.com",
  },

  bank: {
    iban: "NL41ABNA0563234105",
    accountName: "J.M. Mariarathanam",
  },

  // ================================================================
  // DELIVERY — who actually receives each email.
  //
  // Each line below can be changed on its own, so you can redirect
  // one recipient while the others carry on normally.
  // ================================================================

  // Invoice email. Leave "" to send to payee.email above (the live
  // setting). Put an address here to receive it yourself instead.
  invoiceTo: "yahood_@hotmail.com",

  // CC'd on the invoice email. Set to [] to drop the CC entirely.
  ccEmails: ["Ilona@ceg.international"],

  // Who gets the calendar invite.
  // Note: Jason's CEG address, not the Gmail. The Gmail stays as the
  // biller contact printed on the invoice and as the reply-to address.
  calendarRecipients: [
    "jason@ceg.international",
    "Ilona@ceg.international",
  ],

  // MASTER TEST SWITCH — overrides all three lines above.
  // Put an address here and EVERYTHING goes only there.
  // Leave "" for normal operation.
  testRecipient: "",

  // ================================================================

  // "From" address. Must be on your verified Resend domain
  // (ceg.international). The mailbox does not need to exist.
  fromEmail: "invoices@ceg.international",
  fromName: "Jason Mariarathanam",
};

// Where the invoice email goes: test switch > invoiceTo > payee.email
export function invoiceRecipients() {
  if (CONFIG.testRecipient) return [CONFIG.testRecipient];
  if (CONFIG.invoiceTo) return [CONFIG.invoiceTo];
  return [CONFIG.payee.email];
}

// CC list — dropped entirely while the master test switch is on.
export function ccRecipients() {
  if (CONFIG.testRecipient) return [];
  return [].concat(CONFIG.ccEmails).filter(Boolean);
}

// Calendar invite recipients.
export function calendarInviteRecipients() {
  if (CONFIG.testRecipient) return [CONFIG.testRecipient];
  return [].concat(CONFIG.calendarRecipients).filter(Boolean);
}
