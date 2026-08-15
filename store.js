import { Redis } from "@upstash/redis";

// Uses Upstash Redis when the env vars are present (on Vercel).
// Falls back to in-memory storage so the app still runs locally
// without any database set up — handy for testing.

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const KEY = "bookings";
globalThis.__memBookings = globalThis.__memBookings || [];

export async function getBookings() {
  if (redis) {
    const data = await redis.get(KEY);
    return Array.isArray(data) ? data : [];
  }
  return globalThis.__memBookings;
}

export async function addBooking(booking) {
  const all = await getBookings();
  const next = [...all, booking];
  if (redis) {
    await redis.set(KEY, next);
  } else {
    globalThis.__memBookings = next;
  }
  return booking;
}

// Inclusive overlap check — two stays clash if they share any date.
export function hasClash(bookings, checkIn, checkOut) {
  const a1 = new Date(checkIn + "T00:00:00Z").getTime();
  const a2 = new Date(checkOut + "T00:00:00Z").getTime();
  return bookings.some((b) => {
    const b1 = new Date(b.checkIn + "T00:00:00Z").getTime();
    const b2 = new Date(b.checkOut + "T00:00:00Z").getTime();
    return a1 <= b2 && b1 <= a2;
  });
}
