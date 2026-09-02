import { Redis } from "@upstash/redis";

// Bookings are stored in Upstash Redis when it's configured.
// If it isn't — or if it fails for any reason — we fall back to
// in-memory storage so a booking is NEVER blocked by a storage
// problem. The invoice and emails always go out.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Guard against malformed values (e.g. the whole KEY="value" line
// pasted into the field) so a bad config can't crash the request.
const looksValid =
  typeof url === "string" &&
  url.startsWith("https://") &&
  !url.includes(" ") &&
  !url.includes('"') &&
  typeof token === "string" &&
  token.length > 10 &&
  !token.includes(" ") &&
  !token.includes('"');

const redis = looksValid ? new Redis({ url, token }) : null;

const KEY = "bookings";
globalThis.__memBookings = globalThis.__memBookings || [];

// Set when storage misbehaves, so the UI can warn you (not the guest).
let lastStorageError = null;
export function getStorageWarning() {
  if (!looksValid && (url || token)) {
    return "Storage credentials look malformed — bookings are not being saved permanently.";
  }
  if (!redis) {
    return "No storage connected — bookings are not saved permanently.";
  }
  return lastStorageError;
}

export async function getBookings() {
  if (redis) {
    try {
      const data = await redis.get(KEY);
      lastStorageError = null;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      lastStorageError = `Could not read saved bookings: ${err.message}`;
      return globalThis.__memBookings;
    }
  }
  return globalThis.__memBookings;
}

export async function addBooking(booking) {
  const all = await getBookings();
  const next = [...all, booking];

  // Always keep a copy in memory as a safety net.
  globalThis.__memBookings = next;

  if (redis) {
    try {
      await redis.set(KEY, next);
      lastStorageError = null;
    } catch (err) {
      lastStorageError = `Booking went out, but could not be saved: ${err.message}`;
    }
  }
  return booking;
}

// Inclusive overlap check — two stays clash if they share any night.
export function hasClash(bookings, checkIn, checkOut) {
  const a1 = new Date(checkIn + "T00:00:00Z").getTime();
  const a2 = new Date(checkOut + "T00:00:00Z").getTime();
  return bookings.some((b) => {
    const b1 = new Date(b.checkIn + "T00:00:00Z").getTime();
    const b2 = new Date(b.checkOut + "T00:00:00Z").getTime();
    return a1 < b2 && b1 < a2;
  });
}
