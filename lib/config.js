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

  payee: {
    company: "TALESH B.V.",
    attn: "D. Yahoo",
    address: "Nieuweweg 45A",
    postalCity: "2132CL Hoofddorp",
    btw: "NL81414437B01",
    phone: "0651810786",
    email: "sunnywright08@gmail.com",
  },

  bank: {
    iban: "NL41ABNA0563234105",
    accountName: "J.M. Mariarathanam",
  },

  // Every invoice email CCs this address in addition to the payee.
  ccEmails: ["Ilona@ceg.international"],

  // "From" address used by Resend. Must be on a domain you've verified
  // in Resend, OR use resend's onboarding test address to start:
  // "onboarding@resend.dev" (only delivers to your own signup email
  // until you verify a real domain).
  fromEmail: "onboarding@resend.dev",
  fromName: "Jason Mariarathanam",
};
