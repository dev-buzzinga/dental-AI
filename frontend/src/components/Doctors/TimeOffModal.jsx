import React, { useState } from "react";
import TimeOffManager from "./TimeOffManager";
import "./DoctorModal.css";

const TimeOffModal = ({ isOpen, onClose, onSave, initialOffDays = [] }) => {
    const [offDays, setOffDays] = useState([]);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSave = () => {
        // Validation
        const incomplete = offDays.some(day => !day.name.trim() || !day.from || !day.to);
        if (incomplete) {
            setError("Please fill in all fields for all off days");
            return;
        }
        onSave(offDays);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="patient-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Manage Time Off</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body custom-scrollbar" style={{ minHeight: 320 }}>
                    <TimeOffManager
                        initialOffDays={initialOffDays}
                        onChange={setOffDays}
                        error={error}
                    />
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-save" onClick={handleSave}>Update Time Off</button>
                </div>
            </div>
        </div>
    );
};

export default TimeOffModal;
