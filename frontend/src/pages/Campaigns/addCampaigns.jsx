import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../../components/Campaigns/Stepper';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import Table from '../../components/common/Table';
import '../../styles/addCampaigns.css';

const AddCampaignsPage = () => {
    const navigate = useNavigate();
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
        timezone: 'America/Chicago',
        daysSchedule: {
            monday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { enabled: true, slots: [{ start: '09:00', end: '05:00' }] },
            wednesday: { enabled: true, slots: [{ start: '09:00', end: '05:00' }] },
            thursday: { enabled: true, slots: [{ start: '09:00', end: '05:00' }] },
            friday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
            sunday: { enabled: false, slots: [{ start: '09:00', end: '17:00' }] },
        },

        // Step 3: AI Call Configuration
        callAttemptLimit: 3,
        callScript: '',

        // Step 4: Add Patients
        patientSearch: '',
        selectedPatients: [],
        patientPage: 1,
        patientPageSize: 5,
    });

    const [expandedSections, setExpandedSections] = useState({
        general: true,
        schedule: true,
        ai: true,
        patients: true
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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
        { id: 'teeth-whitening', name: 'Teeth Whitening' },
        { id: 'checkup', name: 'Regular Checkup' },
        { id: 'cleaning', name: 'Dental Cleaning' }
    ];

    const doctorOptions = [
        { id: 1, name: 'Select Doctor(s)' },
        { id: 2, name: 'Dr. Smith' },
        { id: 3, name: 'Dr. Johnson' }
    ];

    const timezoneOptions = [
        { id: 'America/Chicago', name: 'America/Chicago' },
        { id: 'UTC', name: 'UTC' },
        { id: 'EST', name: 'Eastern Time (EST)' }
    ];

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Mock patient data
    const mockPatients = [
        { id: 1, name: 'Ben', phone: '+61421671766', email: 'ben@gmail.com' },
        { id: 2, name: 'Liam n', phone: '+61421671766', email: 'liam@gmail.com' },
        { id: 3, name: 'Mark', phone: '+61421671766', email: 'mark@gmail.com' },
        { id: 4, name: 'sdf', phone: '+13232323232', email: 'sdf@gmail.com' },
        { id: 5, name: 'cxcx', phone: '+11222222222', email: 'k@k.com' }
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

    const handleNext = () => {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const handlePrevious = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleCancel = () => {
        navigate('/campaigns');
    };

    const handleDraft = () => {
        console.log('Save as draft:', formData);
        navigate('/campaigns');
    };

    // Step 1: General Information
    const renderStep1 = () => (
        <div className="add-campaign-card">
            <div className="card-header">
                <i className="fas fa-book-open" />
                <span>General Information</span>
            </div>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Campaign Name</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Teeth Whitening Campaign"
                        value={formData.campaignName}
                        onChange={(e) => updateFormData('campaignName', e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Status</label>
                    <SearchableDropdown
                        placeholder="Select Status"
                        options={statusOptions}
                        value={formData.status}
                        onChange={(opt) => updateFormData('status', opt?.id || '')}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Appointment Type</label>
                    <SearchableDropdown
                        placeholder="Select Appointment Type"
                        options={appointmentTypeOptions}
                        value={formData.appointmentType}
                        onChange={(opt) => updateFormData('appointmentType', opt?.id || '')}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Select Doctor(s)</label>
                    <SearchableDropdown
                        placeholder="Select Doctor(s)"
                        options={doctorOptions}
                        value={formData.selectedDoctors[0]} // Simplification for now
                        onChange={(opt) => updateFormData('selectedDoctors', [opt?.id])}
                    />
                </div>
            </div>
        </div>
    );

    // Step 2: Schedule Details
    const renderStep2 = () => (
        <div className="add-campaign-card">
            <div className="card-header">
                <i className="far fa-clock" />
                <span>Schedule Details</span>
            </div>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <div className="input-with-icon">
                        <input
                            type="date"
                            className="form-input"
                            value={formData.startDate}
                            onChange={(e) => updateFormData('startDate', e.target.value)}
                        />
                        <i className="far fa-calendar-alt" />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <div className="input-with-icon">
                        <input
                            type="date"
                            className="form-input"
                            value={formData.endDate}
                            onChange={(e) => updateFormData('endDate', e.target.value)}
                        />
                        <i className="far fa-calendar-alt" />
                    </div>
                </div>

                <div className="form-group full-width">
                    <label className="form-label">Select Timezone *</label>
                    <SearchableDropdown
                        placeholder="Select Timezone"
                        options={timezoneOptions}
                        value={formData.timezone}
                        onChange={(opt) => updateFormData('timezone', opt?.id || 'America/Chicago')}
                    />
                </div>
            </div>

            <div className="days-section">
                <h4 className="section-subtitle">Days and Time</h4>
                {dayNames.map(day => {
                    const dayData = formData.daysSchedule[day];
                    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);

                    return (
                        <div key={day} className="day-row-minimal">
                            <div className="day-toggle-wrapper">
                                <button
                                    className={`toggle-btn-small ${dayData.enabled ? 'on' : 'off'}`}
                                    onClick={() => updateDaysSchedule(day, 'enabled', !dayData.enabled)}
                                >
                                    <span className="toggle-slider"></span>
                                </button>
                                <span className="day-name">{capitalizedDay}</span>
                            </div>

                            {dayData.enabled ? (
                                <div className="time-slots-minimal">
                                    {dayData.slots.map((slot, index) => (
                                        <div key={index} className="time-slot-row">
                                            <div className="time-input-wrapper">
                                                <input
                                                    type="text"
                                                    className="time-input-small"
                                                    value={slot.start + ' AM'}
                                                    readOnly
                                                />
                                                <i className="far fa-clock" />
                                            </div>
                                            <span className="time-separator-small">to</span>
                                            <div className="time-input-wrapper">
                                                <input
                                                    type="text"
                                                    className="time-input-small"
                                                    value={slot.end + ' PM'}
                                                    readOnly
                                                />
                                                <i className="far fa-clock" />
                                            </div>
                                            <button className="add-btn-small" onClick={() => addTimeSlot(day)}>+</button>
                                            {dayData.slots.length > 1 && (
                                                <button className="remove-btn-small" onClick={() => removeTimeSlot(day, index)}>-</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="day-status-no">No</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Step 3: AI Call Configuration
    const renderStep3 = () => (
        <div className="add-campaign-card">
            <div className="card-header">
                <i className="fas fa-phone-alt" />
                <span>AI Call Configuration</span>
            </div>

            <div className="form-group mb-24">
                <label className="form-label">AI Call Attempt Limit *</label>
                <input
                    type="number"
                    className="form-input"
                    value={formData.callAttemptLimit}
                    onChange={(e) => updateFormData('callAttemptLimit', parseInt(e.target.value) || 1)}
                />
                <p className="helper-text-small">Set the number of times the AI is allowed to call the patient</p>
            </div>

            <div className="form-group">
                <label className="form-label">AI Call Script *</label>
                <div className="textarea-wrapper">
                    <textarea
                        className="form-textarea-large"
                        placeholder="E.g. Lorem ipsum dolor sit amet consectetur. Quis ac sed eget ut viverra. Eiusmod egestas felis."
                        value={formData.callScript}
                        onChange={(e) => updateFormData('callScript', e.target.value)}
                    />
                    <span className="char-count-minimal">{formData.callScript.length}/10000</span>
                </div>
                <p className="helper-text-small">This will be used as a context by the AI when contacting patients as part of the campaign.</p>
            </div>
        </div>
    );

    const patientColumns = [
        { key: 'checked', label: '', width: '48px' },
        { key: 'index', label: 'S.no', width: '60px' },
        { key: 'name', label: 'Patient' },
        { key: 'contact', label: 'Contact' }
    ];

    const renderPatientCell = (column, rowData, index) => {
        if (column.key === 'checked') {
            return (
                <input
                    type="checkbox"
                    checked={formData.selectedPatients.includes(rowData.id)}
                    onChange={() => togglePatientSelection(rowData.id)}
                />
            );
        }
        if (column.key === 'index') {
            return index + 1;
        }
        if (column.key === 'contact') {
            return (
                <div className="contact-cell">
                    <span className="phone">{rowData.phone}</span>
                    <span className="email">{rowData.email}</span>
                </div>
            );
        }
        return rowData[column.key];
    };

    // Step 4: Add Patients
    const renderStep4 = () => (
        <div className="add-campaign-card no-padding">
            <div className="px-14 py-4 flex justify-between items-center">
                <h3 className="text-18 font-bold">Add Patients</h3>
                <div className="search-input-mini">
                    <i className="fas fa-search" />
                    <input
                        type="text"
                        placeholder="Search Patient"
                        value={formData.patientSearch}
                        onChange={(e) => updateFormData('patientSearch', e.target.value)}
                    />
                </div>
            </div>

            <div className="patients-table-minimal">
                <Table
                    columns={patientColumns}
                    data={mockPatients}
                    renderCell={renderPatientCell}
                    pagination={{
                        enabled: true,
                        currentPage: formData.patientPage,
                        totalPages: 2,
                        totalItems: 10,
                        pageSize: formData.patientPageSize,
                        onPageChange: (page) => updateFormData('patientPage', page)
                    }}
                />
            </div>
        </div>
    );

    // Step 5: Confirmation (Review Step)
    const renderStep5 = () => (
        <div className="confirmation-review-container">
            {/* General Information Section */}
            <div className={`review-section-box ${expandedSections.general ? 'expanded' : ''}`}>
                <div className="review-section-header" onClick={() => toggleSection('general')}>
                    <div className="header-left">
                        <i className="fas fa-book-open" />
                        <span>General Information</span>
                    </div>
                    <i className={`fas fa-chevron-${expandedSections.general ? 'up' : 'down'} toggle-icon`} />
                </div>
                {expandedSections.general && (
                    <div className="review-section-content">
                        <div className="review-grid">
                            <div className="review-item">
                                <label>Campaign Name</label>
                                <span>{formData.campaignName || 'Teeth Whitening Campaign'}</span>
                            </div>
                            <div className="review-item">
                                <label>Status</label>
                                <span>{statusOptions.find(o => o.id === formData.status)?.name || 'Scheduled'}</span>
                            </div>
                            <div className="review-item">
                                <label>Appointment Type</label>
                                <span>{appointmentTypeOptions.find(o => o.id === formData.appointmentType)?.name || 'cleaning'}</span>
                            </div>
                            <div className="review-item">
                                <label>Selected Doctor(s)</label>
                                <span>{doctorOptions.find(o => o.id === formData.selectedDoctors[0])?.name || 'rama'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Schedule Details Section */}
            <div className={`review-section-box ${expandedSections.schedule ? 'expanded' : ''}`}>
                <div className="review-section-header" onClick={() => toggleSection('schedule')}>
                    <div className="header-left">
                        <i className="far fa-clock" />
                        <span>Schedule Details</span>
                    </div>
                    <i className={`fas fa-chevron-${expandedSections.schedule ? 'up' : 'down'} toggle-icon`} />
                </div>
                {expandedSections.schedule && (
                    <div className="review-section-content">
                        <div className="review-grid three-cols">
                            <div className="review-item">
                                <label>Start Date</label>
                                <span>{formData.startDate || '11/12/2027'}</span>
                            </div>
                            <div className="review-item">
                                <label>End Date</label>
                                <span>{formData.endDate || '11/13/2028'}</span>
                            </div>
                            <div className="review-item">
                                <label>Timezone</label>
                                <span>{formData.timezone || 'America/Chicago'}</span>
                            </div>
                        </div>
                        <div className="review-days-section">
                            <h4 className="review-subtitle">Days and Time</h4>
                            {dayNames.map(day => {
                                const dayData = formData.daysSchedule[day];
                                return (
                                    <div key={day} className="review-day-row">
                                        <div className="review-day-left">
                                            <div className={`review-toggle-mini ${dayData.enabled ? 'on' : 'off'}`}></div>
                                            <span className="review-day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                                        </div>
                                        <div className="review-day-right">
                                            {dayData.enabled ? (
                                                <div className="review-time-list">
                                                    {dayData.slots.map((slot, i) => (
                                                        <span key={i}>{slot.start} to {slot.end}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="review-day-no">No</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Call Configuration Section */}
            <div className={`review-section-box ${expandedSections.ai ? 'expanded' : ''}`}>
                <div className="review-section-header" onClick={() => toggleSection('ai')}>
                    <div className="header-left">
                        <i className="fas fa-phone-alt" />
                        <span>AI Call Configuration</span>
                    </div>
                    <i className={`fas fa-chevron-${expandedSections.ai ? 'up' : 'down'} toggle-icon`} />
                </div>
                {expandedSections.ai && (
                    <div className="review-section-content">
                        <div className="review-item mb-20">
                            <label>AI Call Attempt Limit</label>
                            <p className="review-helper-text">Set the number of times the AI is allowed to call the patient</p>
                            <span className="font-semibold">{formData.callAttemptLimit || '1'}</span>
                        </div>
                        <div className="review-item">
                            <label>AI Call Script</label>
                            <p className="review-helper-text">This script will be used by the AI when contacting patients as part of the campaign.</p>
                            <div className="review-script-text">
                                {formData.callScript || 'The outbound call is part of a teeth whitening promotion campaign for a dental clinic...'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Patients Section */}
            <div className={`review-section-box ${expandedSections.patients ? 'expanded' : ''}`}>
                <div className="review-section-header" onClick={() => toggleSection('patients')}>
                    <div className="header-left">
                        <i className="fas fa-users" />
                        <span>Add Patients</span>
                    </div>
                    <i className={`fas fa-chevron-${expandedSections.patients ? 'up' : 'down'} toggle-icon`} />
                </div>
                {expandedSections.patients && (
                    <div className="review-section-content no-padding">
                        <Table
                            columns={[
                                { key: 'name', label: 'Name' },
                                { key: 'phone', label: 'Phone' },
                                { key: 'email', label: 'Email' }
                            ]}
                            data={mockPatients.slice(0, 1)}
                            striped={false}
                            hoverable={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="practice-details-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="add-type-back-link"
                            style={{ marginBottom: 0, padding: '8px 0' }}
                            onClick={() => navigate('/campaigns')}
                            type="button"
                        >
                            <i className="fas fa-arrow-left" />
                        </button>
                        <h2 className="settings-title">Add Campaign</h2>
                    </div>
                    {/* Optional: Add a Draft button here if desired, otherwise leave empty to match consistency */}
                </div>
            </div>

            <div className="add-campaign-container" style={{ marginTop: '24px' }}>
                <Stepper currentStep={currentStep} steps={steps} />

                <div className="step-content">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                </div>

                <div className="step-actions-footer">
                    <button className="btn-action-outline" onClick={handleCancel}>Cancel</button>
                    {currentStep === 1 && (
                        <button className="btn-action-outline" onClick={handleDraft}>Draft</button>
                    )}
                    {currentStep > 1 && (
                        <button className="btn-action-outline" onClick={handlePrevious}>Previous</button>
                    )}
                    <button className="btn-action-primary" onClick={handleNext}>
                        {currentStep === 5 ? 'Create Campaign' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCampaignsPage;
