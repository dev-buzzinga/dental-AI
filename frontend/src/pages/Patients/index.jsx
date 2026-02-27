import { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { SearchInput } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import PatientModal from '../../components/Patients/PatientModal';
import '../../styles/Patients.css';

const PatientsPage = () => {
    const { user } = useContext(AuthContext);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [editingPatient, setEditingPatient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const showToast = useToast();

    useEffect(() => {
        if (user) {
            fetchPatients();
        }
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPatients(data || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePatient = async (formData) => {
        try {
            const dataToUpdate = { ...formData };
            if (dataToUpdate.next_appointment == "") {
                delete dataToUpdate.next_appointment;
            }
            if (editingPatient) {

                const { error } = await supabase
                    .from('patients')
                    .update(dataToUpdate)
                    .eq('id', editingPatient.id);
                if (error) throw error;
                showToast("Patient updated successfully!", "success");
            } else {
                const { error } = await supabase
                    .from('patients')
                    .insert({ ...dataToUpdate, user_id: user.id });
                if (error) throw error;
                showToast("Patient added successfully!", "success");
            }
            setIsModalOpen(false);
            setEditingPatient(null);
            fetchPatients();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleEditPatient = (patient, e) => {
        e.stopPropagation();
        setEditingPatient(patient);
        setIsModalOpen(true);
    };

    const handleAddPatient = () => {
        setEditingPatient(null);
        setIsModalOpen(true);
    };

    const filteredPatients = useMemo(() =>
        patients.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone?.includes(searchTerm)
        ), [patients, searchTerm]);

    const selectedPatient = patients.find((p) => p.id === selectedPatientId);

    const showDetail = (id) => {
        navigate(`/patients/${id}`);
    };

    // Removed inline detail view logic to use separate page
    /*
    if (view === 'detail' && selectedPatient) {
        ...
    }
    */

    return (
        <div className="patients-page">
            <div className="patients-header">
                <div className="patients-header-left">
                    <h2 className="patients-title">All Patients</h2>
                    <span className="patients-badge">{patients.length} patients</span>
                </div>
                <div className="patients-header-actions">
                    <SearchInput placeholder="Search patients..." value={searchTerm} onChange={setSearchTerm} />
                    <button className="btn-primary" onClick={handleAddPatient}>
                        <i className="fas fa-plus" /> Add Patient
                    </button>
                </div>
            </div>

            <div className="patients-table-container custom-scrollbar">
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                        <p>Loading patients...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-users" style={{ fontSize: '3rem', color: '#D1D5DB', marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No patients found</h3>
                        <p>Add your first patient to get started</p>
                    </div>
                ) : (
                    <table className="patients-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Patient</th>
                                <th>Phone</th>
                                <th>Date of Birth</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((p, index) => (
                                <tr key={p.id} onClick={() => showDetail(p.id)}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{index + 1}</div>
                                    </td>
                                    <td>
                                        <div className="patient-row-name">
                                            <div className="patient-row-avatar">{p.name.charAt(0)}</div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{p.phone}</td>
                                    <td>{p.dob}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-outline" onClick={(e) => handleEditPatient(p, e)} style={{ padding: '6px 12px', fontSize: 13 }}>
                                            <i className="fas fa-edit" /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <PatientModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingPatient(null);
                }}
                onSave={handleSavePatient}
                patient={editingPatient}
            />
        </div>
    );
};

export default PatientsPage;
