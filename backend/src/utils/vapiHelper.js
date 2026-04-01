import { supabase } from "../config/database.js";

export const specialist_master = [
    { key: "oral-surgeon", value: "oral-surgeon", label: "Oral Surgeon" },
    { key: "cosmetic-surgeon", value: "cosmetic-surgeon", label: "Cosmetic Surgeon" },
    { key: "implantation-expert", value: "implantation-expert", label: "Implantation Expert" },
    { key: "general-dentist", value: "general-dentist", label: "General Dentist" },
    { key: "orthodontist", value: "orthodontist", label: "Orthodontist" },
    { key: "periodontist", value: "periodontist", label: "Periodontist" },
    { key: "endodontist", value: "endodontist", label: "Endodontist" },
    { key: "prosthodontist", value: "prosthodontist", label: "Prosthodontist" },
    { key: "pediatric-dentist", value: "pediatric-dentist", label: "Pediatric Dentist" },
    { key: "oral-maxillofacial-pathologist", value: "oral-maxillofacial-pathologist", label: "Oral and Maxillofacial Pathologist" },
    { key: "oral-medicine-specialist", value: "oral-medicine-specialist", label: "Oral Medicine Specialist" },
    { key: "dental-anesthesiologist", value: "dental-anesthesiologist", label: "Dental Anesthesiologist" },
    { key: "public-health-dentist", value: "public-health-dentist", label: "Public Health Dentist" },
    { key: "oral-radiologist", value: "oral-radiologist", label: "Oral Radiologist" },
    { key: "forensic-odontologist", value: "forensic-odontologist", label: "Forensic Odontologist" },
    { key: "special-needs-dentistry", value: "special-needs-dentistry", label: "Special Needs Dentistry" },
    { key: "geriatric-dentist", value: "geriatric-dentist", label: "Geriatric Dentist" },
    { key: "tmj-tmd-specialist", value: "tmj-tmd-specialist", label: "TMJ/TMD Specialist" },
    { key: "sleep-dentistry-specialist", value: "sleep-dentistry-specialist", label: "Sleep Dentistry Specialist" },
    { key: "other", value: "other", label: "Other" },
];
export const getDoctorsByUserId = async (userId) => {
    try {

        console.log('Fetching doctors for user:', userId);
        const { data: doctors, error } = await supabase
            .from('doctors')
            .select('*')
            .eq('user_id', userId)

        if (error) {
            console.log('Error fetching doctors:', error);
            throw new Error(error.message);
        }

        const parseDayOffs = (offDays) => {
            if (!Array.isArray(offDays)) return [];
            return offDays
                .map((item) => {
                    if (typeof item === 'string') {
                        try {
                            return JSON.parse(item);
                        } catch (parseError) {
                            console.log('Invalid off_days entry:', item, parseError);
                            return null;
                        }
                    }
                    return item;
                })
                .filter(Boolean);
        };

        let formattedDoctors = doctors.map((doc) => {
            const specialtyKey = doc.specialty || doc.specialist;
            const selectedSpecialist = specialist_master.find((spec) => spec.key === specialtyKey);
            const specialist_name = selectedSpecialist ? selectedSpecialist.label : specialtyKey;
            const dayOffs = parseDayOffs(doc.off_days);

            return {
                ...doc,
                specialist_name,
                dayOffs
            }
        })
        return formattedDoctors;
    } catch (error) {
        console.log('Error fetching doctors:', error);
        throw new AppError(error.message, error.statusCode || 500);
    }
};

