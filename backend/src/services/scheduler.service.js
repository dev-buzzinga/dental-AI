import { supabase } from "../config/database.js";

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

        // Merge config JSON with base fields
        const mergedData = {
            ...data,
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

        return res.status(200).json({
            success: true,
            message: existingConfig ? 'Configuration updated successfully' : 'Configuration created successfully',
            data: result
        });
    } catch (error) {
        console.error('Error saving scheduler config:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};