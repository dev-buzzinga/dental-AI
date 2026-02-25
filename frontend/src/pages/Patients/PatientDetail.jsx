import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import AddAppointmentModal from '../../components/Patients/AddAppointmentModal';
import PatientModal from '../../components/Patients/PatientModal';
import './Patients.css';

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [patient, setPatient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const showToast = useToast();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        if (user && id) {
            fetchPatientData();
        }
    }, []);

    const fetchPatientData = async () => {
        try {
            setLoading(true);
            // Fetch Patient Info
            const { data: pData, error: pError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();
            if (pError) throw pError;
            setPatient(pData);

            const { data: aData, error: aError } = await supabase
                .from('patients_appointment_history')
                .select(`
                    *,
                    doctors:doctor_id (name)
                `)
                .eq('patient_id', id)
                .order('date', { ascending: false });

            if (aError && aError.code !== 'PGRST116') { // Handle "no rows" differently if needed
                // Check if table exists error? 
                console.error(aError);
            }
            setAppointments(aData || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/patients');
    };

    const handleEditPatient = () => {
        setIsPatientModalOpen(true);
    };

    const handleSavePatientDetails = async (formData) => {
        try {
            const { error } = await supabase
                .from('patients')
                .update({ ...formData })
                .eq('id', id);

            if (error) throw error;
            showToast("Patient updated successfully!", "success");
            setIsPatientModalOpen(false);
            fetchPatientData(); // Refresh page data
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleEditAppointment = (app) => {
        setEditingAppointment(app);
        setIsModalOpen(true);
    };

    const handleSaveAppointment = async (appointmentData) => {
        try {
            if (appointmentData.id) {
                // Update existing
                const { error } = await supabase
                    .from('patients_appointment_history')
                    .update({
                        doctor_id: appointmentData.doctor_id,
                        purpose: appointmentData.purpose,
                        date: appointmentData.date,
                        status: appointmentData.status
                    })
                    .eq('id', appointmentData.id);
                if (error) throw error;
                showToast("Appointment updated successfully", "success");
            } else {
                // Insert new
                const { error } = await supabase
                    .from('patients_appointment_history')
                    .insert([{ ...appointmentData, patient_id: id }]);

                if (error) throw error;
                showToast("Appointment added successfully", "success");
            }
            setEditingAppointment(null);
            fetchPatientData(); // Refresh list
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAppointments = appointments.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(appointments.length / itemsPerPage);

    const formatDateBlock = (dateStr) => {
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const monthName = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        return { dayName, dayNum, monthName };
    };

    const getBannerDates = () => {
        if (!appointments || appointments.length === 0) return { lastVisit: 'No history', nextVisit: 'None' };

        const now = new Date();
        const pastAppointments = appointments
            .filter(a => new Date(a.date) < now)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const futureAppointments = appointments
            .filter(a => new Date(a.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const formatDate = (dateStr) => {
            if (!dateStr) return '—';
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        return {
            lastVisit: pastAppointments.length > 0 ? formatDate(pastAppointments[0].date) : 'New Patient',
            nextVisit: futureAppointments.length > 0 ? formatDate(futureAppointments[0].date) : 'Not scheduled'
        };
    };

    const { lastVisit, nextVisit } = getBannerDates();

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <p>Loading patient details...</p>
            </div>
        );
    }

    if (!patient) return <div style={{ padding: '2rem' }}>Patient not found</div>;

    return (
        <div className="patient-detail custom-scrollbar">
            <button className="patient-detail-back" onClick={handleBack}>
                <i className="fas fa-arrow-left" /> Back to Patients
            </button>

            <div className="patient-detail-banner">
                <div className="banner-main">
                    <div className="patient-detail-avatar">{patient.name.charAt(0)}</div>
                    <div>
                        <div className="patient-detail-name">{patient.name}</div>
                        <div className="patient-type-tag">Patient</div>
                    </div>
                </div>

                <div className="banner-info-grid">
                    <div className="banner-section">
                        <div className="banner-label">Phone</div>
                        <div className="banner-value">{patient.phone}</div>
                    </div>
                    <div className="banner-section">
                        <div className="banner-label">Email</div>
                        <div className="banner-value">{patient.email}</div>
                    </div>
                    <div className="banner-section">
                        <div className="banner-label">Next Appointment</div>
                        <div className="banner-value">{nextVisit}</div>
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn-outline"><i className="fas fa-phone" /> Call</button>
                    <button className="btn-outline"><i className="fas fa-message" /> SMS</button>
                    <button className="btn-outline" onClick={handleEditPatient}>
                        <i className="fas fa-edit" /> Edit
                    </button>
                    <button className="btn-primary" onClick={() => { setEditingAppointment(null); setIsModalOpen(true); }}>
                        <i className="fas fa-plus" /> Add Appointment
                    </button>
                </div>
            </div>

            <div className="patient-detail-grid">
                {/* Appointment History - Left Side (1.8fr) */}
                <div className="patient-info-card">
                    <div className="patient-info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div className="patient-info-card-title" style={{ marginBottom: 0 }}>
                            <i className="fas fa-calendar-check" /> Appointment History
                        </div>
                    </div>

                    <div className="appointment-list-modern">
                        {currentAppointments.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                                No appointments found.
                            </p>
                        ) : (
                            <>
                                {currentAppointments.map((app) => {
                                    const { dayName, dayNum, monthName } = formatDateBlock(app.date);
                                    return (
                                        <div key={app.id} className="appointment-item-card">
                                            <div className="appointment-date-block">
                                                <span className="appt-day-name">{dayName}</span>
                                                <span className="appt-day-num">{dayNum}</span>
                                                <span className="appt-month-name">{monthName}</span>
                                            </div>
                                            <div className="appointment-info-main">
                                                <div className="appointment-purpose">{app.purpose}</div>
                                                <div className="appointment-doctor-tag">
                                                    <div className="doctor-initial-circle">
                                                        {app.doctors?.name?.charAt(0) || 'D'}
                                                    </div>
                                                    Dr. {app.doctors?.name || 'Unknown'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span className={`status-pill status-${app.status?.toLowerCase().replace(' ', '-')}`}>
                                                    {app.status}
                                                </span>
                                                <button
                                                    className="appt-edit-btn"
                                                    onClick={() => handleEditAppointment(app)}
                                                    title="Edit Appointment"
                                                >
                                                    <i className="fas fa-edit" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {totalPages > 1 && (
                                    <div className="pagination-controls">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <i className="fas fa-chevron-left" />
                                        </button>
                                        <span className="pagination-info">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <i className="fas fa-chevron-right" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Patient Summary - Right Side (1fr) */}
                <div className="patient-info-card">
                    <div className="patient-info-card-title">
                        <i className="fas fa-user" /> Patient Summary
                    </div>
                    {[
                        ['DOB', patient.dob],
                        ['Gender', patient.gender],
                        ['Insurance', patient.insurance || '—'],
                        ['Member ID', patient.member_id || '—'],
                    ].map(([label, val]) => (
                        <div key={label} className="patient-info-row">
                            <span className="patient-info-label">{label}</span>
                            <span className="patient-info-value" style={{ color: label === 'Outstanding Balance' ? '#ef4444' : 'inherit' }}>
                                {val}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <AddAppointmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingAppointment(null); }}
                onSave={handleSaveAppointment}
                patientId={id}
                userId={user.id}
                appointment={editingAppointment}
            />

            <PatientModal
                isOpen={isPatientModalOpen}
                onClose={() => setIsPatientModalOpen(false)}
                onSave={handleSavePatientDetails}
                patient={patient}
            />
        </div>
    );
};

export default PatientDetail;
