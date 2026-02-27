import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import '../../styles/Settings.css';

const PRACTICE_TYPE_OPTIONS = [
    { id: "surgeon", name: "Surgeon" },
    { id: "intern", name: "Intern" },
    { id: "cosmetic_surgery", name: "Cosmetic Surgery" },
    { id: "orthodontist", name: "Orthodontist" },
    { id: "endodist", name: "Endodist" },
    { id: "pediatric_dentistry", name: "Pediatric Dentistry" },
    { id: "general_dentistry", name: "General Dentistry" },
    { id: "other", name: "Other" },
];

const COUNTRY_OPTIONS = [
    { id: 'US', name: 'United States' },
    { id: 'GB', name: 'United Kingdom' },
    { id: 'canada', name: 'Canada' },
    { id: 'new_zealand', name: 'New Zealand' },
    { id: 'australia', name: 'Australia' },
];

const TIMEZONE_OPTIONS = [
    { id: "America/New_York", name: "Eastern Time (ET)" },
    { id: "America/Chicago", name: "Central Time (CT)" },
    { id: "America/Denver", name: "Mountain Time (MT)" },
    { id: "America/Los_Angeles", name: "Pacific Time (PT)" },
    { id: "America/Anchorage", name: "Alaska Time (AKT)" },
    { id: "Pacific/Honolulu", name: "Hawaii Time (HT)" },
    { id: "America/Phoenix", name: "Arizona (MST)" },
    { id: "America/Puerto_Rico", name: "Atlantic Time (AT)" },
    { id: "UTC", name: "UTC" },
    { id: "Europe/London", name: "GMT (London)" },
    { id: "Europe/Paris", name: "CET (Paris)" },
    { id: "Asia/Kolkata", name: "IST (India)" },
    { id: "Asia/Dubai", name: "GST (Dubai)" },
    { id: "Asia/Tokyo", name: "JST (Tokyo)" },
    { id: "Australia/Sydney", name: "AEST (Sydney)" },
];



const initialFormState = {
    general_information: {
        practice_name: '',
        practice_type: [],
    },
    address: {
        address: '',
        country: '',
        time_zone: '',
        state: '',
        city: '',
        zip: '',
    },
    contact_information: {
        phone: '',
        email: '',
        website: '',
        review_link: '',
        organization_name: '',
        NPI: '',
    },
};

