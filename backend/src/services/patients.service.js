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

const DEFAULT_COVERAGE_CATEGORIES = [
    { category: 'Preventive/Perio', percentage: 100, deductibleApplies: false, restorative: false, endo: false, perio: true, oralSurgery: false },
    { category: 'Basic', percentage: 80, deductibleApplies: true, restorative: true, endo: true, perio: true, oralSurgery: true },
    { category: 'Major', percentage: 50, deductibleApplies: true, restorative: true, endo: true, perio: true, oralSurgery: true },
    {
        category: 'Orthodontic',
        percentage: 50,
        deductibleApplies: false,
        restorative: false,
        endo: false,
        perio: false,
        oralSurgery: false,
        orthoDetails: {
            codes: ['D8080', 'D8090'],
            lifetimeMax: 2000,
            ageLimit: 19,
            workInProgress: true,
            paymentFrequency: 'Monthly',
        },
    },
];

const DEFAULT_PROCEDURE_CODES = [
    { code: 'D0120', description: 'Periodic Oral Evaluation', category: 'Diagnostic', frequency: '2x per year', interval: '6 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Includes bitewings' },
    { code: 'D1110', description: 'Prophylaxis - Adult', category: 'Preventive', frequency: '2x per year', interval: '6 months', percentage: 100, deductibleApplies: false, covered: true, txSameDay: true, notes: 'Standard cleaning' },
    { code: 'D2740', description: 'Crown - Porcelain/Ceramic', category: 'Restorative', frequency: '1x per 7 years', interval: '84 months', percentage: 50, deductibleApplies: true, covered: true, txSameDay: false, notes: 'High strength' },
];

const DEFAULT_COVERED_MEMBERS = [];

const DEFAULT_INSURANCE = {
    subscriber_name: '',
    ssn_masked: '',
    member_id: '',
    dob: '',
    company: '',
    phone: '',
    group_name: '',
    group_number: '',
    payer_id: '',
    effective_date: '',
    email_fax: '',
    timely_filing: '',
    network_status: '',
    fee_schedule: '',
    plan_year_type: '',
    plan_year_start: '',
    plan_year_end: '',
    yearly_max: 0,
    yearly_max_used: 0,
    deductible_individual: 0,
    deductible_individual_met: 0,
    deductible_family: 0,
    deductible_family_met: 0,
    coverage_type: '',
    dependent_age_limit: null,
    cob_rule: '',
    waiting_period_has: false,
    waiting_period_details: '',
    missing_tooth_clause_has: false,
    missing_tooth_clause_details: '',
    po_box: '',
    verified_by: '',
    date_verified: '',
    reference_number: '',
    verification_notes: '',
    coverage_categories: DEFAULT_COVERAGE_CATEGORIES,
    procedure_codes: DEFAULT_PROCEDURE_CODES,
    covered_members: DEFAULT_COVERED_MEMBERS,
};

const sanitizeInsurancePayload = (payload = {}) => {
    const merged = {
        ...DEFAULT_INSURANCE,
        ...payload,
    };

    const normalizeDateOrNull = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "string" && value.trim() === "") return null;
        return value;
    };

    return {
        ...merged,
        dob: normalizeDateOrNull(merged.dob),
        effective_date: normalizeDateOrNull(merged.effective_date),
        plan_year_start: normalizeDateOrNull(merged.plan_year_start),
        plan_year_end: normalizeDateOrNull(merged.plan_year_end),
        date_verified: normalizeDateOrNull(merged.date_verified),
        coverage_categories: Array.isArray(merged.coverage_categories) ? merged.coverage_categories : DEFAULT_COVERAGE_CATEGORIES,
        procedure_codes: Array.isArray(merged.procedure_codes) ? merged.procedure_codes : DEFAULT_PROCEDURE_CODES,
        covered_members: Array.isArray(merged.covered_members) ? merged.covered_members : DEFAULT_COVERED_MEMBERS,
    };
};

export const getPatientInsuranceService = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { patient_id } = req.query;

        const { data, error } = await supabase
            .from("patients_insurance")
            .select("*")
            .eq("patient_id", patient_id)
            .eq("user_id", user_id)
            .maybeSingle();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Patient insurance fetched successfully",
            data: data ? sanitizeInsurancePayload(data) : sanitizeInsurancePayload(),
        });
    } catch (error) {
        console.error("getPatientInsuranceService error ==>", error.message);
        return res.status(500).json({ message: error.message });
    }
};

export const upsertPatientInsuranceService = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const { patient_id, insurance } = req.body || {};

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                message: "patient_id is required",
            });
        }

        const insurancePayload = sanitizeInsurancePayload(insurance);
        const payload = {
            user_id,
            patient_id,
            ...insurancePayload,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("patients_insurance")
            .upsert(payload, { onConflict: "user_id,patient_id" })
            .select("*")
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Patient insurance saved successfully",
            data,
        });
    } catch (error) {
        console.error("upsertPatientInsuranceService error ==>", error.message);
        return res.status(500).json({ message: error.message });
    }
};


