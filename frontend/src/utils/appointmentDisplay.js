import { DateTime } from "luxon";

/**
 * Convert UTC start_time/end_time to display shape for calendar/list UIs.
 * @param {{ start_time?: string, end_time?: string, meeting_date?: string, from?: string, to?: string }} appointment
 * @param {string} displayTimezone - IANA zone (e.g. from practice_details or Intl.resolvedOptions().timeZone)
 * @returns {{ meeting_date: string, from: string, to: string }}
 */
export function appointmentToDisplay(appointment, displayTimezone) {
    const tz = displayTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (appointment.start_time && appointment.end_time) {
        const start = DateTime.fromISO(appointment.start_time, { zone: "utc" }).setZone(tz);
        const end = DateTime.fromISO(appointment.end_time, { zone: "utc" }).setZone(tz);
        const meeting_date = start.toFormat("yyyy-MM-dd");
        const from = start.toFormat("hh:mm a");
        const to = end.toFormat("hh:mm a");
        return { meeting_date, from, to };
    }

    return {
        meeting_date: appointment.meeting_date || "",
        from: appointment.from || "",
        to: appointment.to || "",
    };
}
