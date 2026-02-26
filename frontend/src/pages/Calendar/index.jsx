import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import NewAppointmentModal from '../../components/Calendar/NewAppointmentModal';
import CalendarGrid from '../../components/Calendar/CalendarGrid';
import AppointmentDetailModal from '../../components/Calendar/AppointmentDetailModal';
import '../../styles/Calendar.css';

const DOCTOR_COLORS = [
    '#6f2ac3', '#2563EB', '#059669', '#D97706', '#DC2626',
    '#7C3AED', '#0891B2', '#BE185D', '#4F46E5', '#15803D',
];

const CalendarPage = () => {
    const { user } = useContext(AuthContext);
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailAppt, setDetailAppt] = useState(null);
    const showToast = useToast();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Sequential calls to avoid race conditions/API failure
            const apptsRes = await supabase
                .from('doctors_appointments')
                .select('*')
                .eq('user_id', user.id)
                .order('meeting_date', { ascending: false });
            if (apptsRes.error) throw apptsRes.error;
            setAppointments(apptsRes.data || []);

            const doctorsRes = await supabase
                .from('doctors')
                .select('id, name')
                .eq('user_id', user.id);
            if (doctorsRes.error) throw doctorsRes.error;
            const docList = doctorsRes.data || [];
            setDoctors(docList);
            // Select all doctors by default
            setSelectedDoctors(new Set(docList.map(d => d.id)));

            const typesRes = await supabase
                .from('appointment_types')
                .select('id, name')
                .eq('user_id', user.id);
            if (typesRes.error) throw typesRes.error;
            setAppointmentTypes(typesRes.data || []);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Lookup maps
    const doctorMap = useMemo(() => {
        const map = {};
        doctors.forEach(d => { map[d.id] = d.name; });
        return map;
    }, [doctors]);

    const typeMap = useMemo(() => {
        const map = {};
        appointmentTypes.forEach(t => { map[t.id] = t.name; });
        return map;
    }, [appointmentTypes]);

    // Filtered appointments by selected doctors
    const filteredAppointments = useMemo(() => {
        if (selectedDoctors.size === 0) return [];
        return appointments.filter(a => selectedDoctors.has(a.doctor_id));
    }, [appointments, selectedDoctors]);

    // Doctor toggle handlers
    const toggleDoctor = (doctorId) => {
        setSelectedDoctors(prev => {
            const next = new Set(prev);
            if (next.has(doctorId)) next.delete(doctorId);
            else next.add(doctorId);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedDoctors.size === doctors.length) {
            setSelectedDoctors(new Set());
        } else {
            setSelectedDoctors(new Set(doctors.map(d => d.id)));
        }
    };

    const handleSaveAppointment = async (payload) => {
        try {
            const { error } = await supabase
                .from('doctors_appointments')
                .insert([payload]);

            if (error) throw error;
            showToast("Appointment created successfully!", "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    const getDoctorColor = (idx) => DOCTOR_COLORS[idx % DOCTOR_COLORS.length];

    return (
        <div className="calendar-page">
            {/* Header */}
            <div className="calendar-header">
                <div className="calendar-header-left">
                    <h2 className="calendar-title">Calendar</h2>
                    <span className="patients-badge">{filteredAppointments.length} appointments</span>
                </div>
                <div className="patients-header-actions">
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <i className="fas fa-plus" /> New Appointment
                    </button>
                </div>
            </div>

            {/* Main Content: Sidebar + Calendar */}
            <div className="calendar-body">
                {/* Doctor Sidebar */}
                <div className="calendar-sidebar custom-scrollbar">
                    <div className="sidebar-section-title">
                        <i className="fas fa-user-md" /> Doctors
                    </div>

                    {/* All toggle */}
                    <label className="doctor-filter-item doctor-filter-all">
                        <input
                            type="checkbox"
                            checked={selectedDoctors.size === doctors.length && doctors.length > 0}
                            onChange={toggleAll}
                        />
                        <span className="doctor-filter-check"></span>
                        <span className="doctor-filter-name">All Doctors</span>
                    </label>

                    <div className="doctor-filter-divider"></div>

                    {/* Individual doctors */}
                    {doctors.map((doc, idx) => (
                        <label key={doc.id} className="doctor-filter-item">
                            <input
                                type="checkbox"
                                checked={selectedDoctors.has(doc.id)}
                                onChange={() => toggleDoctor(doc.id)}
                            />
                            <span
                                className="doctor-filter-check"
                                style={{ '--check-color': getDoctorColor(idx) }}
                            ></span>
                            <div className="doctor-filter-avatar" style={{ background: getDoctorColor(idx) }}>
                                {doc.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="doctor-filter-name">{doc.name}</span>
                        </label>
                    ))}

                    {doctors.length === 0 && !loading && (
                        <div className="doctor-filter-empty">
                            <i className="fas fa-info-circle" />
                            <span>No doctors found</span>
                        </div>
                    )}
                </div>

                {/* Calendar Grid */}
                <div className="calendar-main">
                    {loading ? (
                        <div className="calendar-loading">
                            <i className="fas fa-spinner fa-spin" />
                            <p>Loading calendar...</p>
                        </div>
                    ) : (
                        <CalendarGrid
                            appointments={filteredAppointments}
                            doctorMap={doctorMap}
                            onAppointmentClick={(appt) => setDetailAppt(appt)}
                        />
                    )}
                </div>
            </div>

            {/* New Appointment Modal */}
            <NewAppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveAppointment}
                userId={user?.id}
            />

            {/* Appointment Detail Modal */}
            <AppointmentDetailModal
                isOpen={!!detailAppt}
                onClose={() => setDetailAppt(null)}
                appointment={detailAppt}
                doctorMap={doctorMap}
                typeMap={typeMap}
            />
        </div>
    );
};

export default CalendarPage;
