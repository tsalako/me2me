import { formatInTimeZone } from "date-fns-tz";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Los_Angeles";

export function formatDateTime(dt) {
  if (!dt) return "";
  return formatInTimeZone(new Date(dt), APP_TIMEZONE, "EEE, MMM d, yyyy h:mm a zzz");
}

export function formatDayHeading(dt) {
  if (!dt) return "";
  return formatInTimeZone(new Date(dt), APP_TIMEZONE, "EEEE, MMMM d, yyyy");
}

export function startOfDayIso(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00.000Z`);
}
