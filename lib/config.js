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

  // These details are PRINTED ON THE INVOICE. Always keep them correct —
  // testing never changes them (see testRecipient below).
  payee: {
    company: "TALESH B.V.",
    attn: "D. Yahoo",
    address: "Nieuweweg 45A",
    postalCity: "2132CL Hoofddorp",
    btw: "NL81414437B01",
    phone: "0651810786",
    email: "sunnywright08@gmail",
  },

  bank: {
    iban: "NL41ABNA0563234105",
    accountName: "J.M. Mariarathanam",
  },

  // CC'd on the invoice email.
  ccEmails: ["Ilona@ceg.international"],

  // Who gets the calendar invite when a booking is made.
  calendarRecipients: [
    "Jason.Mariarathanam@gmail.com",
    "Ilona@ceg.international",
  ],

  // ---------------------------------------------------------------
  // TESTING SWITCH
  // Put an address here and ALL email (invoice + calendar) goes only
  // there — nothing reaches TALESH or Ilona. The invoice PDF still
  // shows the real details, so you're testing the real document.
  //
  // While using the onboarding@resend.dev sender, this MUST be the
  // exact address you signed up to Resend with.
  //
  // SET THIS TO "" TO GO LIVE.
  // ---------------------------------------------------------------
  testRecipient: "sunnywright08@gmail.com",

  // "From" address used by Resend. Must be on a domain you've verified
  // in Resend, OR use resend's onboarding test address to start:
  // "onboarding@resend.dev" (only delivers to your own signup email
  // until you verify a real domain).
  fromEmail: "onboarding@resend.dev",
  fromName: "Jason Mariarathanam",
};

// Returns the real recipients, or the test address if testing is on.
export function route(recipients) {
  const list = [].concat(recipients).filter(Boolean);
  if (CONFIG.testRecipient) return [CONFIG.testRecipient];
  return list;
}

// CC is dropped entirely while testing, so nothing leaks out.
export function routeCc(recipients) {
  if (CONFIG.testRecipient) return [];
  return [].concat(recipients).filter(Boolean);
}
