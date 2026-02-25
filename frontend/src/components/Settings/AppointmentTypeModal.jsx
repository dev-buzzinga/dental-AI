import { useState, useEffect } from "react";
import "../Patients/PatientModal.css"; // Reusing the same modal styles

const AppointmentTypeModal = ({ isOpen, onClose, onSave, appointmentType = null }) => {
    const [formData, setFormData] = useState({
        name: "",
        duration: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (appointmentType) {
            setFormData({
                name: appointmentType.name || "",
                duration: appointmentType.duration || ""
            });
        } else {
            setFormData({
                name: "",
                duration: ""
            });
        }
    }, [appointmentType]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Error saving appointment type:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="patient-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{appointmentType ? "Edit Appointment Type" : "Add Appointment Type"}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body custom-scrollbar">
                        <div className="patient-form">
                            <div className="form-group full-width">
                                <label>Appointment Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Consultation, Tooth Extraction"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Duration (Minutes)</label>
                                <input
                                    name="duration"
                                    type="number"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    placeholder="e.g. 30"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? "Saving..." : appointmentType ? "Update" : "Add Appointment Type"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentTypeModal;
