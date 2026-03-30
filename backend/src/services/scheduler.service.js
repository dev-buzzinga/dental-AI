import { supabase } from "../config/database.js";
import { findAvailableSlots } from "../utils/appointmentHelper.js";
import { createAppointment } from "./appointment.service.js";
import { DateTime } from "luxon";

// Get scheduler configuration for a clinic
export const getSchedulerConfig = async (req, res) => {
    try {
        const { id: user_id } = req.user;

        const { data, error } = await supabase
            .from('scheduler_configs')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No configuration found, return default config
                return res.status(200).json({
                    success: true,
                    data: {
                        title: 'Book Your Appointment',
                        subtitle: 'Schedule your appointment with us',
                        primary_color: '#1976d2',
                        secondary_color: '#f5f5f5',
                        font_family: 'Roboto, sans-serif',
                        logo_url: null,
                        welcome_message: 'Welcome! Please select your preferred appointment time.',
                        appointment_types_enabled: true,
                        problem_description_enabled: true,
                        date_selection_enabled: true,
                        time_slot_selection_enabled: true,
                        patient_info_enabled: true,
                        confirmation_enabled: true,
                        config: {
                            customFields: [],
                            appointmentRules: {
                                minAdvanceNotice: 24,
                                maxAdvanceNotice: 90,
                                allowSameDay: false,
                                allowWeekends: false
                            },
                            notifications: {
                                emailConfirmation: true,
                                smsReminder: false,
                                reminderHours: 24
                            },
                            styling: {
                                buttonRadius: '8px',
                                shadow: '0 2px 4px rgba(0,0,0,0.1)',
                                animation: 'fadeIn'
                            }
                        },
                        is_active: false
                    }
                });
            }
            throw error;
        }

        // Fetch unique_key from practice_details
        const { data: practiceData } = await supabase
            .from('practice_details')
            .select('unique_key')
            .eq('user_id', user_id)
            .single();

        // Merge config JSON with base fields
        const mergedData = {
            ...data,
            unique_key: practiceData?.unique_key || null
        };

        return res.status(200).json({
            success: true,
            data: mergedData
        });
    } catch (error) {
        console.error('Error fetching scheduler config:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create or update scheduler configuration
export const saveSchedulerConfig = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { script_url, widget_props } = req.body; // widget_props is a JSON object
        // Check if config exists
        const { data: existingConfig } = await supabase
            .from('scheduler_configs')
            .select('id')
            .eq('user_id', user_id)
            .single();

        let result;
        if (existingConfig) {
            // Update
            const { data, error } = await supabase
                .from('scheduler_configs')
                .update({
                    script_url,
                    widget_props,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingConfig.id)
                .select('script_url, widget_props')
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from('scheduler_configs')
                .insert({
                    user_id,
                    script_url,
                    widget_props,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select('script_url, widget_props')
                .single();
            if (error) throw error;
            result = data;
        }

        // Fetch unique_key from practice_details
        const { data: practiceData } = await supabase
            .from('practice_details')
            .select('unique_key')
            .eq('user_id', user_id)
            .single();

        return res.status(200).json({
            success: true,
            message: existingConfig ? 'Configuration updated successfully' : 'Configuration created successfully',
            data: {
                ...result,
                unique_key: practiceData?.unique_key || null
            }
        });
    } catch (error) {
        console.error('Error saving scheduler config:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get public scheduler configuration by unique key
export const getPublicSchedulerConfig = async (req, res) => {
    try {
        const { uniqueKey } = req.params;
        const { data, error: fetchError } = await supabase
            .from('practice_details')
            .select('*')
            .eq('unique_key', uniqueKey)
            .single();

        if (fetchError || !data) {
            return res.status(404).json({
                success: false,
                error: 'Scheduler configuration not found'
            });
        }

        if (data) {
            const { data: schedulerConfig, error: configError } = await supabase
                .from('scheduler_configs')
                .select('*')
                .eq('user_id', data.user_id)
                .maybeSingle();


            if (configError || !schedulerConfig) {
                return res.status(404).json({
                    success: false,
                    error: 'Scheduler configuration not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: schedulerConfig
            });
        }


    } catch (error) {
        console.error('Error fetching public scheduler config:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch scheduler configuration'
        });
    }
};

// Get appointment types for public scheduler
export const getPublicAppointmentTypes = async (req, res) => {
    try {
        const { uniqueKey } = req.params;

        // First get the clinic_id from the scheduler config
        const { data, error: fetchError } = await supabase
            .from('practice_details')
            .select('*')
            .eq('unique_key', uniqueKey)
            .single();

        if (fetchError || !data) {
            return res.status(404).json({
                success: false,
                error: 'Scheduler configuration not found'
            });
        }

        // Get appointment types
        const { data: appointmentTypes, error: appointmentTypesError } = await supabase
            .from('appointment_types')
            .select('*')
            .eq('user_id', data.user_id)

        if (appointmentTypesError || !appointmentTypes) {
            return res.status(404).json({
                success: false,
                error: 'Appointment types not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Appointment types fetched successfully',
            data: appointmentTypes
        });

    } catch (error) {
        console.error('Error fetching public appointment types:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch appointment types'
        });
    }
};

// Get available time slots for a specific date
export const getAvailableTimeSlots = async (req, res) => {
    try {
        const { uniqueKey } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required'
            });
        }

        const { data, error } = await supabase
            .from('practice_details')
            .select('*')
            .eq('unique_key', uniqueKey)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                error: 'Scheduler configuration not found'
            });
        }

        const slots = await findAvailableSlots(data.user_id, date);
        if (!slots.success) {
            return res.status(500).json({
                success: false,
                error: slots.error || "Failed to fetch available time slots"
            });
        }

        return res.status(200).json({
            success: true,
            data: slots.data
        });
    } catch (error) {
        console.error('Error fetching available time slots:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch available time slots'
        });
    }
};

// Create appointment from public scheduler
export const createPublicAppointment = async (req, res) => {
    try {
        const { uniqueKey } = req.params;
        const { startTime, endTime, appointmentTypeId, selectedDoctor, patientDetails, notes, appointmentDate } = req.body;

        if (!startTime || !endTime || !appointmentTypeId || !selectedDoctor || !patientDetails?.email) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: startTime, endTime, appointmentTypeId, selectedDoctor, patientDetails.email"
            });
        }

        const { data, error } = await supabase
            .from('practice_details')
            .select('*')
            .eq('unique_key', uniqueKey)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                error: 'Scheduler configuration not found'
            });
        }

        const practiceTimezone = data?.address?.time_zone || "UTC";
        const normalizedEmail = String(patientDetails.email || "").trim().toLowerCase();

        const { data: existingPatient, error: patientFetchError } = await supabase
            .from("patients")
            .select("id, name, email, phone")
            .eq("user_id", data.user_id)
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (patientFetchError) {
            return res.status(500).json({
                success: false,
                error: patientFetchError.message || "Failed to fetch patient details"
            });
        }

        let patient = existingPatient;
        if (!patient) {
            const { data: insertedPatient, error: patientInsertError } = await supabase
                .from("patients")
                .insert({
                    user_id: data.user_id,
                    name: patientDetails?.name || "",
                    email: normalizedEmail,
                    phone: patientDetails?.phone || null
                })
                .select("id, name, email, phone")
                .single();

            if (patientInsertError) {
                return res.status(500).json({
                    success: false,
                    error: patientInsertError.message || "Failed to create patient"
                });
            }

            patient = insertedPatient;
        }

        const startISO = buildDateTimeISO(appointmentDate, startTime, practiceTimezone);
        const endISO = buildDateTimeISO(appointmentDate, endTime, practiceTimezone);

        if (!startISO || !endISO) {
            return res.status(400).json({
                success: false,
                error: "Invalid startTime/endTime format. Send ISO datetime or include appointmentDate with HH:mm."
            });
        }

        req.body = {
            user_id: data.user_id,
            timezone: practiceTimezone,
            start_time: startISO,
            end_time: endISO,
            appointment_type_id: appointmentTypeId,
            doctor_id: selectedDoctor,
            patient_details: {
                patient_id: patient.id,
                name: patientDetails?.name || patient?.name || "",
                email: normalizedEmail,
                phone: patientDetails?.phone || patient?.phone || ""
            },
            notes: notes || ""
        };

        return createAppointment(req, res);
    } catch (error) {
        console.error("Error creating public appointment:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Failed to create appointment"
        });
    }


};

const buildDateTimeISO = (appointmentDate, timeOrIso, timezone) => {
    if (!timeOrIso) return null;

    const asIso = DateTime.fromISO(timeOrIso, { zone: timezone || "UTC" });
    if (asIso.isValid && timeOrIso.includes("T")) {
        return asIso.toISO();
    }

    if (!appointmentDate) return null;
    const composed = DateTime.fromISO(`${appointmentDate}T${timeOrIso}`, { zone: timezone || "UTC" });
    if (!composed.isValid) return null;

    return composed.toISO();
};

