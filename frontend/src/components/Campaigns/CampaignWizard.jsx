import React, { useState } from 'react';
import Stepper from './Stepper';
import SearchableDropdown from '../common/SearchableDropdown';
import './CampaignWizard.css';

const CampaignWizard = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: General Information
        campaignName: '',
        status: '',
        appointmentType: '',
        selectedDoctors: [],
        
        // Step 2: Schedule Details
        startDate: '',
        endDate: '',
        timezone: 'UTC',
        daysSchedule: {
            monday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            wednesday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            thursday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            friday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
        },
        
        // Step 3: AI Call Configuration
        callAttemptLimit: 1,
        callScript: '',
        
        // Step 4: Add Patients
        patientSearch: '',
        selectedPatients: [],
        patientPage: 1,
        patientPageSize: 5,
    });
    const [expandedSections, setExpandedSections] = useState({
        generalInfo: true,
        scheduleDetails: true,
        aiConfig: true,
        patients: true
    });

    const steps = [
        { label: 'General Info' },
        { label: 'Schedule Details' },
        { label: 'AI Script' },
        { label: 'Add Patients' },
        { label: 'Confirmation' }
    ];

    const statusOptions = [
        { id: 'active', name: 'Active' },
        { id: 'inactive', name: 'Inactive' },
        { id: 'draft', name: 'Draft' }
    ];

    const appointmentTypeOptions = [
        { id: 'checkup', name: 'Regular Checkup' },
        { id: 'cleaning', name: 'Dental Cleaning' },
        { id: 'consultation', name: 'Consultation' },
        { id: 'followup', name: 'Follow-up' },
        { id: 'emergency', name: 'Emergency' }
    ];

    const doctorOptions = [
        { id: 1, name: 'Dr. Smith' },
        { id: 2, name: 'Dr. Johnson' },
        { id: 3, name: 'Dr. Williams' },
        { id: 4, name: 'Dr. Brown' }
    ];

    const timezoneOptions = [
        { id: 'UTC', name: 'UTC' },
        { id: 'EST', name: 'Eastern Time (EST)' },
        { id: 'CST', name: 'Central Time (CST)' },
        { id: 'MST', name: 'Mountain Time (MST)' },
        { id: 'PST', name: 'Pacific Time (PST)' }
    ];

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Mock patient data
    const mockPatients = [
        { id: 1, name: 'John Doe', phone: '+1 555-0101', email: 'john.doe@email.com' },
        { id: 2, name: 'Jane Smith', phone: '+1 555-0102', email: 'jane.smith@email.com' },
        { id: 3, name: 'Robert Johnson', phone: '+1 555-0103', email: 'robert.j@email.com' },
        { id: 4, name: 'Emily Davis', phone: '+1 555-0104', email: 'emily.davis@email.com' },
        { id: 5, name: 'Michael Wilson', phone: '+1 555-0105', email: 'm.wilson@email.com' },
        { id: 6, name: 'Sarah Brown', phone: '+1 555-0106', email: 'sarah.brown@email.com' },
        { id: 7, name: 'David Miller', phone: '+1 555-0107', email: 'david.miller@email.com' },
        { id: 8, name: 'Lisa Anderson', phone: '+1 555-0108', email: 'lisa.a@email.com' },
        { id: 9, name: 'James Taylor', phone: '+1 555-0109', email: 'james.taylor@email.com' },
        { id: 10, name: 'Maria Garcia', phone: '+1 555-0110', email: 'maria.g@email.com' }
    ];

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateDaysSchedule = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            daysSchedule: {
                ...prev.daysSchedule,
                [day]: { ...prev.daysSchedule[day], [field]: value }
            }
        }));
    };

    const addTimeSlot = (day) => {
        setFormData(prev => ({
            ...prev,
            daysSchedule: {
                ...prev.daysSchedule,
                [day]: {
                    ...prev.daysSchedule[day],
                    slots: [...prev.daysSchedule[day].slots, { start: '09:00', end: '17:00' }]
                }
            }
        }));
    };

    const removeTimeSlot = (day, slotIndex) => {
        setFormData(prev => ({
            ...prev,
            daysSchedule: {
                ...prev.daysSchedule,
                [day]: {
                    ...prev.daysSchedule[day],
                    slots: prev.daysSchedule[day].slots.filter((_, i) => i !== slotIndex)
                }
            }
        }));
    };

    const updateTimeSlot = (day, slotIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            daysSchedule: {
                ...prev.daysSchedule,
                [day]: {
                    ...prev.daysSchedule[day],
                    slots: prev.daysSchedule[day].slots.map((slot, i) =>
                        i === slotIndex ? { ...slot, [field]: value } : slot
                    )
                }
            }
        }));
    };

    const togglePatientSelection = (patientId) => {
        setFormData(prev => ({
            ...prev,
            selectedPatients: prev.selectedPatients.includes(patientId)
                ? prev.selectedPatients.filter(id => id !== patientId)
                : [...prev.selectedPatients, patientId]
        }));
    };

    const toggleAllPatients = (filteredPatients) => {
        const allSelected = filteredPatients.every(p => formData.selectedPatients.includes(p.id));
        if (allSelected) {
            setFormData(prev => ({
                ...prev,
                selectedPatients: prev.selectedPatients.filter(id => !filteredPatients.find(p => p.id === id))
            }));
        } else {
            const newSelections = filteredPatients.map(p => p.id).filter(id => !formData.selectedPatients.includes(id));
            setFormData(prev => ({
                ...prev,
                selectedPatients: [...prev.selectedPatients, ...newSelections]
            }));
        }
    };

    const toggleDoctorSelection = (doctorId) => {
        setFormData(prev => ({
            ...prev,
            selectedDoctors: prev.selectedDoctors.includes(doctorId)
                ? prev.selectedDoctors.filter(id => id !== doctorId)
                : [...prev.selectedDoctors, doctorId]
        }));
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleNext = () => {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const handlePrevious = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleCancel = () => {
        onClose();
    };

    const handleDraft = () => {
        console.log('Save as draft:', formData);
        onClose();
    };

    const handleUpdate = () => {
        console.log('Update campaign:', formData);
        onClose();
    };

    // Filter patients based on search
    const filteredPatients = mockPatients.filter(patient =>
        patient.name.toLowerCase().includes(formData.patientSearch.toLowerCase()) ||
        patient.phone.toLowerCase().includes(formData.patientSearch.toLowerCase()) ||
        patient.email.toLowerCase().includes(formData.patientSearch.toLowerCase())
    );

    // Pagination for patients
    const patientStart = (formData.patientPage - 1) * formData.patientPageSize;
    const patientEnd = Math.min(patientStart + formData.patientPageSize, filteredPatients.length);
    const paginatedPatients = filteredPatients.slice(patientStart, patientEnd);
    const totalPatientPages = Math.ceil(filteredPatients.length / formData.patientPageSize);

    // Step 1: General Information
    const renderStep1 = () => (
        <div className="wizard-step-content">
            <h3 className="step-title">General Information</h3>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Campaign Name <span className="required">*</span></label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter campaign name"
                        value={formData.campaignName}
                        onChange={(e) => updateFormData('campaignName', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Status <span className="required">*</span></label>
                    <SearchableDropdown
                        placeholder="Select status"
                        options={statusOptions}
                        value={formData.status}
                        onChange={(opt) => updateFormData('status', opt?.id || '')}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Appointment Type <span className="required">*</span></label>
                    <SearchableDropdown
                        placeholder="Select appointment type"
                        options={appointmentTypeOptions}
                        value={formData.appointmentType}
                        onChange={(opt) => updateFormData('appointmentType', opt?.id || '')}
                    />
                </div>

                <div className="form-group full-width">
                    <label className="form-label">Select Doctors <span className="required">*</span></label>
                    <div className="multi-select-container">
                        {doctorOptions.map(doctor => (
                            <label key={doctor.id} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={formData.selectedDoctors.includes(doctor.id)}
                                    onChange={() => toggleDoctorSelection(doctor.id)}
                                />
                                <span className="checkmark"></span>
                                <span className="checkbox-label">{doctor.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Step 2: Schedule Details
    const renderStep2 = () => (
        <div className="wizard-step-content">
            <h3 className="step-title">Schedule Details</h3>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Start Date <span className="required">*</span></label>
                    <input
                        type="date"
                        className="form-input"
                        value={formData.startDate}
                        onChange={(e) => updateFormData('startDate', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">End Date <span className="required">*</span></label>
                    <input
                        type="date"
                        className="form-input"
                        value={formData.endDate}
                        onChange={(e) => updateFormData('endDate', e.target.value)}
                    />
                </div>

                <div className="form-group full-width">
                    <label className="form-label">Timezone <span className="required">*</span></label>
                    <SearchableDropdown
                        placeholder="Select timezone"
                        options={timezoneOptions}
                        value={formData.timezone}
                        onChange={(opt) => updateFormData('timezone', opt?.id || 'UTC')}
                    />
                </div>
            </div>

            <div className="days-section">
                <h4 className="section-subtitle">Days and Time</h4>
                {dayNames.map(day => {
                    const dayData = formData.daysSchedule[day];
                    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
                    
                    return (
                        <div key={day} className={`day-row ${dayData.enabled ? 'enabled' : ''}`}>
                            <div className="day-header">
                                <div className="day-toggle-wrapper">
                                    <span className="day-name">{capitalizedDay}</span>
                                    <button
                                        className={`toggle-btn ${dayData.enabled ? 'on' : 'off'}`}
                                        onClick={() => updateDaysSchedule(day, 'enabled', !dayData.enabled)}
                                    >
                                        <span className="toggle-slider"></span>
                                    </button>
                                </div>
                                {!dayData.enabled && <span className="day-status">No</span>}
                            </div>
                            
                            {dayData.enabled && (
                                <div className="time-slots">
                                    {dayData.slots.map((slot, index) => (
                                        <div key={index} className="time-slot-row">
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={slot.start}
                                                onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                                            />
                                            <span className="time-separator">to</span>
                                            <input
                                                type="time"
                                                className="time-input"
                                                value={slot.end}
                                                onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                                            />
                                            {dayData.slots.length > 1 && (
                                                <button
                                                    className="remove-slot-btn"
                                                    onClick={() => removeTimeSlot(day, index)}
                                                >
                                                    <i className="fas fa-minus-circle" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        className="add-slot-btn"
                                        onClick={() => addTimeSlot(day)}
                                    >
                                        <i className="fas fa-plus" /> Add Time Slot
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Step 3: AI Call Configuration
    const renderStep3 = () => (
        <div className="wizard-step-content">
            <h3 className="step-title">AI Call Configuration</h3>
            
            <div className="form-group">
                <label className="form-label">AI Call Attempt Limit</label>
                <input
                    type="number"
                    className="form-input number-input"
                    min="1"
                    max="10"
                    value={formData.callAttemptLimit}
                    onChange={(e) => updateFormData('callAttemptLimit', parseInt(e.target.value) || 1)}
                />
                <p className="helper-text">Set the number of times the AI is allowed to call the patient</p>
            </div>

            <div className="form-group">
                <label className="form-label">AI Call Script</label>
                <div className="textarea-wrapper">
                    <textarea
                        className="form-textarea"
                        rows="10"
                        maxLength="10000"
                        placeholder="Enter the script for AI calls..."
                        value={formData.callScript}
                        onChange={(e) => updateFormData('callScript', e.target.value)}
                    />
                    <span className="char-count">{formData.callScript.length}/10000</span>
                </div>
                <p className="helper-text">This will be used as context by the AI when contacting patients as part of the campaign.</p>
            </div>
        </div>
    );

    // Step 4: Add Patients
    const renderStep4 = () => (
        <div className="wizard-step-content">
            <h3 className="step-title">Add Patients</h3>
            
            <div className="search-wrapper">
                <div className="search-input-container">
                    <i className="fas fa-search search-icon" />
                    <input
                        type="text"
                        className="form-input search-patient"
                        placeholder="Search patients..."
                        value={formData.patientSearch}
                        onChange={(e) => updateFormData('patientSearch', e.target.value)}
                    />
                </div>
            </div>

            <div className="patients-table-container">
                <table className="patients-table">
                    <thead>
                        <tr>
                            <th className="checkbox-col">
                                <label className="checkbox-header">
                                    <input
                                        type="checkbox"
                                        checked={paginatedPatients.length > 0 && paginatedPatients.every(p => formData.selectedPatients.includes(p.id))}
                                        onChange={() => toggleAllPatients(paginatedPatients)}
                                    />
                                    <span className="checkmark"></span>
                                </label>
                            </th>
                            <th>S. No.</th>
                            <th>Patient Name</th>
                            <th>Contact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPatients.map((patient, index) => (
                            <tr key={patient.id}>
                                <td className="checkbox-col">
                                    <label className="checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedPatients.includes(patient.id)}
                                            onChange={() => togglePatientSelection(patient.id)}
                                        />
                                        <span className="checkmark"></span>
                                    </label>
                                </td>
                                <td>{patientStart + index + 1}</td>
                                <td>{patient.name}</td>
                                <td>
                                    <div className="contact-info">
                                        <span>{patient.phone}</span>
                                        <span className="email">{patient.email}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="pagination-controls">
                <div className="rows-per-page">
                    <span>Rows per page:</span>
                    <SearchableDropdown
                        options={[
                            { id: 5, name: '5' },
                            { id: 10, name: '10' },
                            { id: 20, name: '20' }
                        ]}
                        value={formData.patientPageSize}
                        onChange={(opt) => {
                            updateFormData('patientPageSize', opt?.id || 5);
                            updateFormData('patientPage', 1);
                        }}
                        displayValue={(opt) => opt.name}
                    />
                </div>
                <div className="pagination-info">
                    <span>{patientStart + 1}-{patientEnd} of {filteredPatients.length}</span>
                    <button
                        className="pagination-arrow"
                        disabled={formData.patientPage === 1}
                        onClick={() => updateFormData('patientPage', formData.patientPage - 1)}
                    >
                        <i className="fas fa-chevron-left" />
                    </button>
                    <button
                        className="pagination-arrow"
                        disabled={formData.patientPage >= totalPatientPages}
                        onClick={() => updateFormData('patientPage', formData.patientPage + 1)}
                    >
                        <i className="fas fa-chevron-right" />
                    </button>
                </div>
            </div>
        </div>
    );

    // Step 5: Confirmation
    const renderStep5 = () => {
        const selectedDoctorsList = doctorOptions.filter(d => formData.selectedDoctors.includes(d.id));
        const selectedPatientsList = mockPatients.filter(p => formData.selectedPatients.includes(p.id));

        return (
            <div className="wizard-step-content confirmation-step">
                <h3 className="step-title">Confirmation</h3>
                <p className="confirmation-subtitle">Review your campaign details before saving</p>

                {/* Section 1: General Information */}
                <div className="confirmation-section">
                    <button className="section-header" onClick={() => toggleSection('generalInfo')}>
                        <span>General Information</span>
                        <i className={`fas fa-chevron-${expandedSections.generalInfo ? 'up' : 'down'}`} />
                    </button>
                    {expandedSections.generalInfo && (
                        <div className="section-content">
                            <div className="info-row">
                                <span className="info-label">Campaign Name:</span>
                                <span className="info-value">{formData.campaignName || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Status:</span>
                                <span className="info-value">{statusOptions.find(s => s.id === formData.status)?.name || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Appointment Type:</span>
                                <span className="info-value">{appointmentTypeOptions.find(a => a.id === formData.appointmentType)?.name || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Selected Doctors:</span>
                                <span className="info-value">
                                    {selectedDoctorsList.length > 0 
                                        ? selectedDoctorsList.map(d => d.name).join(', ')
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 2: Schedule Details */}
                <div className="confirmation-section">
                    <button className="section-header" onClick={() => toggleSection('scheduleDetails')}>
                        <span>Schedule Details</span>
                        <i className={`fas fa-chevron-${expandedSections.scheduleDetails ? 'up' : 'down'}`} />
                    </button>
                    {expandedSections.scheduleDetails && (
                        <div className="section-content">
                            <div className="info-row">
                                <span className="info-label">Start Date:</span>
                                <span className="info-value">{formData.startDate || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">End Date:</span>
                                <span className="info-value">{formData.endDate || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Timezone:</span>
                                <span className="info-value">{formData.timezone}</span>
                            </div>
                            <div className="info-row days-row">
                                <span className="info-label">Days Schedule:</span>
                                <div className="days-list">
                                    {dayNames.map(day => {
                                        const dayData = formData.daysSchedule[day];
                                        const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
                                        return (
                                            <div key={day} className="day-schedule-item">
                                                <span className="day-name-conf">{capitalizedDay}:</span>
                                                {dayData.enabled ? (
                                                    <span className="day-times">
                                                        {dayData.slots.map((slot, i) => (
                                                            <span key={i} className="time-range">
                                                                {slot.start} to {slot.end}
                                                                {i < dayData.slots.length - 1 && ', '}
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : (
                                                    <span className="day-disabled">Disabled</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: AI Call Configuration */}
                <div className="confirmation-section">
                    <button className="section-header" onClick={() => toggleSection('aiConfig')}>
                        <span>AI Call Configuration</span>
                        <i className={`fas fa-chevron-${expandedSections.aiConfig ? 'up' : 'down'}`} />
                    </button>
                    {expandedSections.aiConfig && (
                        <div className="section-content">
                            <div className="info-row">
                                <span className="info-label">Call Attempt Limit:</span>
                                <span className="info-value">{formData.callAttemptLimit}</span>
                            </div>
                            <div className="info-row script-row">
                                <span className="info-label">Call Script:</span>
                                <div className="script-box">
                                    {formData.callScript || 'No script provided'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 4: Add Patients */}
                <div className="confirmation-section">
                    <button className="section-header" onClick={() => toggleSection('patients')}>
                        <span>Add Patients ({selectedPatientsList.length} selected)</span>
                        <i className={`fas fa-chevron-${expandedSections.patients ? 'up' : 'down'}`} />
                    </button>
                    {expandedSections.patients && (
                        <div className="section-content">
                            {selectedPatientsList.length > 0 ? (
                                <table className="confirmation-patients-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPatientsList.map(patient => (
                                            <tr key={patient.id}>
                                                <td>{patient.name}</td>
                                                <td>{patient.phone}</td>
                                                <td>{patient.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="no-patients">No patients selected</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return renderStep1();
        }
    };

    const getStepActions = () => {
        switch (currentStep) {
            case 1:
                return (
                    <>
                        <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                        <button className="btn-draft" onClick={handleDraft}>Draft</button>
                        <button className="btn-next" onClick={handleNext}>Next</button>
                    </>
                );
            case 2:
            case 3:
            case 4:
                return (
                    <>
                        <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                        <button className="btn-previous" onClick={handlePrevious}>Previous</button>
                        <button className="btn-next" onClick={handleNext}>Next</button>
                    </>
                );
            case 5:
                return (
                    <>
                        <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                        <button className="btn-previous" onClick={handlePrevious}>Previous</button>
                        <button className="btn-update" onClick={handleUpdate}>Update</button>
                    </>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="campaign-wizard-overlay">
            <div className="campaign-wizard-modal">
                <div className="wizard-header">
                    <h2>Create New Campaign</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times" />
                    </button>
                </div>
                
                <Stepper currentStep={currentStep} steps={steps} />
                
                <div className="wizard-content">
                    {renderCurrentStep()}
                </div>
                
                <div className="wizard-actions">
                    {getStepActions()}
                </div>
            </div>
        </div>
    );
};

export default CampaignWizard;
