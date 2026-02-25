import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useToast } from '../../components/Toast/Toast';
import TimeOffModal from '../../components/Doctors/TimeOffModal';

const DoctorDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [isEditingAvail, setIsEditingAvail] = useState(false);
    const [tempAvail, setTempAvail] = useState({});
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        if (id) {
            fetchDoctorDetails();
        }
    }, [id]);

    const fetchDoctorDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('doctors')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setDoctor(data);
            setTempAvail(data.weekly_availability || {});
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        const minutesStr = minutes === 0 ? ':00' : `:${minutes.toString().padStart(2, '0')}`;
        return `${hour12}${minutesStr} ${ampm}`;
    };

    const handleBack = () => {
        navigate('/settings/doctors');
    };

    const handleAvailChange = (day, field, value) => {
        setTempAvail(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const handleSaveAvail = async () => {
        setSaveLoading(true);
        try {
            const { error } = await supabase
                .from('doctors')
                .update({ weekly_availability: tempAvail })
                .eq('id', id);

            if (error) throw error;

            setDoctor({ ...doctor, weekly_availability: tempAvail });
            setIsEditingAvail(false);
            showToast("Availability updated successfully", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleSaveTimeOff = async (offDays) => {
        setSaveLoading(true);
        try {
            const { error } = await supabase
                .from('doctors')
                .update({ off_days: offDays })
                .eq('id', id);

            if (error) throw error;

            setDoctor({ ...doctor, off_days: offDays });
            showToast("Time off updated successfully", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setSaveLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <p>Loading doctor details...</p>
            </div>
        );
    }

    if (!doctor) return <div style={{ padding: '2rem' }}>Doctor not found</div>;

    return (
        <div className="doctor-detail custom-scrollbar">
            <div className="doctor-detail-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button className="patient-detail-back" onClick={handleBack} style={{ margin: 0, padding: '8px' }}>
                    <i className="fas fa-arrow-left" />
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>About Doctor</h2>
            </div>

            <div className="doctor-detail-banner">
                <div className="doctor-detail-avatar" style={{ background: doctor.image_url ? 'transparent' : 'var(--primary)', overflow: 'hidden' }}>
                    {doctor.image_url ? (
                        <img src={doctor.image_url} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        doctor.name.charAt(0)
                    )}
                </div>

                <div className="doctor-detail-info-group">
                    <div className="doctor-detail-column">
                        <div className="doctor-detail-name">{doctor.name}</div>
                        <div className="doctor-detail-specialty">{doctor.specialty}</div>
                    </div>

                    <div className="doctor-detail-column">
                        <span className="column-label">PHONE</span>
                        <span className="column-value">{doctor.phone}</span>
                    </div>

                    <div className="doctor-detail-column">
                        <span className="column-label">EMAIL</span>
                        <span className="column-value">{doctor.email}</span>
                    </div>
                </div>

                <span className="doctor-detail-badge">{doctor.type}</span>
            </div>

            <div className="doctor-detail-grid">
                <div className="doctor-info-card">
                    <div className="doctor-info-card-title">About Us</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {doctor.about || "No biography available."}
                    </p>
                </div>

                <div className="doctor-info-card">
                    <div className="doctor-info-card-title">Assigned Services</div>
                    {doctor.services && doctor.services.length > 0 ? (
                        <div className="services-pills">
                            {doctor.services.map((service, index) => (
                                <span key={index} className="service-pill">{service}</span>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No services assigned.</p>
                    )}
                </div>

                <div className="doctor-info-card">
                    <div className="doctor-info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="doctor-info-card-title" style={{ marginBottom: 0 }}>Weekly Availability</div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button
                                style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setIsTimeOffModalOpen(true)}
                            >
                                <i className="fas fa-calendar-alt" />
                                Add Time Off
                            </button>
                            {!isEditingAvail ? (
                                <button style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsEditingAvail(true)}>
                                    <i className="fas fa-edit" />
                                    Edit Availability
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => { setIsEditingAvail(false); setTempAvail(doctor.weekly_availability); }}>
                                        Cancel
                                    </button>
                                    <button style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={handleSaveAvail} disabled={saveLoading}>
                                        {saveLoading ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isEditingAvail ? (
                        <div className="availability-grid">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                                const dayAvail = doctor.weekly_availability?.[day];
                                return (
                                    <div key={day} className="availability-day">
                                        <div className="availability-day-label">{day}</div>
                                        <div className="availability-day-time">
                                            {dayAvail?.enabled ? `${formatTime(dayAvail.start)} – ${formatTime(dayAvail.end)}` : 'Off'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="availability-editor-inline custom-scrollbar" style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="avail-editor-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '4px 0' }}>
                                    <label className="day-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input
                                            type="checkbox"
                                            checked={tempAvail[day]?.enabled}
                                            onChange={(e) => handleAvailChange(day, 'enabled', e.target.checked)}
                                        />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{day}</span>
                                    </label>

                                    {tempAvail[day]?.enabled ? (
                                        <div className="time-range-picker" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <input
                                                type="time"
                                                className="time-input"
                                                style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', fontSize: 12 }}
                                                value={tempAvail[day].start}
                                                onChange={(e) => handleAvailChange(day, 'start', e.target.value)}
                                            />
                                            <span style={{ color: '#9CA3AF' }}>-</span>
                                            <input
                                                type="time"
                                                className="time-input"
                                                style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', fontSize: 12 }}
                                                value={tempAvail[day].end}
                                                onChange={(e) => handleAvailChange(day, 'end', e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <span className="status-off" style={{ fontSize: 12, color: '#9CA3AF' }}>Off</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <TimeOffModal
                isOpen={isTimeOffModalOpen}
                onClose={() => setIsTimeOffModalOpen(false)}
                onSave={handleSaveTimeOff}
                initialOffDays={doctor.off_days}
            />
        </div>
    );
};

export default DoctorDetails;
