import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../../components/common/SearchInput';
import Table from '../../components/common/Table';
import CampaignWizard from '../../components/Campaigns/CampaignWizard';
import '../../styles/Campaigns.css';

const CampaignsPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const pageSize = 10;

    const handleAddCampaign = () => {
        setIsWizardOpen(true);
    };

    const handleCloseWizard = () => {
        setIsWizardOpen(false);
    };

    const columns = [
        { key: 'name', label: 'Campaign Name', align: 'left' },
        { key: 'status', label: 'Status', align: 'left' },
        { key: 'date', label: 'Date', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'left' },
    ];

    const data = [
        {
            name: 'Campaign 1',
            status: 'Active',
            date: '2026-03-20',
            actions: <button className="btn-secondary">View</button>
        },
        {
            name: 'Campaign 2',
            status: 'Inactive',
            date: '2026-03-20',
            actions: <button className="btn-secondary">View</button>
        },

        {
            name: 'Campaign 3',
            status: 'Inactive',
            date: '2026-03-20',
            actions: <button className="btn-secondary">View</button>
        }
    ]; // UI only, no data for now
    const totalCount = 0;
    const totalPages = 1;

    const renderCell = (column, row, index) => {
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
                            totalPages,
                            totalItems: totalCount,
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

            <CampaignWizard isOpen={isWizardOpen} onClose={handleCloseWizard} />
        </div>
    );
};

export default CampaignsPage;
