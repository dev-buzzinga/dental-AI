import { useState, useEffect } from "react";
import "./PatientModal.css";

const PatientModal = ({ isOpen, onClose, onSave, patient = null }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        insurance: "",
        member_id: "",
        gender: "Male",
        dob: "",
        next_appointment: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (patient) {
            setFormData({
                name: patient.name || "",
                email: patient.email || "",
                phone: patient.phone || "",
                insurance: patient.insurance || "",
                member_id: patient.member_id || patient.memberId || "",
                gender: patient.gender || "Male",
                dob: patient.dob || "",
                next_appointment: patient.next_appointment || ""
            });
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                insurance: "",
                member_id: "",
                gender: "Male",
                dob: "",
                next_appointment: ""
            });
        }
    }, [patient]);

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
            console.error("Error saving patient:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="patient-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{patient ? "Edit Patient" : "Add New Patient"}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body custom-scrollbar">
                        <div className="patient-form">
                            <div className="form-group full-width">
                                <label>Full Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone (With Country Code)</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+61..."
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Insurance</label>
                                <input
                                    name="insurance"
                                    value={formData.insurance}
                                    onChange={handleChange}
                                    placeholder="Private health insurance"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Member ID</label>
                                <input
                                    name="member_id"
                                    value={formData.member_id}
                                    onChange={handleChange}
                                    placeholder="Insurance member ID"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    name="dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Next Appointment</label>
                                <input
                                    name="next_appointment"
                                    type="date"
                                    value={formData.next_appointment}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? "Saving..." : patient ? "Update" : "Add Patient"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientModal;
