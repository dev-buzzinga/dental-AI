import { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { SearchInput } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import DoctorModal from '../../components/Doctors/DoctorModal';
import './Doctors.css';

const DoctorsPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const showToast = useToast();

    useEffect(() => {
        if (user) {
            fetchDoctors();
        }
    }, []);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('doctors')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDoctors(data || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDoctor = async (formData) => {
        try {
            if (editingDoctor) {
                const { error } = await supabase
                    .from('doctors')
                    .update({ ...formData })
                    .eq('id', editingDoctor.id);
                if (error) throw error;
                showToast("Doctor updated successfully!", "success");
            } else {
                const { error } = await supabase
                    .from('doctors')
                    .insert([{ ...formData, user_id: user.id }]);
                if (error) throw error;
                showToast("Doctor added successfully!", "success");
            }
            fetchDoctors();
            setEditingDoctor(null);
            setIsModalOpen(false);
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteDoctor = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this doctor?")) return;
        try {
            const { error } = await supabase
                .from('doctors')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast("Doctor deleted successfully", "success");
            fetchDoctors();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleEditDoctor = (doctor, e) => {
        e.stopPropagation();
        setEditingDoctor(doctor);
        setIsModalOpen(true);
    };

    const handleAddDoctor = () => {
        setEditingDoctor(null);
        setIsModalOpen(true);
    };

    const filteredDoctors = useMemo(() =>
        doctors.filter((d) =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
        ), [searchTerm, doctors]);



    return (
        <div className="doctors-page">
            <div className="doctors-header">
                <div className="doctors-header-left">
                    <h2 className="doctors-title">Doctors</h2>
                    <span className="patients-badge">{doctors.length} doctors</span>
                </div>
                <div className="patients-header-actions">
                    <SearchInput placeholder="Search doctors..." value={searchTerm} onChange={setSearchTerm} />
                    <button className="btn-primary" onClick={handleAddDoctor}>
                        <i className="fas fa-plus" /> Add Doctor
                    </button>
                </div>
            </div>

            <div className="doctors-grid-container custom-scrollbar">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                        <p>Loading doctors...</p>
                    </div>
                ) : doctors.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-user-md" style={{ fontSize: '3.5rem', color: '#D1D5DB', marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No doctors found</h3>
                        <p>Begin by adding a healthcare professional to your team.</p>
                    </div>
                ) : (
                    <div className="doctors-grid">
                        {filteredDoctors.map((d) => (
                            <div key={d.id} className="doctor-card" onClick={() => navigate(`/settings/doctors/${d.id}`)}>
                                <div className="doctor-card-top">
                                    <div className="doctor-card-avatar" style={{ background: d.image_url ? 'transparent' : 'var(--primary)', overflow: 'hidden' }}>
                                        {d.image_url ? (
                                            <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            d.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="doctor-card-actions">
                                        <i className="fas fa-pen" onClick={(e) => handleEditDoctor(d, e)} />
                                        <i className="fas fa-trash" onClick={(e) => handleDeleteDoctor(d.id, e)} />
                                    </div>
                                </div>
                                <div className="doctor-card-name">{d.name}</div>
                                <div className="doctor-card-specialty">{d.specialty}</div>
                                <div className="doctor-card-badges">
                                    <span className="doctor-badge-type">{d.type}</span>
                                    <span className="doctor-badge-active">Active</span>
                                </div>
                                <button className="doctor-card-btn">
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DoctorModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingDoctor(null);
                }}
                onSave={handleSaveDoctor}
                doctor={editingDoctor}
            />
        </div>
    );
};

export default DoctorsPage;
