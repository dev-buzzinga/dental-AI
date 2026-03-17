/**
 * Table Component Demo Page
 * 
 * This is a demo page to showcase all features of the reusable Table component.
 * DO NOT USE IN PRODUCTION - This is just for testing/demonstration.
 * 
 * To view this page, add a route in your router:
 * <Route path="/table-demo" element={<TableDemo />} />
 */

import { useState } from 'react';
import Table from '../components/common/Table';

const TableDemo = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const pageSize = 5;

    // Sample data
    const allPatients = [
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', dob: '1990-05-15', status: 'Active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321', dob: '1985-08-22', status: 'Active' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '555-123-4567', dob: '1978-12-10', status: 'Inactive' },
        { id: 4, name: 'Alice Williams', email: 'alice@example.com', phone: '444-987-6543', dob: '1995-03-18', status: 'Active' },
        { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', phone: '333-222-1111', dob: '1982-07-25', status: 'Active' },
        { id: 6, name: 'Diana Prince', email: 'diana@example.com', phone: '666-777-8888', dob: '1992-11-30', status: 'Inactive' },
        { id: 7, name: 'Ethan Hunt', email: 'ethan@example.com', phone: '999-888-7777', dob: '1988-04-12', status: 'Active' },
        { id: 8, name: 'Fiona Green', email: 'fiona@example.com', phone: '111-222-3333', dob: '1993-09-05', status: 'Active' }
    ];

    const totalPages = Math.ceil(allPatients.length / pageSize);
    const paginatedData = allPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Simulate loading
    const handleSimulateLoading = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '32px', fontSize: '32px', fontWeight: 700 }}>
                Table Component Demo
            </h1>

            {/* Demo 1: Simple Table */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    1. Simple Table (No Pagination)
                </h2>
                <Table
                    columns={[
                        { key: 'id', label: 'ID', align: 'center', width: '80px' },
                        { key: 'name', label: 'Name', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' },
                        { key: 'status', label: 'Status', align: 'center' }
                    ]}
                    data={allPatients.slice(0, 3)}
                    emptyState={{
                        icon: 'fas fa-inbox',
                        title: 'No data available',
                        description: 'There are no items to display'
                    }}
                />
            </section>

            {/* Demo 2: Table with Pagination */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    2. Table with Pagination
                </h2>
                <Table
                    columns={[
                        { key: 'id', label: 'S.No', align: 'left', width: '80px' },
                        { key: 'name', label: 'Patient Name', align: 'left' },
                        { key: 'phone', label: 'Phone', align: 'left' },
                        { key: 'dob', label: 'Date of Birth', align: 'left' }
                    ]}
                    data={paginatedData}
                    pagination={{
                        enabled: true,
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalItems: allPatients.length,
                        pageSize: pageSize,
                        onPageChange: (page) => setCurrentPage(page)
                    }}
                    emptyState={{
                        icon: 'fas fa-users',
                        title: 'No patients found',
                        description: 'Add your first patient to get started'
                    }}
                />
            </section>

            {/* Demo 3: Custom Cell Rendering */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    3. Custom Cell Rendering (Avatar + Status Badge + Actions)
                </h2>
                <Table
                    columns={[
                        { key: 'patient', label: 'Patient', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' },
                        { key: 'status', label: 'Status', align: 'center' },
                        { key: 'actions', label: 'Actions', align: 'center' }
                    ]}
                    data={allPatients.slice(0, 4)}
                    renderCell={(column, rowData) => {
                        if (column.key === 'patient') {
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '16px'
                                    }}>
                                        {rowData.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{rowData.name}</div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{rowData.phone}</div>
                                    </div>
                                </div>
                            );
                        }

                        if (column.key === 'status') {
                            const isActive = rowData.status === 'Active';
                            return (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: isActive ? '#D1FAE5' : '#FEE2E2',
                                    color: isActive ? '#065F46' : '#991B1B'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: isActive ? '#10B981' : '#EF4444'
                                    }} />
                                    {rowData.status}
                                </span>
                            );
                        }

                        if (column.key === 'actions') {
                            return (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button
                                        className="btn-outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            alert(`Viewing ${rowData.name}`);
                                        }}
                                        style={{ padding: '6px 12px', fontSize: '13px' }}
                                    >
                                        <i className="fas fa-eye" /> View
                                    </button>
                                    <button
                                        className="btn-outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            alert(`Editing ${rowData.name}`);
                                        }}
                                        style={{ padding: '6px 12px', fontSize: '13px' }}
                                    >
                                        <i className="fas fa-edit" /> Edit
                                    </button>
                                </div>
                            );
                        }

                        return rowData[column.key] || '-';
                    }}
                    onRowClick={(rowData) => alert(`Row clicked: ${rowData.name}`)}
                />
            </section>

            {/* Demo 4: Loading State */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    4. Loading State
                </h2>
                <button
                    onClick={handleSimulateLoading}
                    className="btn-primary"
                    style={{ marginBottom: '16px' }}
                >
                    <i className="fas fa-sync" /> Simulate Loading (2 seconds)
                </button>
                <Table
                    columns={[
                        { key: 'name', label: 'Name', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' }
                    ]}
                    data={loading ? [] : allPatients.slice(0, 3)}
                    loading={loading}
                />
            </section>

            {/* Demo 5: Empty State with Action */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    5. Empty State with Action Button
                </h2>
                <Table
                    columns={[
                        { key: 'name', label: 'Name', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' }
                    ]}
                    data={[]}
                    emptyState={{
                        icon: 'fas fa-user-plus',
                        title: 'No patients yet',
                        description: 'Get started by adding your first patient to the system',
                        action: {
                            icon: 'fas fa-plus',
                            label: 'Add Patient',
                            onClick: () => alert('Add patient clicked!')
                        }
                    }}
                />
            </section>

            {/* Demo 6: Small Size Table */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    6. Small Size Table (Compact)
                </h2>
                <Table
                    columns={[
                        { key: 'name', label: 'Name', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' },
                        { key: 'phone', label: 'Phone', align: 'left' }
                    ]}
                    data={allPatients.slice(0, 3)}
                    size="sm"
                />
            </section>

            {/* Demo 7: Large Size Table */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    7. Large Size Table (Spacious)
                </h2>
                <Table
                    columns={[
                        { key: 'name', label: 'Name', align: 'left' },
                        { key: 'email', label: 'Email', align: 'left' },
                        { key: 'phone', label: 'Phone', align: 'left' }
                    ]}
                    data={allPatients.slice(0, 3)}
                    size="lg"
                />
            </section>

            {/* Demo 8: Without Striping & Hover */}
            <section style={{ marginBottom: '48px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
                    8. Clean Table (No Striping, No Hover)
                </h2>
                <Table
                    columns={[
                        { key: 'name', label: 'Setting Name', align: 'left' },
                        { key: 'email', label: 'Value', align: 'left' }
                    ]}
                    data={allPatients.slice(0, 3)}
                    striped={false}
                    hoverable={false}
                />
            </section>

            {/* Info Box */}
            <div style={{
                padding: '20px',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                marginTop: '48px'
            }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#1E40AF' }}>
                    <i className="fas fa-info-circle" /> Demo Information
                </h3>
                <p style={{ fontSize: '14px', color: '#1E40AF', margin: 0 }}>
                    This is a demonstration page for the reusable Table component. 
                    All styles are under <code>.table-component</code> parent class. 
                    See <code>TABLE_COMPONENT_USAGE.md</code> for complete documentation.
                </p>
            </div>
        </div>
    );
};

export default TableDemo;
