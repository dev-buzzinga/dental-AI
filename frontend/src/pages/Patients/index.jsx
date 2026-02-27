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
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [editingPatient, setEditingPatient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;
    const navigate = useNavigate();
    const showToast = useToast();

    // Debounce search term so we don't call API on every keystroke
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        let active = true;
        if (user) {
            fetchPatients(currentPage, active);
        }
        return () => { active = false; };
    }, [user, currentPage, debouncedSearchTerm]);

    const fetchPatients = async (page = 1, active = true) => {
        if (!user) return;
        try {
            setLoading(true);
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('patients')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            const trimmedSearch = debouncedSearchTerm.trim();
            if (trimmedSearch) {
                // Search across name, email, and phone on the server side
                const like = `%${trimmedSearch}%`;
                query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            if (active) {
                setPatients(data || []);
                setTotalCount(count || 0);
            }
        } catch (error) {
            if (active) {
                showToast(error.message, 'error');
            }
        } finally {
            if (active) {
                setLoading(false);
            }
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
                // Refresh current page after update
                fetchPatients(currentPage);
            } else {
                const { error } = await supabase
                    .from('patients')
                    .insert({ ...dataToUpdate, user_id: user.id });
                if (error) throw error;
                showToast("Patient added successfully!", "success");
                // Newest patients appear first, so jump to first page
                setCurrentPage(1);
            }
            setIsModalOpen(false);
            setEditingPatient(null);
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

    const filteredPatients = useMemo(
        () => patients,
        [patients]
    );

    const selectedPatient = patients.find((p) => p.id === selectedPatientId);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
    const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showingTo = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount);

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
                    <span className="patients-badge">{totalCount} patients</span>
                </div>
                <div className="patients-header-actions">
                    <SearchInput
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={(value) => {
                            setSearchTerm(value);
                            setCurrentPage(1);
                        }}
                    />
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
                ) : totalCount === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-users" style={{ fontSize: '3rem', color: '#D1D5DB', marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No patients found</h3>
                        <p>Add your first patient to get started</p>
                    </div>
                ) : (
                    <>
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
                                            <div style={{ fontWeight: 600 }}>{(currentPage - 1) * pageSize + index + 1}</div>
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

                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <i className="fas fa-chevron-left" />
                            </button>

                            <span className="pagination-info">
                                Showing {showingFrom}-{showingTo} of {totalCount} patients
                            </span>

                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalCount === 0}
                            >
                                <i className="fas fa-chevron-right" />
                            </button>
                        </div>
                    </>
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
