import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    const [chartToDelete, setChartToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
    }, [currentPage, debouncedSearchTerm]);

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
        setChartToDelete(row);
    };

    const closeDeleteModal = () => {
        if (isDeleting) return;
        setChartToDelete(null);
    };

    const confirmDeleteChart = async () => {
        if (!chartToDelete) return;
        try {
            setIsDeleting(true);
            await periodontalChartService.deletePeriodontalChart(chartToDelete.id);
            showToast('Chart deleted successfully', 'success');
            closeDeleteModal();
            fetchCharts(); // Refresh list
        } catch (error) {
            console.error('Error deleting chart:', error);
            showToast(error.response?.data?.message || 'Failed to delete chart', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = [
        { key: 'sno', label: 'S.No', align: 'left' },
        { key: 'patient', label: 'Patient Name', align: 'left' },
        { key: 'doctor', label: 'Doctor', align: 'left' },
        { key: 'dob', label: 'Date of Birth', align: 'left' },
        { key: 'chartDate', label: 'Chart Date', align: 'left' },
        { key: 'view', label: 'View', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'center' },
    ];

    const renderCell = (column, row, index) => {
        switch (column.key) {
            case 'sno':
                return totalCount - (currentPage * pageSize + index);

            case 'patient':
                return row.patients?.name || 'N/A';

            case 'doctor':
                return (
                    <div className="doctor-cell">
                        <span>{row.doctors?.name || 'N/A'}</span>
                    </div>
                );

            case 'dob':
                return row.dob ? new Date(row.dob).toLocaleDateString() : 'N/A';

            case 'chartDate':
                return row.chart_date ? new Date(row.chart_date).toLocaleDateString() : 'N/A';

            case 'view':
                return (
                    <Link
                        className="view-btn"
                        to="/periodontal-charts/view"
                        state={{ mode: 'view', chartData: row }}
                        title="View Chart"
                    >
                        View
                    </Link>
                );

            case 'actions':
                return (
                    <div className="action-buttons">
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
        <div className="add-periodontal-chart-page periodontal-chart-page">
            <div className="page-header">
                <div className="header-left">
                    <h2 className="page-title">Periodontal Charts</h2>
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

            {chartToDelete && (
                <div className="modal-overlay" onClick={closeDeleteModal}>
                    <div className="periodontal-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="periodontal-delete-modal-icon">
                            <i className="fas fa-trash"></i>
                        </div>
                        <h3>Delete Periodontal Chart?</h3>
                        <p>
                            This will permanently delete the chart for{' '}
                            <strong>{chartToDelete.patients?.name || 'this patient'}</strong>.
                        </p>
                        <div className="periodontal-delete-modal-actions">
                            <button
                                type="button"
                                className="periodontal-delete-cancel-btn"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="periodontal-delete-confirm-btn"
                                onClick={confirmDeleteChart}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeriodentalChartPage;
