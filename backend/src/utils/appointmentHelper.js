import { DateTime } from "luxon";
import { supabase } from "../config/database.js";

async function findAvailableSlots(user_id, date) {
    try {
        const targetDate = DateTime.fromISO(date);
        if (!targetDate.isValid) {
            return {
                success: false,
                error: "Invalid date format. Expected yyyy-MM-dd"
            };
        }

        const practiceTimezone = await getPracticeTimezone(user_id);
        const tz = practiceTimezone || "UTC";

        const { data: doctors, error: doctorsError } = await supabase
            .from("doctors")
            .select("id, name, specialty, weekly_availability, off_days")
            .eq("user_id", user_id);

        if (doctorsError) throw doctorsError;
        if (!doctors || doctors.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        const dayStartLocal = DateTime.fromISO(date, { zone: tz }).startOf("day");
        const dayEndLocal = dayStartLocal.plus({ days: 1 });
        const dayStartUTC = dayStartLocal.toUTC().toISO();
        const dayEndUTC = dayEndLocal.toUTC().toISO();
        const dayName = getDayName(dayStartLocal);

        const doctorIds = doctors.map((d) => d.id);
        const { data: appointments, error: appointmentsError } = await supabase
            .from("doctors_appointments")
            .select("doctor_id, start_time, end_time, meeting_date, timezone")
            .in("doctor_id", doctorIds)
            .lt("start_time", dayEndUTC)
            .gt("end_time", dayStartUTC);

        if (appointmentsError) throw appointmentsError;

        const appointmentsByDoctor = new Map();
        for (const appt of appointments || []) {
            if (!appointmentsByDoctor.has(appt.doctor_id)) {
                appointmentsByDoctor.set(appt.doctor_id, []);
            }
            appointmentsByDoctor.get(appt.doctor_id).push({
                start: DateTime.fromISO(appt.start_time, { zone: "utc" }).setZone(tz),
                end: DateTime.fromISO(appt.end_time, { zone: "utc" }).setZone(tz)
            });
        }

        const data = doctors.map((doctor) => {
            const weekly = doctor.weekly_availability || {};
            const avail = weekly[dayName];

            if (!avail || !avail.enabled) {
                return {
                    doctor_id: doctor.id,
                    doctor_name: doctor.name || "",
                    specialist: doctor.specialty || "",
                    available_slots: []
                };
            }

            const isOnLeave = checkDoctorOnLeave(doctor.off_days, dayStartLocal.toFormat("yyyy-MM-dd"));
            if (isOnLeave) {
                return {
                    doctor_id: doctor.id,
                    doctor_name: doctor.name || "",
                    specialist: doctor.specialty || "",
                    available_slots: []
                };
            }

            const startMinutes = timeToMinutes(avail.start);
            const endMinutes = timeToMinutes(avail.end);
            const booked = appointmentsByDoctor.get(doctor.id) || [];
            const availableSlots = [];

            for (let minute = startMinutes; minute + 60 <= endMinutes; minute += 60) {
                const slotStart = dayStartLocal.plus({ minutes: minute });
                const slotEnd = slotStart.plus({ hours: 1 });

                const isBooked = booked.some((b) => slotStart < b.end && slotEnd > b.start);
                if (!isBooked) {
                    availableSlots.push({
                        start: slotStart.toFormat("HH:mm"),
                        end: slotEnd.toFormat("HH:mm"),
                        label: `${slotStart.toFormat("HH:mm")} - ${slotEnd.toFormat("HH:mm")}`
                    });
                }
            }

            return {
                doctor_id: doctor.id,
                doctor_name: doctor.name || "",
                specialist: doctor.specialty || "",
                available_slots: availableSlots
            };
        });

        return {
            success: true,
            data
        };
    } catch (error) {
        console.error("Error fetching available slots:", error);
        return {
            success: false,
            error: "Failed to fetch available time slots"
        };
    }
}

function getDayName(dt) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dt.weekday % 7];
}

function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;

    const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
    }

    const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        return h * 60 + m;
    }

    return 0;
}

function checkDoctorOnLeave(offDays, targetDateStr) {
    const list = offDays || [];
    for (const item of list) {
        let leave;
        try {
            leave = typeof item === "string" ? JSON.parse(item) : item;
        } catch {
            continue;
        }

        const from = leave?.from;
        const to = leave?.to;
        if (!from || !to) continue;

        if (targetDateStr >= from && targetDateStr <= to) {
            return true;
        }
    }
    return false;
}

async function getPracticeTimezone(user_id) {
    try {
        const { data, error } = await supabase
            .from("practice_details")
            .select("address")
            .eq("user_id", user_id)
            .single();
        if (error) throw error;

        return data?.address?.time_zone || null;
    } catch (error) {
        console.error("Error fetching practice timezone:", error);
        return null;
    }
}

export { findAvailableSlots };