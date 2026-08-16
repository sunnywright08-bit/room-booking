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
