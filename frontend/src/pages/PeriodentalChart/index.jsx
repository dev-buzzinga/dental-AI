import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../../components/common/SearchInput';
import Table from '../../components/common/Table';
import { AuthContext } from '../../context/AuthContext';
import periodontalChartService from '../../service/periodontalChart';
import { useToast } from '../../components/Toast/Toast';
import '../../styles/PeriodentalChart.css';

const PeriodentalChartPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const showToast = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [charts, setCharts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const pageSize = 10;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(0); // Reset to first page on search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch charts
    useEffect(() => {
        if (user) {
            fetchCharts();
        }
    }, [user, currentPage, debouncedSearchTerm]);

    const fetchCharts = async () => {
        try {
            setLoading(true);
            const response = await periodontalChartService.getPeriodontalCharts(
                currentPage,
                pageSize,
                debouncedSearchTerm
            );

            if (response.data.success) {
                setCharts(response.data.data || []);
                setTotalCount(response.data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching charts:', error);
            showToast(error.response?.data?.message || 'Failed to load charts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddChart = () => {
        navigate('/periodontal-charts/add', { state: { mode: 'create' } });
    };

    const handleViewChart = (row) => {
        navigate('/periodontal-charts/view', { 
            state: { mode: 'view', chartData: row } 
        });
    };

    const handleEditChart = (row) => {
        navigate('/periodontal-charts/edit', { 
            state: { mode: 'edit', chartData: row } 
        });
    };

    const handleDeleteChart = async (row) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete this periodontal chart for ${row.patients?.name || 'this patient'}?`
        );

        if (!confirmed) return;

        try {
            await periodontalChartService.deletePeriodontalChart(row.id);
            showToast('Chart deleted successfully', 'success');
            fetchCharts(); // Refresh list
        } catch (error) {
            console.error('Error deleting chart:', error);
            showToast(error.response?.data?.message || 'Failed to delete chart', 'error');
        }
    };

    const columns = [
        { key: 'sno', label: 'S.No', align: 'left' },
        { key: 'patient', label: 'Patient Name', align: 'left' },
        { key: 'doctor', label: 'Doctor', align: 'left' },
        { key: 'dob', label: 'Date of Birth', align: 'left' },
        { key: 'chartDate', label: 'Chart Date', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'center' },
    ];

    const renderCell = (column, row, index) => {
        switch (column.key) {
            case 'sno':
                return currentPage * pageSize + index + 1;
            
            case 'patient':
                return row.patients?.name || 'N/A';
            
            case 'doctor':
                return (
                    <div className="doctor-cell">
                        {row.doctors?.profile_img && (
                            <img 
                                src={row.doctors.profile_img} 
                                alt={row.doctors.name} 
                                className="doctor-avatar"
                            />
                        )}
                        <span>{row.doctors?.name || 'N/A'}</span>
                    </div>
                );
            
            case 'dob':
                return row.dob ? new Date(row.dob).toLocaleDateString() : 'N/A';
            
            case 'chartDate':
                return row.chart_date ? new Date(row.chart_date).toLocaleDateString() : 'N/A';
            
            case 'actions':
                return (
                    <div className="action-buttons">
                        <button 
                            className="btn-icon view-btn" 
                            onClick={() => handleViewChart(row)}
                            title="View Chart"
                        >
                            <i className="fas fa-eye"></i>
                        </button>
                        <button 
                            className="btn-icon edit-btn" 
                            onClick={() => handleEditChart(row)}
                            title="Edit Chart"
                        >
                            <i className="fas fa-edit"></i>
                        </button>
                        <button 
                            className="btn-icon delete-btn" 
                            onClick={() => handleDeleteChart(row)}
                            title="Delete Chart"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                );
            
            default:
                return row[column.key] ?? '-';
        }
    };

    return (
        <div className="periodontal-chart-page">
            <div className="page-header">
                <div className="header-left">
                    <h2 className="page-title">Periodontal Charts</h2>
                    <p className="page-subtitle">Manage patient periodontal charts</p>
                </div>
                <div className="header-actions">
                    <SearchInput 
                        placeholder="Search by doctor name..." 
                        value={searchTerm} 
                        onChange={setSearchTerm} 
                    />
                    <button className="btn-primary" onClick={handleAddChart}>
                        <i className="fas fa-plus" /> Add New Chart
                    </button>
                </div>
            </div>

            <div className="page-content">
                <div className="table-container">
                    <Table
                        columns={columns}
                        data={charts}
                        loading={loading}
                        renderCell={renderCell}
                        className="periodontal-charts-table"
                        pagination={{
                            enabled: true,
                            currentPage: currentPage + 1, // Table component expects 1-based indexing
                            totalPages,
                            totalItems: totalCount,
                            pageSize,
                            onPageChange: (page) => setCurrentPage(page - 1) // Convert back to 0-based
                        }}
                        emptyState={{
                            icon: 'fas fa-tooth',
                            title: 'No periodontal charts found',
                            description: searchTerm 
                                ? 'Try adjusting your search terms' 
                                : 'Create your first periodontal chart to get started'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PeriodentalChartPage;
