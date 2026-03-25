import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../config/supabase';
import { AuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast/Toast';
import '../../../styles/Settings.css';

const AddType = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const { user } = useContext(AuthContext);
    const showToast = useToast();

    const [formData, setFormData] = useState({
        name: '',
        duration: '',
    });
    const [isFetching, setIsFetching] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    const durationAsNumber = useMemo(() => {
        if (formData.duration === '') return NaN;
        return parseInt(formData.duration, 10);
    }, [formData.duration]);

    useEffect(() => {
        const fetchType = async () => {
            if (!user || !isEdit) return;

            try {
                setIsFetching(true);
                const { data, error } = await supabase
                    .from('appointment_types')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;

                setFormData({
                    name: data?.name || '',
                    duration: data?.duration?.toString() || '',
                });
            } catch (error) {
                showToast(error.message, 'error');
                navigate('/settings/appointment-types');
            } finally {
                setIsFetching(false);
            }
        };

        fetchType();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, id, isEdit, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        const durationValue = parseInt(formData.duration, 10);
        if (Number.isNaN(durationValue)) {
            showToast('Please enter a valid duration', 'error');
            return;
        }

        try {
            setIsSaving(true);

            const payload = {
                name: formData.name,
                duration: durationValue,
            };

            if (isEdit) {
                const { error } = await supabase
                    .from('appointment_types')
                    .update(payload)
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                showToast('Appointment type updated successfully!', 'success');
            } else {
                const { error } = await supabase
                    .from('appointment_types')
                    .insert({ ...payload, user_id: user.id });

                if (error) throw error;
                showToast('Appointment type added successfully!', 'success');
            }

            navigate('/settings/appointment-types');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isEdit && isFetching) {
        return (
            <div className="settings-page custom-scrollbar">
                <div className="settings-header">
                    <div>
                        <h2 className="settings-title">Edit Appointment Type</h2>
                        <p className="settings-subtitle">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="practice-details-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="add-type-back-link"
                            style={{ marginBottom: 0, padding: '8px 0' }}
                            onClick={() => navigate('/settings/appointment-types')}
                            type="button"
                        >
                            <i className="fas fa-chevron-left" />
                        </button>
                        <h2 className="settings-title">
                            {isEdit ? 'Edit Appointment Type' : 'Add Appointment Type'}
                        </h2>
                    </div>
                </div>
            </div>

            <div className="settings-page-content">
                <div className="add-type-card">
                    <form id="appointment-type-form" onSubmit={handleSubmit}>
                        <div className="add-type-form-group">
                            <label className="add-type-label">Appointment Type</label>
                            <div className="add-type-input-wrapper">
                                <i className="far fa-bookmark" />
                                <input
                                    className="add-type-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Name"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="add-type-form-group">
                            <label className="add-type-label">Duration (in minutes)</label>
                            <p className="add-type-helper-text">Add duration, how long will the appointment type will take time (in Mins)</p>
                            <div className="add-type-input-wrapper" style={{ marginTop: '12px' }}>
                                <i className="far fa-clock" />
                                <input
                                    className="add-type-input"
                                    name="duration"
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                                    placeholder="60"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {formData.duration !== '' && Number.isNaN(durationAsNumber) && (
                            <div style={{ marginTop: -10, marginBottom: 15, color: 'var(--danger)', fontSize: 13 }}>
                                Please enter a valid duration
                            </div>
                        )}

                        <div className="add-type-actions">
                            <button
                                type="button"
                                className="btn-cancel-caps"
                                onClick={() => navigate('/settings/appointment-types')}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="appointment-type-form"
                                className="btn-save-caps"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    'Saving...'
                                ) : (
                                    <>
                                        <i className="fas fa-plus" /> {isEdit ? 'Update' : 'Create'} Appointment Type
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddType;