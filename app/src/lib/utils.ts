import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * Format a plain "YYYY-MM-DD" booking date without any timezone conversion
 * (avoids the off-by-one shift that new Date(str) / toISOString cause).
 * e.g. "2026-07-05" -> "5 Jul 2026".
 */
export function formatBookingDate(value: string): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  return `${Number(d)} ${month} ${y}`;
}

/**
 * Format a booking time to 12-hour form. Accepts "HH:MM" (24h) or an
 * already-12h string. e.g. "13:00" -> "1:00 PM", "09:00" -> "9:00 AM".
 */
export function formatBookingTime(value: string): string {
  if (!value) return '';
  if (/[ap]m/i.test(value)) return value.toUpperCase().replace(/\s+/g, ' ').trim();
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  let h = Number(m[1]);
  const min = m[2];
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${meridiem}`;
}
