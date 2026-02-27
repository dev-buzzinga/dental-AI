import { useState, useMemo, useEffect, useContext } from 'react';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { SearchInput } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import AppointmentTypeModal from '../../components/Settings/AppointmentTypeModal';
import '../../styles/Settings.css';
import '../../styles/Patients.css'; // Reusing some table and header styles

const AppointmentTypes = () => {
    const { user } = useContext(AuthContext);
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingType, setEditingType] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        if (user) {
            fetchAppointmentTypes();
        }
    }, []);

    const fetchAppointmentTypes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('appointment_types')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                // If the table doesn't exist yet, we'll get an error.
                // In a real scenario, we'd handle this more gracefully.
                console.error("Error fetching appointment types:", error);
                throw error;
            }
            setAppointmentTypes(data || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveType = async (formData) => {
        try {
            const dataToSave = {
                name: formData.name,
                duration: parseInt(formData.duration, 10)
            };

            if (editingType) {
                const { data, error } = await supabase
                    .from('appointment_types')
                    .update(dataToSave)
                    .eq('id', editingType.id)
                    .select();

                if (error) throw error;
                showToast("Appointment type updated successfully!", "success");
            } else {
                const { error } = await supabase
                    .from('appointment_types')
                    .insert({ ...dataToSave, user_id: user.id });
                if (error) throw error;
                showToast("Appointment type added successfully!", "success");
            }
            setIsModalOpen(false);
            setEditingType(null);
            fetchAppointmentTypes();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleEditType = (type, e) => {
        e.stopPropagation();
        setEditingType(type);
        setIsModalOpen(true);
    };

    const handleDeleteType = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this appointment type?")) return;
        try {
            const { error } = await supabase
                .from('appointment_types')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast("Appointment type deleted successfully", "success");
            fetchAppointmentTypes();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleAddType = () => {
        setEditingType(null);
        setIsModalOpen(true);
    };

    const filteredTypes = useMemo(() =>
        appointmentTypes.filter((t) =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [appointmentTypes, searchTerm]);

    return (
        <div className="patients-page">
            <div className="patients-header">
                <div className="patients-header-left">
                    <h2 className="patients-title">Appointment Types</h2>
                    <span className="patients-badge">{appointmentTypes.length} types</span>
                </div>
                <div className="patients-header-actions">
                    <SearchInput placeholder="Search types..." value={searchTerm} onChange={setSearchTerm} />
                    <button className="btn-primary" onClick={handleAddType}>
                        <i className="fas fa-plus" /> Add Appointment Type
                    </button>
                </div>
            </div>

            <div className="patients-table-container custom-scrollbar">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                        <p>Loading types...</p>
                    </div>
                ) : appointmentTypes.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-calendar-alt" style={{ fontSize: '3rem', color: '#D1D5DB', marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No appointment types found</h3>
                        <p>Add your first appointment type to get started</p>
                    </div>
                ) : (
                    <table className="patients-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Duration (Mins)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTypes.map((t, index) => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{index + 1}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                    </td>
                                    <td>{t.duration} mins</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-outline" onClick={(e) => handleEditType(t, e)} style={{ padding: '6px 12px', fontSize: 13 }}>
                                                <i className="fas fa-edit" />
                                            </button>
                                            <button className="btn-outline" onClick={(e) => handleDeleteType(t.id, e)} style={{ padding: '6px 12px', fontSize: 13 }}>
                                                <i className="fas fa-trash" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <AppointmentTypeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingType(null);
                }}
                onSave={handleSaveType}
                appointmentType={editingType}
            />
        </div>
    );
};

export default AppointmentTypes;
