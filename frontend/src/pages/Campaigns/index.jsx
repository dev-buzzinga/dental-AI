import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../../components/common/SearchInput';
import Table from '../../components/common/Table';
import '../../styles/addCampaigns.css';

const CampaignsPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const pageSize = 10;

    const handleAddCampaign = () => {
        navigate('/campaigns/add');
    };

    const handleCloseWizard = () => {
        setIsWizardOpen(false);
    };

    const columns = [
        { key: 'sno', label: 'S.NO', align: 'left' },
        { key: 'name', label: 'CAMPAIGN NAME', align: 'left' },
        { key: 'start_date', label: 'START DATE', align: 'left' },
        { key: 'end_date', label: 'END DATE', align: 'left' },
        { key: 'timezone', label: 'TIMEZONE', align: 'left' },
        { key: 'limit', label: 'LIMIT', align: 'left' },
        { key: 'status', label: 'STATUS', align: 'left' },
        { key: 'actions', label: 'ACTIONS', align: 'left' },
    ];

    const data = [
        {
            id: 1,
            sno:1,
            name: 'Teeth Whitening Campaign',
            status: 'Schedule',
            start_date: '2026-03-20',
            end_date: '2026-03-20',
            timezone: "America/Chicago",
            limit: 1
        },
        {
            id: 2,
            sno:2,
            name: 'Dental Implant Campaign',
            status: 'Draft',
            start_date: '2026-03-20',
            end_date: '2026-03-20',
            timezone: "America/Chicago",
            limit: 1
        },
        {
            id: 3,
            sno:3,
            name: 'Dental Implant Campaign',
            status: 'Draft',
            start_date: '2026-03-20',
            end_date: '2026-03-20',
            timezone: "America/Chicago",
            limit: 1
        }
    ];

    const renderCell = (column, row, index) => {
        if (column.key === 'id') {
            return index + 1;
        }
        if (column.key === 'name') {
            return (
                <div className="flex items-center gap-2">
                    <span className="campaign-name-link">{row.name}</span>
                </div>
            );
        }
        if (column.key === 'status') {
            return (
                <span className={`status-badge ${row.status.toLowerCase()}`}>
                    {row.status}
                </span>
            );
        }
        if (column.key === 'actions') {
            return (
                <div className="flex items-center gap-5 ">
                    <button> <i className="fas fa-pencil"></i>
                    </button>
                    <button> <i className="fas fa-trash"></i>
                    </button>
                </div>
            );
        }
        return row[column.key] ?? '-';
    };

    return (
        <div className="campaigns-page">
            <div className="campaigns-header">
                <div className="campaigns-header-left">
                    <h2 className="campaigns-title">Campaigns</h2>
                </div>
                <div className="campaigns-header-actions">
                    <SearchInput placeholder="Search campaigns..." value={searchTerm} onChange={setSearchTerm} />
                    <button className="btn-primary" onClick={handleAddCampaign}>
                        <i className="fas fa-plus" /> Add Campaign
                    </button>
                </div>
            </div>

            <div className="flex-1 px-8 py-6 overflow-hidden flex flex-col">
                <div className="flex-1 bg-[var(--bg-surface)] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col custom-scrollbar">
                    <Table
                        columns={columns}
                        data={data}
                        loading={false}
                        renderCell={renderCell}
                        className="campaigns-table"
                        pagination={{
                            enabled: true,
                            currentPage,
                            totalPages: 1,
                            totalItems: 3,
                            pageSize,
                            onPageChange: setCurrentPage
                        }}
                        emptyState={{
                            icon: 'fas fa-bullhorn',
                            title: 'No campaigns found',
                            description: 'Create your first campaign to get started'
                        }}
                    />
                </div>
            </div>

            {/* <CampaignWizard isOpen={isWizardOpen} onClose={handleCloseWizard} /> */}
        </div>
    );
};

export default CampaignsPage;