const PracticeDetails = () => {
    const { user } = useContext(AuthContext);
    const showToast = useToast();

    const [formData, setFormData] = useState(initialFormState);
    const [originalData, setOriginalData] = useState(initialFormState);
    const [recordId, setRecordId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

    useEffect(() => {
        if (user) {
            console.log("user=>", user);
            fetchPracticeDetails();
        }
    }, []);

    const fetchPracticeDetails = async () => {
        try {
            setLoading(true);
            setError('');

            const { data, error: fetchError } = await supabase
                .from('practice_details')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (fetchError) {
                // If no row exists yet, Supabase may return an error; we treat that as "no data"
                if (fetchError.code === 'PGRST116' || fetchError.message?.includes('0 rows')) {
                    setFormData(initialFormState);
                    setRecordId(null);
                    return;
                }
                console.error('Error fetching practice details:', fetchError);
                setError(fetchError.message);
                return;
            }

            if (data) {
                setRecordId(data.id);
                const fetchedData = {
                    general_information: data.general_information || initialFormState.general_information,
                    address: data.address || initialFormState.address,
                    contact_information: data.contact_information || initialFormState.contact_information,
                };
                setFormData(fetchedData);
                setOriginalData(fetchedData);
            }
        } catch (err) {
            console.error('Unexpected error fetching practice details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneralChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            general_information: {
                ...prev.general_information,
                [field]: value,
            },
        }));
    };

    const handleAddressChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value,
            },
        }));
    };

    const handleContactChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            contact_information: {
                ...prev.contact_information,
                [field]: value,
            },
        }));
    };

    const togglePracticeType = (typeId) => {
        setFormData((prev) => {
            const current = prev.general_information.practice_type || [];
            const exists = current.includes(typeId);
            const next = exists ? current.filter((id) => id !== typeId) : [...current, typeId];
            return {
                ...prev,
                general_information: {
                    ...prev.general_information,
                    practice_type: next,
                },
            };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');

            const payload = {
                // user_id: user.id, auto insert by supabase
                general_information: formData.general_information,
                address: formData.address,
                contact_information: formData.contact_information,
            };

            if (recordId) {
                const { data, error: updateError } = await supabase
                    .from('practice_details')
                    .update(payload)
                    .eq('id', recordId)
                    .select()
                    .single();

                if (updateError) throw updateError;

                const updatedData = {
                    general_information: data.general_information || initialFormState.general_information,
                    address: data.address || initialFormState.address,
                    contact_information: data.contact_information || initialFormState.contact_information,
                };
                setFormData(updatedData);
                setOriginalData(updatedData);
                showToast('Practice details updated successfully', 'success');
            } else {
                const { data, error: insertError } = await supabase
                    .from('practice_details')
                    .insert(payload)
                    .select()
                    .single();

                if (insertError) throw insertError;

                setRecordId(data.id);
                const newData = {
                    general_information: data.general_information || initialFormState.general_information,
                    address: data.address || initialFormState.address,
                    contact_information: data.contact_information || initialFormState.contact_information,
                };
                setFormData(newData);
                setOriginalData(newData);
                showToast('Practice details saved successfully', 'success');
            }
        } catch (err) {
            console.error('Error saving practice details:', err);
            setError(err.message);
            showToast(err.message || 'Failed to save practice details', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="practice-details-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div>
                        <h2 className="settings-title">Practice Details</h2>
                    </div>
                    {!loading && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                        >
                            {saving ? (
                                <>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-save" style={{ marginRight: 8 }} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                    <p>Loading practice details...</p>
                </div>
            ) : (
                <>
                    {error && (
                        <div
                            style={{
                                marginBottom: 16,
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: '#FEF2F2',
                                color: '#B91C1C',
                                fontSize: 13,
                            }}
                        >
                            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
                            {error}
                        </div>
                    )}

                    <div className="practice-details-layout">
                        {/* General Information */}
                        <div className="practice-card">
                            <div className="practice-card-header">
                                <h3 className="practice-card-title">
                                    <i className="fas fa-briefcase-medical" /> General Information
                                </h3>
                            </div>
                            <div className="practice-card-body">
                                <div className="practice-form-grid">
                                    <div className="practice-form-group full-width">
                                        <label className="practice-label">
                                            Practice Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.general_information.practice_name}
                                            onChange={(e) => handleGeneralChange('practice_name', e.target.value)}
                                            placeholder="Enter practice name"
                                        />
                                    </div>

                                    <div className="practice-form-group full-width">
                                        <label className="practice-label">
                                            Practice Type
                                        </label>
                                        <div className="practice-type-pills">
                                            {PRACTICE_TYPE_OPTIONS.map((opt) => {
                                                const selected = formData.general_information.practice_type?.includes(opt.id);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        className={`practice-type-pill ${selected ? 'selected' : ''}`}
                                                        onClick={() => togglePracticeType(opt.id)}
                                                    >
                                                        {opt.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="practice-card">
                            <div className="practice-card-header">
                                <h3 className="practice-card-title">
                                    <i className="fas fa-location-dot" /> Address
                                </h3>
                            </div>
                            <div className="practice-card-body">
                                <div className="practice-form-grid">
                                    <div className="practice-form-group full-width">
                                        <label className="practice-label">Address</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.address.address}
                                            onChange={(e) => handleAddressChange('address', e.target.value)}
                                            placeholder="Street address"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <SearchableDropdown
                                            label="Country"
                                            placeholder="Select country"
                                            options={COUNTRY_OPTIONS}
                                            value={formData.address.country}
                                            onChange={(opt) => handleAddressChange('country', opt.id)}
                                            searchKeys={['name']}
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">State</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.address.state}
                                            onChange={(e) => handleAddressChange('state', e.target.value)}
                                            placeholder="State / Province"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">City</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.address.city}
                                            onChange={(e) => handleAddressChange('city', e.target.value)}
                                            placeholder="City"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <SearchableDropdown
                                            label="Time Zone"
                                            placeholder="Select time zone"
                                            options={TIMEZONE_OPTIONS}
                                            value={formData.address.time_zone}
                                            onChange={(opt) => handleAddressChange('time_zone', opt.id)}
                                            searchKeys={['name']}
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">ZIP / Postal Code</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.address.zip}
                                            onChange={(e) => handleAddressChange('zip', e.target.value)}
                                            placeholder="ZIP / Postal code"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="practice-card">
                            <div className="practice-card-header">
                                <h3 className="practice-card-title">
                                    <i className="fas fa-address-card" /> Contact Information
                                </h3>
                            </div>
                            <div className="practice-card-body">
                                <div className="practice-form-grid">
                                    <div className="practice-form-group">
                                        <label className="practice-label">Phone</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.contact_information.phone}
                                            onChange={(e) => handleContactChange('phone', e.target.value)}
                                            placeholder="Practice phone number"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">Email</label>
                                        <input
                                            type="email"
                                            className="practice-input"
                                            value={formData.contact_information.email}
                                            onChange={(e) => handleContactChange('email', e.target.value)}
                                            placeholder="Practice email address"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">Website</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.contact_information.website}
                                            onChange={(e) => handleContactChange('website', e.target.value)}
                                            placeholder="Website URL"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">Review Link</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.contact_information.review_link}
                                            onChange={(e) => handleContactChange('review_link', e.target.value)}
                                            placeholder="Google / other review URL"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">Organization Name</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.contact_information.organization_name}
                                            onChange={(e) =>
                                                handleContactChange('organization_name', e.target.value)
                                            }
                                            placeholder="Legal organization name"
                                        />
                                    </div>

                                    <div className="practice-form-group">
                                        <label className="practice-label">NPI</label>
                                        <input
                                            type="text"
                                            className="practice-input"
                                            value={formData.contact_information.NPI}
                                            onChange={(e) => handleContactChange('NPI', e.target.value)}
                                            placeholder="National Provider Identifier"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PracticeDetails;

