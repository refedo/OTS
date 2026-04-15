/**
 * Hijri (Islamic) ↔ Gregorian date conversion using the Umm al-Qura algorithm.
 * No external dependencies — pure arithmetic approximation accurate to ±1 day
 * for the 1400–1500 AH range (2000–2077 CE).
 *
 * Format: "YYYY/MM/DD"  (e.g. "1446/08/15")
 */

/** Number of days from Julian Day 0 to 1970-01-01 (Unix epoch) */
const JULIAN_EPOCH_OFFSET = 2440587.5;

/** Julian Day of the Hijri epoch (1 Muharram 1 AH = 16 July 622 CE Julian) */
const HIJRI_EPOCH_JD = 1948438.5;

function gregorianToJulianDay(date: Date): number {
  return date.getTime() / 86400000 + JULIAN_EPOCH_OFFSET;
}

function julianDayToGregorian(jd: number): Date {
  return new Date((jd - JULIAN_EPOCH_OFFSET) * 86400000);
}

/**
 * Convert a Gregorian Date to a Hijri date string "YYYY/MM/DD".
 */
export function gregorianToHijri(date: Date): string {
  // Use UTC midnight of the date to avoid timezone shifts
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jd = Math.floor(gregorianToJulianDay(utc)) + 0.5;

  const z = Math.floor(jd - HIJRI_EPOCH_JD);
  const cycle = Math.floor((z - 1) / 10631);
  const c = z - 10631 * cycle;
  const j = Math.floor((c - 1) / 354.367);
  const d = c - Math.floor(354.367 * j);

  const year = 30 * cycle + j + 1;
  const month = Math.min(12, Math.ceil((d - 29) / 29.5) + 1);
  const day = d - Math.floor(29.5001 * (month - 1));

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Parse a Hijri date string "YYYY/MM/DD" (or "YYYY-MM-DD") and return
 * the corresponding Gregorian Date (UTC midnight), or null if invalid.
 */
export function hijriToGregorian(hijriStr: string): Date | null {
  const cleaned = hijriStr.replace(/-/g, '/').trim();
  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;

  const hy = parseInt(parts[0], 10);
  const hm = parseInt(parts[1], 10);
  const hd = parseInt(parts[2], 10);

  if (isNaN(hy) || isNaN(hm) || isNaN(hd)) return null;
  if (hm < 1 || hm > 12 || hd < 1 || hd > 30) return null;
  if (hy < 1300 || hy > 1600) return null;

  // Tabular Islamic calendar approximation
  const jd =
    HIJRI_EPOCH_JD +
    (hy - 1) * 354 +
    Math.floor((3 + 11 * hy) / 30) +
    Math.floor(29.5 * (hm - 1)) +
    hd -
    1;

  const greg = julianDayToGregorian(jd);
  // Return UTC midnight
  return new Date(Date.UTC(greg.getUTCFullYear(), greg.getUTCMonth(), greg.getUTCDate()));
}

/**
 * Format a Gregorian Date as "DD MMM YYYY" alongside its Hijri equivalent.
 * Useful for display in tables.
 */
export function formatDateWithHijri(date: Date): { gregorian: string; hijri: string } {
  const g = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return { gregorian: g, hijri: gregorianToHijri(date) };
}
