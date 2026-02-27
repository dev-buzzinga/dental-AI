import { useState, useEffect, useRef } from "react";
import { supabase } from "../../config/supabase";
import appointmentService from "../../service/appointment";
import SearchableDropdown from "../common/SearchableDropdown";
import { useToast } from "../Toast/Toast";
import "./calenderModel.css"

const TIMEZONES = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
    { value: "America/Phoenix", label: "Arizona (MST)" },
    { value: "America/Puerto_Rico", label: "Atlantic Time (AT)" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "GMT (London)" },
    { value: "Europe/Paris", label: "CET (Paris)" },
    { value: "Asia/Kolkata", label: "IST (India)" },
    { value: "Asia/Dubai", label: "GST (Dubai)" },
    { value: "Asia/Tokyo", label: "JST (Tokyo)" },
    { value: "Australia/Sydney", label: "AEST (Sydney)" },
];

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    // Handle 12-hour format: "09:00 AM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let [, h, m, period] = match12;
        h = parseInt(h, 10);
        m = parseInt(m, 10);
        if (period.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period.toUpperCase() === "AM" && h === 12) h = 0;
        return h * 60 + m;
    }

    // Handle 24-hour format: "14:30"
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        return h * 60 + m;
    }

    return 0;
};

const getDayName = (dateStr) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()];
};

