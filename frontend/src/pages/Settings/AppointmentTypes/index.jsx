import { useState, useMemo, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../config/supabase';
import { AuthContext } from '../../../context/AuthContext';
import { SearchInput } from '../../../components/common/SearchInput';
import Table from '../../../components/common/Table';
import { useToast } from '../../../components/Toast/Toast';
import '../../../styles/Settings.css';
// import '../../../styles/Patients.css';

const AppointmentTypes = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [appointmentTypes, setAppointmentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const handleEditType = (type, e) => {
        e.stopPropagation();
        navigate(`/settings/appointment-types/edit/${type.id}`);
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

    const handleAddType = () => navigate('/settings/appointment-types/add');

    const filteredTypes = useMemo(() =>
        appointmentTypes.filter((t) =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [appointmentTypes, searchTerm]);

    const columns = [
        { key: 'sno', label: 'S.No', align: 'left', width: '80px' },
        { key: 'name', label: 'Name', align: 'left' },
        { key: 'duration', label: 'Duration (Mins)', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'center', width: '140px' }
    ];

    const renderCell = (column, row, index) => {
        if (column.key === 'sno') {
            return <div>{index + 1}</div>;
        }

        if (column.key === 'name') {
            return <div>{row.name}</div>;
        }

        if (column.key === 'duration') {
            return `${row.duration} mins`;
        }

        if (column.key === 'actions') {
            return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        className="btn-outline"
                        onClick={(e) => handleEditType(row, e)}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                        <i className="fas fas fa-pencil" />
                    </button>
                    <button
                        className="btn-outline"
                        onClick={(e) => handleDeleteType(row.id, e)}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                        <i className="fas fa-trash" />
                    </button>
                </div>
            );
        }

        return row[column.key] ?? '-';
    };

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
                <Table
                    columns={columns}
                    data={filteredTypes}
                    loading={loading}
                    renderCell={renderCell}
                    className="patients-table"
                    pagination={null}
                    emptyState={{
                        icon: 'fas fa-calendar-alt',
                        title: 'No appointment types found',
                        description: 'Add your first appointment type to get started'
                    }}
                />
            </div>

        </div>
    );
};

export default AppointmentTypes;

