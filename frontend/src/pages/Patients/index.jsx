import { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import { SearchInput } from '../../components/common/SearchInput';
import Table from '../../components/common/Table';
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
    }, [currentPage, debouncedSearchTerm]);

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

    const showDetail = (id) => {
        navigate(`/patients/${id}`);
    };

    const columns = [
        { key: 'sno', label: 'S.No', align: 'left' },
        { key: 'patient', label: 'Patient', align: 'left' },
        { key: 'phone', label: 'Phone', align: 'left' },
        { key: 'dob', label: 'Date of Birth', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'left' },
    ];

    const renderCell = (column, row, index) => {
        if (column.key === 'sno') {
            return <div style={{ fontWeight: 600 }}>{(currentPage - 1) * pageSize + index + 1}</div>;
        }

        if (column.key === 'patient') {
            return (
                <div className="patient-row-name">
                    <div className="patient-row-avatar">{row.name?.charAt(0) || '?'}</div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.email}</div>
                    </div>
                </div>
            );
        }

        if (column.key === 'phone') {
            return row.phone || '—';
        }

        if (column.key === 'dob') {
            return row.dob || '—';
        }

        if (column.key === 'actions') {
            return (
                <button
                    className="btn-outline"
                    onClick={(e) => handleEditPatient(row, e)}
                    style={{ padding: '6px 12px', fontSize: 13 }}
                >
                    <i className="fas fa-edit" /> Edit
                </button>
            );
        }

        return row[column.key] ?? '-';
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
                <Table
                    columns={columns}
                    data={filteredPatients}
                    loading={loading}
                    renderCell={renderCell}
                    onRowClick={(row) => showDetail(row.id)}
                    className="patients-table"
                    pagination={{
                        enabled: true,
                        currentPage,
                        totalPages,
                        totalItems: totalCount,
                        pageSize,
                        onPageChange: setCurrentPage
                    }}
                    emptyState={{
                        icon: 'fas fa-users',
                        title: 'No patients found',
                        description: 'Add your first patient to get started'
                    }}
                />
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