// ─── Custom Time Picker Component ────────────────
const TimePicker = ({ value, onChange, label, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const hours = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i).padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
    const periods = ["AM", "PM"];

    // Split value like "09:00 AM" or use defaults
    const [h, mPeriod] = (value || "09:00 AM").split(":");
    const [m, period] = (mPeriod || "00 AM").split(" ");

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (newH, newM, newP) => {
        onChange(`${newH}:${newM} ${newP}`);
    };

    return (
        <div className="custom-tp-container" ref={containerRef}>
            <label className="sd-label">
                {label} {required && <span className="required">*</span>}
            </label>
            <div
                className={`custom-tp-input ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{value || "--:-- --"}</span>
                <i className="far fa-clock" />
            </div>

            {isOpen && (
                <div className="custom-tp-dropdown">
                    <div className="custom-tp-columns">
                        <div className="custom-tp-col custom-scrollbar">
                            {hours.map(hr => (
                                <div
                                    key={hr}
                                    className={`custom-tp-item ${h === hr ? 'selected' : ''}`}
                                    onClick={() => handleSelect(hr, m, period)}
                                >
                                    {hr}
                                </div>
                            ))}
                        </div>
                        <div className="custom-tp-col custom-scrollbar">
                            {minutes.map(min => (
                                <div
                                    key={min}
                                    className={`custom-tp-item ${m === min ? 'selected' : ''}`}
                                    onClick={() => handleSelect(h, min, period)}
                                >
                                    {min}
                                </div>
                            ))}
                        </div>
                        <div className="custom-tp-col">
                            {periods.map(per => (
                                <div
                                    key={per}
                                    className={`custom-tp-item ${period === per ? 'selected' : ''}`}
                                    onClick={() => handleSelect(h, m, per)}
                                >
                                    {per}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const INITIAL_FORM = {
    timezone: "America/New_York",
    meeting_date: "",
    from: "",
    to: "",
    appointment_type_id: "",
    doctor_id: "",
    patient_id: "",
    patient_name: "",
    patient_email: "",
    patient_phone: "",
    notes: "",
};

const NewAppointmentModal = ({ isOpen, onClose, onCreated, userId }) => {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        if (isOpen) {
            setFormData(INITIAL_FORM);
            fetchDropdownData();
        }
    }, [isOpen]);

    const fetchDropdownData = async () => {
        try {
            // Sequential calls to avoid race conditions/API failure
            const doctorsRes = await supabase
                .from("doctors")
                .select("id, name, weekly_availability, off_days")
                .eq('user_id', userId);
            if (doctorsRes.error) throw doctorsRes.error;
            setDoctors(doctorsRes.data || []);

            const patientsRes = await supabase
                .from("patients")
                .select("id, name, email, phone")
                .eq('user_id', userId);
            if (patientsRes.error) throw patientsRes.error;
            setPatients(patientsRes.data || []);

            const typesRes = await supabase
                .from("appointment_types")
                .select("id, name")
                .eq('user_id', userId);
            if (typesRes.error) throw typesRes.error;
            setAppointmentTypes(typesRes.data || []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePatientSelect = (patient) => {
        setFormData((prev) => ({
            ...prev,
            patient_id: patient.id,
            patient_name: patient.name || "",
            patient_email: patient.email || "",
            patient_phone: patient.phone || "",
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const selectedDoctor = doctors.find((d) => String(d.id) === String(formData.doctor_id));
        const selectedPatient = patients.find((p) => String(p.id) === String(formData.patient_id));

        if (!selectedDoctor) {
            showToast("Please select a doctor", "error");
            setLoading(false);
            return;
        }

        // 1. Check Off Days
        const offDays = selectedDoctor.off_days || [];

        const isOffDay = offDays.some(odStr => {
            try {
                const od = JSON.parse(odStr);
                const checkDate = new Date(formData.meeting_date + 'T00:00:00');
                const from = new Date(od.from + 'T00:00:00');
                const to = new Date(od.to + 'T00:00:00');
                return checkDate >= from && checkDate <= to;
            } catch (e) { return false; }
        });

        if (isOffDay) {
            showToast(`Doctor ${selectedDoctor.name} is on leave on this day.`, "error");
            setLoading(false);
            return;
        }

        // 2. Check Weekly Availability
        const dayName = getDayName(formData.meeting_date);
        const avail = selectedDoctor.weekly_availability?.[dayName];
        if (!avail || !avail.enabled) {
            showToast(`Doctor ${selectedDoctor.name} is not available on ${dayName}s.`, "error");
            setLoading(false);
            return;
        }

        const apptFrom = timeToMinutes(formData.from);
        const apptTo = timeToMinutes(formData.to);
        const availStart = timeToMinutes(avail.start);
        const availEnd = timeToMinutes(avail.end);

        // Basic sanity check: end time must be after start time (same day)
        if (apptTo <= apptFrom) {
            showToast("End time must be after start time.", "error");
            setLoading(false);
            return;
        }

        if (apptFrom < availStart || apptTo > availEnd) {
            showToast(`Selected time is outside doctor's working hours (${avail.start} - ${avail.end}).`, "error");
            setLoading(false);
            return;
        }

        // 3. Check for Conflicts (Double Booking)
        const { data: conflicts, error: conflictError } = await supabase
            .from("doctors_appointments")
            .select("id, from, to")
            .eq("doctor_id", selectedDoctor.id)
            .eq("meeting_date", formData.meeting_date);

        if (conflictError) {
            showToast("Error checking for conflicts", "error");
            setLoading(false);
            return;
        }

        const hasConflict = conflicts.some(c => {
            const cFrom = timeToMinutes(c.from);
            const cTo = timeToMinutes(c.to);
            // Overlap check: (start1 < end2) and (start2 < end1)
            return apptFrom < cTo && cFrom < apptTo;
        });

        if (hasConflict) {
            showToast(`Doctor ${selectedDoctor.name} already has an appointment during this time.`, "error");
            setLoading(false);
            return;
        }

        const payload = {
            user_id: userId,
            timezone: formData.timezone,
            meeting_date: formData.meeting_date,
            from: formData.from,
            to: formData.to,
            appointment_type_id: parseInt(formData.appointment_type_id, 10),
            doctor_id: selectedDoctor?.id,
            patient_details: {
                patient_id: selectedPatient?.id,
                name: formData.patient_name,
                email: formData.patient_email,
                phone: formData.patient_phone,
            },
            notes: formData.notes,
        };

        // Small delay before calling backend API
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
            const response = await appointmentService.createAppointment(payload);
            if (response.data?.success) {
                showToast(response.data.message || "Appointment created successfully", "success");
                if (onCreated) {
                    onCreated(response.data.data);
                }
            } else {
                showToast(response.data?.message || "Failed to create appointment", "error");
            }
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to create appointment";
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Render helpers for custom dropdowns
    const renderDoctorOption = (doc) => (
        <>
            <div className="sd-opt-avatar">{doc.name?.charAt(0)?.toUpperCase()}</div>
            <div className="sd-opt-info">
                <div className="sd-opt-name">{doc.name}</div>
            </div>
        </>
    );

    const renderPatientOption = (p) => (
        <>
            <div className="sd-opt-avatar">{p.name?.charAt(0)?.toUpperCase()}</div>
            <div className="sd-opt-info">
                <div className="sd-opt-name">{p.name}</div>
                <div className="sd-opt-detail">
                    {p.email}{p.phone ? ` • ${p.phone}` : ""}
                </div>
            </div>
        </>
    );

    const renderTypeOption = (t) => (
        <div className="sd-opt-info">
            <div className="sd-opt-name">{t.name}</div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="appointment-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>
                        <i className="fas fa-calendar-plus" />
                        New Appointment
                    </h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="modal-body custom-scrollbar">
                        <div className="appt-form-grid">
                            {/* Time Zone */}
                            <div className="appt-form-group full-width" style={{ position: 'relative' }}>
                                <SearchableDropdown
                                    label="Time Zone"
                                    required
                                    placeholder="Search timezone..."
                                    options={TIMEZONES.map(tz => ({ id: tz.value, name: tz.label }))}
                                    value={formData.timezone}
                                    onChange={(tz) => setFormData(prev => ({ ...prev, timezone: tz.id }))}
                                    searchKeys={["name"]}
                                />
                            </div>

                            {/* Meeting Date */}
                            <div className="appt-form-group">
                                <label>Meeting Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    name="meeting_date"
                                    value={formData.meeting_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Appointment Type — Custom Dropdown */}
                            <div className="appt-form-group" style={{ position: 'relative' }}>
                                <SearchableDropdown
                                    label="Appointment Type"
                                    required
                                    placeholder="Search appointment types..."
                                    options={appointmentTypes}
                                    value={formData.appointment_type_id}
                                    onChange={(t) => setFormData((prev) => ({ ...prev, appointment_type_id: t.id }))}
                                    renderOption={renderTypeOption}
                                    searchKeys={["name"]}
                                />
                            </div>

                            {/* From Time */}
                            <TimePicker
                                label="From Time"
                                required
                                value={formData.from}
                                onChange={(val) => setFormData(prev => ({ ...prev, from: val }))}
                            />

                            {/* To Time */}
                            <TimePicker
                                label="To Time"
                                required
                                value={formData.to}
                                onChange={(val) => setFormData(prev => ({ ...prev, to: val }))}
                            />

                            {/* Doctor — Custom Dropdown */}
                            <div className="appt-form-group full-width" style={{ position: 'relative' }}>
                                <SearchableDropdown
                                    label="Select Doctor"
                                    required
                                    placeholder="Search by name..."
                                    options={doctors}
                                    value={formData.doctor_id}
                                    onChange={(d) => setFormData((prev) => ({ ...prev, doctor_id: d.id }))}
                                    renderOption={renderDoctorOption}
                                    searchKeys={["name"]}
                                />
                            </div>

                            {/* Patient Details Section */}
                            <div className="appt-section-divider">
                                <span><i className="fas fa-user" style={{ marginRight: 6 }} />Patient Details</span>
                            </div>

                            {/* Select Patient — Custom Dropdown */}
                            <div className="appt-form-group full-width" style={{ position: 'relative' }}>
                                <SearchableDropdown
                                    label="Search Patient"
                                    required
                                    placeholder="Search by name, email, or phone..."
                                    options={patients}
                                    value={formData.patient_id}
                                    onChange={handlePatientSelect}
                                    renderOption={renderPatientOption}
                                    searchKeys={["name", "email", "phone"]}
                                />
                            </div>

                            {/* Autofilled Patient Info (editable) */}
                            <div className="appt-autofill-row">
                                <div className="appt-form-group">
                                    <label>Name</label>
                                    <input type="text" name="patient_name" value={formData.patient_name} onChange={handleChange} placeholder="Patient name" />
                                </div>
                                <div className="appt-form-group">
                                    <label>Email</label>
                                    <input type="email" name="patient_email" value={formData.patient_email} onChange={handleChange} placeholder="Patient email" />
                                </div>
                                <div className="appt-form-group">
                                    <label>Phone</label>
                                    <input type="tel" name="patient_phone" value={formData.patient_phone} onChange={handleChange} placeholder="Patient phone" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="appt-form-group full-width">
                                <label>Additional Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Enter any additional notes for this appointment..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin" /> Saving...</>
                            ) : (
                                <><i className="fas fa-check" /> Create Appointment</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewAppointmentModal;
