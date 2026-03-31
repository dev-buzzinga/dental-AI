import { supabase } from "../config/database.js";
import { getPracticeTimezone } from "../utils/appointmentHelper.js";
import { DateTime } from "luxon";
export const getOnePatientService = async (req, res) => {
    try {
        let { patient_id } = req.query;
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("id", patient_id)
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Patient fetched successfully",
            data: data,
        });

    } catch (error) {
        console.error("getOnePatientService error ==>", error.message);
        return res.status(500).json({ message: error.message });
    }
};
export const upcomingAppointmentService = async (req, res) => {
    try {
        const user_id = req.user?.id;
        let { patient_id } = req.query;
        const practiceTimezone = await getPracticeTimezone(user_id);
        const timezone = practiceTimezone || "UTC";
        const nowUtcISO = DateTime.now().setZone(timezone).toUTC().toISO();

        let { data, error } = await supabase
            .from('doctors_appointments')
            .select('start_time, end_time, meeting_date, doctors(name), appointment_types(name)')
            .filter('patient_details->>patient_id', 'eq', String(patient_id))
            .gte('start_time', nowUtcISO)
            .order('start_time', { ascending: true });

        if (error) throw error;
        const formattedData = (data || []).map((appointment) => {
            const startLocal = DateTime.fromISO(appointment.start_time, { zone: "utc" }).setZone(timezone);
            return {
                date: startLocal.toFormat("dd"),
                time: startLocal.toFormat("hh:mm a"),
                month_name: startLocal.toFormat("MMM").toLowerCase(),
                doctor_name: appointment?.doctors?.name || "",
                appointment_types_name: appointment?.appointment_types?.name || "",
            };
        });

        return res.status(200).json({
            success: true,
            message: "Upcoming appointments fetched successfully",
            data: formattedData,
        });

    } catch (error) {
        console.error("getRecordingService error ==>", error.message);
        return res.status(500).json({ message: error.message });
    }
};
export const historyAppointmentService = async (req, res) => {
    try {
        const user_id = req.user?.id;
        let { patient_id } = req.query;
        const practiceTimezone = await getPracticeTimezone(user_id);
        const timezone = practiceTimezone || "UTC";
        const nowUtcISO = DateTime.now().setZone(timezone).toUTC().toISO();

        let { data, error } = await supabase
            .from('doctors_appointments')
            .select('start_time, end_time, meeting_date, doctors(name), appointment_types(name)')
            .filter('patient_details->>patient_id', 'eq', String(patient_id))
            .order('start_time', { ascending: true });

        if (error) throw error;
        const formattedData = (data || []).map((appointment) => {
            const startLocal = DateTime.fromISO(appointment.start_time, { zone: "utc" }).setZone(timezone);
            const status = DateTime.fromISO(appointment.start_time, { zone: "utc" }).toISO() < nowUtcISO ? "Completed" : "Upcoming";
            const formated_date = DateTime.fromISO(appointment.start_time, { zone: "utc" }).toFormat("yyyy/MM/dd");
            return {
                date: startLocal.toFormat("dd"),
                time: startLocal.toFormat("hh:mm a"),
                month_name: startLocal.toFormat("MMM").toLowerCase(),
                doctor_name: appointment?.doctors?.name || "",
                appointment_types_name: appointment?.appointment_types?.name || "",
                status,
                formated_date
            };
        });

        return res.status(200).json({
            success: true,
            message: "Appointments fetched successfully",
            data: formattedData,
        });

    } catch (error) {
        console.error("getRecordingService error ==>", error.message);
        return res.status(500).json({ message: error.message });
    }
};


