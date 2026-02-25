import "./calenderModel.css"
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
                        Appointment Detail
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Body */}
                <div className="appt-detail-body custom-scrollbar">
                    {/* Schedule Section */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-clock" /> Schedule Information</h4>
                        <div className="appt-detail-grid">
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Meeting Date</span>
                                <span className="appt-detail-value">
                                    {appointment.meeting_date
                                        ? new Date(appointment.meeting_date + 'T00:00:00')
                                            .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                        : '—'}
                                </span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Time & Slot</span>
                                <span className="appt-detail-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                    {appointment.from || '—'} – {appointment.to || '—'}
                                </span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Appointment Type</span>
                                <span className="appt-detail-value">
                                    <span className="appt-type-pill" style={{ display: 'inline-block', marginTop: '4px' }}>
                                        {typeName}
                                    </span>
                                </span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Timezone</span>
                                <span className="appt-detail-value">{appointment.timezone || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Doctor Section */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-user-md" /> Assigned Doctor</h4>
                        <div className="appt-detail-doctor-row">
                            <div className="appt-detail-avatar">
                                <i className="fas fa-user-doctor" style={{ fontSize: '1.2rem' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="appt-detail-doctor-name">{doctorName}</span>
                                {/* <span style={{ fontSize: '12px', color: '#64748B' }}>{doctorSpeciality}</span> */}
                            </div>
                        </div>
                    </div>

                    {/* Patient Section */}
                    <div className="appt-detail-section">
                        <h4><i className="fas fa-hospital-user" /> Patient Information</h4>
                        <div className="appt-detail-grid">
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Patient Name</span>
                                <span className="appt-detail-value">{patient.name || '—'}</span>
                            </div>
                            <div className="appt-detail-item">
                                <span className="appt-detail-label">Contact Number</span>
                                <span className="appt-detail-value">{patient.phone || '—'}</span>
                            </div>
                            <div className="appt-detail-item" style={{ gridColumn: 'span 2' }}>
                                <span className="appt-detail-label">Email Address</span>
                                <span className="appt-detail-value">{patient.email || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    {appointment.notes && (
                        <div className="appt-detail-section" style={{ marginBottom: 0 }}>
                            <h4><i className="fas fa-notes-medical" /> Clinical Notes</h4>
                            <div className="appt-detail-notes">
                                {appointment.notes}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="appt-detail-footer">
                    <button className="btn-save" onClick={onClose} style={{ padding: '8px 24px' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailModal;
