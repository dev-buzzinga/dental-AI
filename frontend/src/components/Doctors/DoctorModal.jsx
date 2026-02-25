import { useState, useEffect, useRef } from "react";
import "./DoctorModal.css";
import { supabase } from "../../config/supabase";
import TimeOffManager from "./TimeOffManager";

const DoctorModal = ({ isOpen, onClose, onSave, doctor = null }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        type: "Full-Time",
        specialty: "General Dentist",
        about: "",
        image_url: "",
        services: [],
        weekly_availability: {
            Mon: { enabled: true, start: "09:00", end: "17:00" },
            Tue: { enabled: true, start: "09:00", end: "17:00" },
            Wed: { enabled: true, start: "09:00", end: "17:00" },
            Thu: { enabled: true, start: "09:00", end: "17:00" },
            Fri: { enabled: true, start: "09:00", end: "17:00" },
            Sat: { enabled: false, start: "09:00", end: "17:00" },
            Sun: { enabled: false, start: "09:00", end: "17:00" },
        },
        off_days: []
    });

    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);

    const dentalServices = [
        "Fillings", "Crowns", "Bridges", "Root Canal", "Teeth Whitening",
        "Cleaning & Scaling", "Orthodontics", "Implants", "Wisdom Tooth Extraction",
        "Veneers", "Dentures", "Invisalign",
    ];

    useEffect(() => {
        if (doctor) {
            setFormData({
                name: doctor.name || "",
                email: doctor.email || "",
                phone: doctor.phone || "",
                type: doctor.type || "Full-Time",
                specialty: doctor.specialty || "General Dentist",
                about: doctor.about || "",
                image_url: doctor.image_url || "",
                services: doctor.services || [],
                weekly_availability: doctor.weekly_availability || {
                    Mon: { enabled: true, start: "09:00", end: "17:00" },
                    Tue: { enabled: true, start: "09:00", end: "17:00" },
                    Wed: { enabled: true, start: "09:00", end: "17:00" },
                    Thu: { enabled: true, start: "09:00", end: "17:00" },
                    Fri: { enabled: true, start: "09:00", end: "17:00" },
                    Sat: { enabled: false, start: "09:00", end: "17:00" },
                    Sun: { enabled: false, start: "09:00", end: "17:00" },
                },
                off_days: (doctor.off_days || []).map(day => {
                    if (typeof day === "string") {
                        try {
                            return JSON.parse(day);
                        } catch (e) {
                            console.error("Error parsing off_day string:", e);
                            return day;
                        }
                    }
                    return day;
                })
            });
            setImagePreview(doctor.image_url || "");
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                type: "Full-Time",
                specialty: "General Dentist",
                about: "",
                image_url: "",
                services: [],
                weekly_availability: {
                    Mon: { enabled: true, start: "09:00", end: "17:00" },
                    Tue: { enabled: true, start: "09:00", end: "17:00" },
                    Wed: { enabled: true, start: "09:00", end: "17:00" },
                    Thu: { enabled: true, start: "09:00", end: "17:00" },
                    Fri: { enabled: true, start: "09:00", end: "17:00" },
                    Sat: { enabled: false, start: "09:00", end: "17:00" },
                    Sun: { enabled: false, start: "09:00", end: "17:00" },
                },
                off_days: []
            });
            setImagePreview("");
        }
        setStep(1);
        setFieldErrors({});
        setSelectedFile(null);
    }, [doctor, isOpen]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const handleRemoveImage = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
        setImagePreview("");
        setFormData(prev => ({ ...prev, image_url: "" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadImage = async (file) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("User not authenticated");
                return null;
            }

            const fileName = `${user.id}-${Date.now()}`;

            const { data, error } = await supabase.storage
                .from("doctor-images")
                .upload(fileName, file);

            if (error) {
                console.error("Error uploading image:", error);
                return null;
            }

            const { data: publicUrl } = supabase.storage
                .from("doctor-images")
                .getPublicUrl(fileName);

            return publicUrl.publicUrl;
        } catch (err) {
            console.error("Upload process error:", err);
            return null;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleServiceToggle = (service) => {
        setFormData(prev => {
            const services = prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service];
            return { ...prev, services };
        });
        if (fieldErrors.services) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.services;
                return newErrors;
            });
        }
    };

    const handleAvailChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            weekly_availability: {
                ...prev.weekly_availability,
                [day]: { ...prev.weekly_availability[day], [field]: value }
            }
        }));
        if (fieldErrors.availability) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.availability;
                return newErrors;
            });
        }
    };

    const validateStep = () => {
        const errors = {};
        if (step === 1) {
            if (!formData.name.trim()) errors.name = "Doctor name is required";
            if (!formData.email.trim()) errors.email = "Email is required";
            if (!formData.phone.trim()) errors.phone = "Phone is required";
            if (!formData.specialty) errors.specialty = "Specialty is required";
            if (!formData.type) errors.type = "Type is required";
            if (!formData.about.trim()) errors.about = "About Us is required";
        }
        if (step === 2) {
            if (formData.services.length === 0) errors.services = "Please select at least one service";
        }
        if (step === 3) {
            const hasEnabledDay = Object.values(formData.weekly_availability).some(day => day.enabled);
            if (!hasEnabledDay) errors.availability = "Please enable at least one working day";
        }
        if (step === 4) {
            formData.off_days.forEach((day, index) => {
                if (!day.name.trim() || !day.from || !day.to) {
                    errors.off_days = "Please fill in all fields for all off days";
                }
            });
        }
        return errors;
    };

    const handleNext = () => {
        const errors = validateStep();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        const errors = validateStep();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setLoading(true);
        try {
            let finalImageUrl = formData.image_url;

            if (selectedFile) {
                const uploadedUrl = await uploadImage(selectedFile);
                if (uploadedUrl) {
                    finalImageUrl = uploadedUrl;
                }
            }

            const finalData = { ...formData, image_url: finalImageUrl };
            await onSave(finalData);
            onClose();
        } catch (error) {
            console.error("Error saving doctor:", error);
        } finally {
            setLoading(false);
        }
    };

    const stepLabels = ['Doctor Info', 'Assigned Service', 'Working Hours', 'Off Days'];

    return (
        <div className="modal-overlay">
            <div className="patient-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{doctor ? "Edit Doctor" : "Add New Doctor"}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="doctor-modal-stepper">
                    {stepLabels.map((label, i) => {
                        const stepNum = i + 1;
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div className={`step-circle ${stepNum < step ? 'step-circle-done' : stepNum === step ? 'step-circle-active' : 'step-circle-pending'}`}>
                                        {stepNum < step ? <i className="fas fa-check" /> : stepNum}
                                    </div>
                                    <span className={`step-label ${stepNum < step ? 'step-label-done' : stepNum === step ? 'step-label-active' : 'step-label-pending'}`}>
                                        {label.split(' ').map((word, idx) => <span key={idx} style={{ display: 'block', textAlign: 'center' }}>{word}</span>)}
                                    </span>
                                </div>
                                {i < 3 && <div className={`step-line ${step < stepNum + 1 ? '' : 'step-line-done'}`} />}
                            </div>
                        );
                    })}
                </div>

                <div className="modal-body custom-scrollbar" style={{ minHeight: 320 }}>
                    {step === 1 && (
                        <div className="doctor-form" style={{ display: 'block' }}>
                            <div className="doctor-image-upload-container">
                                <div
                                    className="doctor-image-preview-wrapper"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="doctor-image-preview" />
                                            <button className="remove-image-btn" onClick={handleRemoveImage}>&times;</button>
                                        </>
                                    ) : (
                                        <div className="doctor-image-placeholder">
                                            <i className="fas fa-camera" />
                                            <span>Add Photo</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                                <span className="upload-image-label" onClick={() => fileInputRef.current.click()}>
                                    {imagePreview ? "Change Photo" : "Upload Photo"}
                                </span>
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Doctor Name</label>
                                    {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
                                </div>
                                <input name="name" className={fieldErrors.name ? 'error-input' : ''} value={formData.name} onChange={handleChange} placeholder="Full Name" autoComplete="off" />
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Email</label>
                                    {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
                                </div>
                                <input name="email" className={fieldErrors.email ? 'error-input' : ''} value={formData.email} onChange={handleChange} placeholder="doctor@example.com" autoComplete="off" />
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Phone (With Country Code)</label>
                                    {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
                                </div>
                                <input name="phone" className={fieldErrors.phone ? 'error-input' : ''} value={formData.phone} onChange={handleChange} placeholder="+1.." autoComplete="off" />
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>About Us</label>
                                    {fieldErrors.about && <span className="field-error-text">{fieldErrors.about}</span>}
                                </div>
                                <textarea
                                    name="about"
                                    className={fieldErrors.about ? 'error-input' : ''}
                                    value={formData.about}
                                    onChange={handleChange}
                                    placeholder="Brief biography or description..."
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        padding: '10px 14px',
                                        fontSize: '14px',
                                        border: fieldErrors.about ? '1px solid #DC2626' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-btn)',
                                        outline: 'none',
                                        resize: 'vertical',
                                        marginTop: '4px'
                                    }}
                                />
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Specialty</label>
                                    {fieldErrors.specialty && <span className="field-error-text">{fieldErrors.specialty}</span>}
                                </div>
                                <div className="doctor-radio-group" style={{ marginTop: 6 }}>
                                    {["General Dentist", "Oral Surgeon", "Orthodontist", "Periodontist"].map(s => (
                                        <div key={s} className={`doctor-radio-pill ${formData.specialty === s ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, specialty: s })}>
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Type</label>
                                    {fieldErrors.type && <span className="field-error-text">{fieldErrors.type}</span>}
                                </div>
                                <div className="doctor-radio-group" style={{ marginTop: 6, marginBottom: 0 }}>
                                    {["Full-Time", "Part-Time", "Contract"].map(t => (
                                        <div key={t} className={`doctor-radio-pill ${formData.type === t ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, type: t })}>
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="assigned-services-step">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>Assigned Services</h3>
                                {fieldErrors.services && <span className="field-error-text">{fieldErrors.services}</span>}
                            </div>
                            <div className="services-grid">
                                {dentalServices.map(service => (
                                    <label key={service} className="service-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.services.includes(service)}
                                            onChange={() => handleServiceToggle(service)}
                                        />
                                        <span className="service-label">{service}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="availability-editor">
                            <div style={{ padding: '0 12px 12px', textAlign: 'right' }}>
                                {fieldErrors.availability && <span className="field-error-text">{fieldErrors.availability}</span>}
                            </div>
                            {Object.keys(formData.weekly_availability).map(day => (
                                <div key={day} className="avail-editor-row">
                                    <label className="day-toggle">
                                        <input
                                            type="checkbox"
                                            checked={formData.weekly_availability[day].enabled}
                                            onChange={(e) => handleAvailChange(day, 'enabled', e.target.checked)}
                                        />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{day}</span>
                                    </label>

                                    {formData.weekly_availability[day].enabled ? (
                                        <div className="time-range-picker">
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={formData.weekly_availability[day].start}
                                                onChange={(e) => handleAvailChange(day, 'start', e.target.value)}
                                            />
                                            <span style={{ color: '#9CA3AF' }}>-</span>
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={formData.weekly_availability[day].end}
                                                onChange={(e) => handleAvailChange(day, 'end', e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <span className="status-off">Off</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {step === 4 && (
                        <TimeOffManager
                            initialOffDays={formData.off_days}
                            onChange={(updated) => setFormData(prev => ({ ...prev, off_days: updated }))}
                            error={fieldErrors.off_days}
                        />
                    )}
                </div>

                <div className="modal-footer">
                    {step > 1 ? (
                        <button className="btn-cancel" onClick={() => setStep(step - 1)}>Back</button>
                    ) : (
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    )}

                    {step < 4 ? (
                        <button className="btn-save" onClick={handleNext}>Next</button>
                    ) : (
                        <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Saving..." : doctor ? "Update Doctor" : "Add Doctor"}
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
};
export default DoctorModal;
