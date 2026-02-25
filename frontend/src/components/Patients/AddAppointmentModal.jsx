import { useState, useEffect } from "react";
import { supabase } from "../../config/supabase";

const AddAppointmentModal = ({ isOpen, onClose, onSave, patientId, userId, appointment }) => {
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        doctor_id: "",
        patient_id: "",
        purpose: "",
        date: "",
        status: "Upcoming"
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDoctors();
            if (appointment) {
                setFormData({
                    id: appointment.id,
                    doctor_id: appointment.doctor_id,
                    patient_id: appointment.patient_id,
                    purpose: appointment.purpose,
                    date: appointment.date,
                    status: appointment.status
                });
            } else {
                setFormData({
                    doctor_id: "",
                    patient_id: patientId || "",
                    purpose: "",
                    date: "",
                    status: "Upcoming"
                });
            }
        }
    }, [isOpen, patientId, appointment]);

    const fetchDoctors = async () => {
        try {
            const { data, error } = await supabase
                .from("doctors")
                .select("id, name");

            if (error) throw error;
            setDoctors(data || []);

            // Prefill doctor_id only if adding new appointment
            if (!appointment && data?.length > 0 && !formData.doctor_id) {
                setFormData(prev => ({
                    ...prev,
                    doctor_id: data[0].id
                }));
            }
        } catch (error) {
            console.error("Error fetching doctors:", error);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.doctor_id || !formData.patient_id) {
            alert("Invalid Doctor or Patient ID");
            return;
        }

        setLoading(true);

        const payload = {
            ...formData,
            doctor_id: String(formData.doctor_id),
            patient_id: String(formData.patient_id),
            user_id: userId
        };

        await onSave(payload);

        setLoading(false);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="patient-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{appointment ? "Edit Appointment" : "Add Appointment"}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body custom-scrollbar">
                        <div className="patient-form">
                            <div className="form-group full-width">
                                <label>Doctor Name</label>
                                <select
                                    name="doctor_id"
                                    value={formData.doctor_id}
                                    onChange={handleChange}
                                    required
                                    className="custom-scrollbar"
                                >
                                    <option value="" disabled>Select a doctor</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label>Purpose of Appointment</label>
                                <input
                                    name="purpose"
                                    value={formData.purpose}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter purpose of appointment"
                                />
                            </div>

                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    name="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? (appointment ? "Updating..." : "Adding...") : (appointment ? "Update Appointment" : "Add Appointment")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAppointmentModal;