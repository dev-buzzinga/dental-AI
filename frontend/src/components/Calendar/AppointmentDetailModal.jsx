const AppointmentDetailModal = ({ isOpen, onClose, appointment, doctorMap, typeMap }) => {
    if (!isOpen || !appointment) return null;

    const doctorName = doctorMap[appointment.doctor_id] || appointment.doctor_id || '—';
    const typeName = typeMap[appointment.appointment_type_id] || appointment.appointment_type_id || '—';
    const patient = appointment.patient_details || {};

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="appt-detail-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="appt-detail-header">
                    <h2>
                        <i className="fas fa-calendar-check" />
                        Appointment Details
                    </h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {/* Body */}
                <div className="appt-detail-body custom-scrollbar">
                    {/* Schedule Info */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-clock" /> Schedule</h4>
                        <div className="appt-detail-grid">
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Meeting Date</span>
                                <span className="appt-detail-value">
                                    {appointment.meeting_date
                                        ? new Date(appointment.meeting_date + 'T00:00:00')
                                            .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                                        : '—'}
                                </span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Time</span>
                                <span className="appt-detail-value">{appointment.from || '—'} – {appointment.to || '—'}</span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Timezone</span>
                                <span className="appt-detail-value">{appointment.timezone || '—'}</span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Appointment Type</span>
                                <span className="appt-detail-value appt-type-pill">{typeName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Doctor Info */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-user-md" /> Doctor</h4>
                        <div className="appt-detail-doctor-row">
                            <div className="appt-detail-avatar">{doctorName.charAt(0).toUpperCase()}</div>
                            <span className="appt-detail-doctor-name">{doctorName}</span>
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-user" /> Patient Details</h4>
                        <div className="appt-detail-grid">
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Name</span>
                                <span className="appt-detail-value">{patient.name || '—'}</span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Email</span>
                                <span className="appt-detail-value">{patient.email || '—'}</span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Phone</span>
                                <span className="appt-detail-value">{patient.phone || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                        <div className="appt-detail-section">
                            <h4><i className="fas fa-sticky-note" /> Notes</h4>
                            <p className="appt-detail-notes">{appointment.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="appt-detail-footer">
                    <button className="btn-cancel" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailModal;
