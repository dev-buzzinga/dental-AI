import { supabase } from "../config/database.js";
import { getDoctorsByUserId } from "../utils/vapiHelper.js";
import { findAvailableSlots, getAppointmentTypes } from "../utils/appointmentHelper.js";
import moment from "moment";
async function getUser(phoneNumber) {
    if (!phoneNumber) {
        throw new Error('phoneNumber is required');
    }
    const { data: user, error } = await supabase
        .from('practice_details')
        .select('*')
        .eq('contact_information->>phone', phoneNumber)
        .single();

    if (error) throw error;
    if (!user) throw new Error('User not found');

    return user;
}
export const _initInformation = async (req, res) => {
    console.log('Received Vapi Request for Initi Information with query:', req.body);
    try {
        return res.json({
            result: "success",
            todayDate: moment().format('YYYY-MM-DD'),
            currentTime: moment().format('hh:mm A'),
            message: "Information fetched successfully!"
        });
    } catch (error) {
        console.error('Error in Init Information', error);
        return res.status(500).json({ error: error.message });
    }
}
export const _findDoctor = async (req, res) => {
    try {
        // console.log('Received Vapi Request for find-doctor with query:', JSON.stringify(req.body));

        const { toPhoneNumber, } = req.body;

        if (!toPhoneNumber) {
            return res.status(400).json({ error: 'toPhoneNumber is required' });
        }
        const user = await getUser(toPhoneNumber);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        const doctors = await getDoctorsByUserId(user.user_id);
        console.log("Doctors ----", doctors);
        return res.json({ data: doctors });
    } catch (error) {
        console.error('Error in VAPI find-doctor:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const _findDoctorsSlots = async (req, res) => {
    try {

        console.log('Received Vapi Request for find-slots with Body:', req.body);
        const { date, toPhoneNumber, fromPhoneNumber, assistantId } = req.body;

        const user = await getUser(toPhoneNumber);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (!date || new Date(date) < new Date()) {
            return res.status(400).json({ error: 'Invalid or past date' });
        }
        const slots = await findAvailableSlots(user.user_id, date)

        console.log("Slots ----", slots);
        return res.json({ slots: slots });
    } catch (error) {
        console.log('Error fetching slots:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const _updateIntent = async (req, res) => {
    try {
        console.log(">>>>>>>>>> Update Intent Body ---", req.body)
        const { Outcome, Sentiment, campaignCallId } = req.body;

        if (!Outcome || !Sentiment || !campaignCallId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('campaign_calls')
            .update({
                // call_status: 'completed',
                remark: Outcome === "APPOINMENT_SCHEDULE_CONFIRMATION" ? 'Booked' : Outcome,
                sentiment: Sentiment,
            })
            .eq('id', campaignCallId)
            .select()
            .single();

        if (error) {
            console.log("Error in updating campaign call Details", error);
            return res.status(400).json({ error: 'Invalid campaignCallId' });
        }
        return res.json({ result: "success" });
    } catch (error) {
        console.log('Error updating intent:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const _findAppointment = async (req, res) => {
    try {
        console.log('Received Vapi Request for Fetch Appointment with query::', req.body);
        const { toPhoneNumber, phone } = req.body;
        if (!toPhoneNumber) {
            console.log("toPhoneNumber missing");
            return res.status(400).json({ error: 'toPhoneNumber is required' });
        }
        if (!phone) {
            console.log("Phone number missing");
            return res.status(400).json({ error: 'phone is required' });
        }

        const user = await getUser(toPhoneNumber);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const { data: patients, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .like('phone', phone)
            .eq('user_id', user.user_id)
            .limit(100);
        if (patientError || !patients || patients.length === 0) {
            console.log("Error in fetching Patient Details");
            return res.status(400).json({ error: 'No patient found with this phone number' });
        }
        const patientsIds = patients.map(p => p.id);

        const { data: appointments, error: appointmentError } = await supabase
            .from('doctors_appointments')
            .select(`*, doctors(name), appointment_types(name), patient_details`)
            .in('patient_details->>patient_id', patientsIds)
            .eq('user_id', user.user_id)
            .gte('start_time', moment().format('YYYY-MM-DD'))
            .order('start_time', { ascending: false });

        if (appointmentError) {
            console.log("Error in fetching Appointment Details", appointmentError);
            return res.status(400).json({ error: appointmentError });
        }

        if (!appointments || appointments.length === 0) {
            return res.status(404).json({ error: 'No appointments found for this patient' });
        }

        return res.json({
            result: "success",
            appointments
        });
    } catch (error) {
        console.log('Error finding appointment:', error);
        return res.status(500).json({ error: error.message });
    }
};
export const _bookAppointment = async (req, res) => {
    try {
        console.log('Received Vapi Request for book-appointment with query:', req.body);
        const { date, toPhoneNumber, email, phone, doctorId, startTime, endTime, reason, name } = req.body;
        if (!toPhoneNumber) {
            return res.status(400).json({ error: 'toPhoneNumber is required' });
        }
        if (!date || !email || !phone || !doctorId || !startTime) {
            console.log("Missing required fields");
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await getUser(toPhoneNumber);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const appointmentTypes = await getAppointmentTypes(user.user_id);
        if (!appointmentTypes || appointmentTypes.length === 0) {
            return res.status(400).json({ error: 'No appointment types found' });
        }
        const defaultSelectedAppointType = appointmentTypes[0];
        // added helper for patiens detail
        let payload = {
            user_id: user.user_id,
            timezone: user.address?.time_zone || "UTC",
            start_time: startTime,
            end_time: endTime,
            appointment_type_id: defaultSelectedAppointType.id,
            doctor_id: doctorId,
            patient_details: {
                patient_id: patient.id,
                name: patientDetails?.name || patient?.name || "",
                email: normalizedEmail,
                phone: patientDetails?.phone || patient?.phone || ""
            },
            notes: `VA:: ${reason || 'Unknown'}`,
        };
    } catch (error) {
        console.log('Error booking appointment:', error);
        return res.status(500).json({ error: error.message });
    }
}