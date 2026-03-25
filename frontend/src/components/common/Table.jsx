import React from 'react';
import './common.css';

/**
 * Reusable Table Component
 * 
 * @param {Object} props
 * @param {Array} props.columns - Array of column definitions [{ key: 'name', label: 'Name', align: 'left|center|right', width: '200px' }]
 * @param {Array} props.data - Array of data objects to display
 * @param {Boolean} props.loading - Show loading state
 * @param {Object} props.emptyState - Empty state config { icon: 'fas fa-icon', title: 'No data', description: 'Add first item', action: { label: 'Add', onClick: fn } }
 * @param {Object} props.pagination - Pagination config { enabled: true, currentPage: 1, totalPages: 10, totalItems: 100, onPageChange: fn, pageSize: 10 }
 * @param {Function} props.onRowClick - Function called when row is clicked (rowData, index)
 * @param {Function} props.renderCell - Custom cell renderer (column, rowData, index) => ReactNode
 * @param {String} props.className - Additional CSS classes
 * @param {Boolean} props.striped - Enable striped rows (default: true)
 * @param {Boolean} props.hoverable - Enable row hover effect (default: true)
 * @param {String} props.size - Table size: 'sm' | 'md' | 'lg' (default: 'md')
 */
const Table = ({
    columns = [],
    data = [],
    loading = false,
    emptyState = null,
    pagination = null,
    onRowClick = null,
    renderCell = null,
    className = '',
    striped = true,
    hoverable = true,
    size = 'md'
}) => {
    // Default empty state
    const defaultEmptyState = {
        icon: 'fas fa-inbox',
        title: 'No data available',
        description: 'There are no items to display',
        action: null
    };

    const finalEmptyState = emptyState ? { ...defaultEmptyState, ...emptyState } : defaultEmptyState;

    // Calculate pagination info
    const getPaginationInfo = () => {
        if (!pagination || !pagination.enabled) return null;

        const { currentPage = 1, totalItems = 0, pageSize = 10 } = pagination;
        const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalItems);

        return { start, end, total: totalItems };
    };

    const paginationInfo = getPaginationInfo();

    // Handle page change
    const handlePageChange = (newPage) => {
        if (!pagination || !pagination.onPageChange) return;
        if (newPage < 1 || newPage > pagination.totalPages) return;
        pagination.onPageChange(newPage);
    };

    // Handle row click
    const handleRowClick = (rowData, index) => {
        if (onRowClick) {
            onRowClick(rowData, index);
        }
    };

    // Default cell renderer
    const defaultCellRenderer = (column, rowData) => {
        const value = rowData[column.key];
        return value !== null && value !== undefined ? value : '-';
    };

    // Render cell content
    const renderCellContent = (column, rowData, index) => {
        if (renderCell) {
            return renderCell(column, rowData, index);
        }
        return defaultCellRenderer(column, rowData);
    };

    // Loading state
    if (loading) {
        return (
            <div className={`table-component ${className}`}>
                <div className="table-empty-state">
                    <i className="fas fa-spinner fa-spin table-empty-icon" />
                    <h3 className="table-empty-title">Loading...</h3>
                    <p className="table-empty-description">Please wait while we fetch the data</p>
                </div>
            </div>
        );
    }

    // Empty state
    if (!data || data.length === 0) {
        return (
            <div className={`table-component ${className}`}>
                <div className="table-empty-state">
                    <i className={`${finalEmptyState.icon} table-empty-icon`} />
                    <h3 className="table-empty-title">{finalEmptyState.title}</h3>
                    <p className="table-empty-description">{finalEmptyState.description}</p>
                    {finalEmptyState.action && (
                        <button
                            className="btn-outline table-empty-action"
                            onClick={finalEmptyState.action.onClick}
                        >
                            {finalEmptyState.action.icon && <i className={finalEmptyState.action.icon} />}
                            {finalEmptyState.action.label}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Table with data
    return (
        <div className={`table-component ${className}`}>
            <div className="table-wrapper">
                <table className={`
                    table-base 
                    table-size-${size}
                    ${striped ? 'table-striped' : ''}
                    ${hoverable ? 'table-hoverable' : ''}
                    ${onRowClick ? 'table-clickable' : ''}
                `}>
                    <thead className="table-head">
                        <tr>
                            {columns.map((column, index) => (
                                <th
                                    key={column.key || index}
                                    style={{
                                        textAlign: column.align || 'left',
                                        width: column.width || 'auto'
                                    }}
                                    className="table-header-cell"
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="table-body">
                        {data.map((rowData, rowIndex) => (
                            <tr
                                key={rowData.id || rowIndex}
                                onClick={() => handleRowClick(rowData, rowIndex)}
                                className="table-row"
                            >
                                {columns.map((column, colIndex) => (
                                    <td
                                        key={column.key || colIndex}
                                        style={{
                                            textAlign: column.align || 'left'
                                        }}
                                        className="table-cell"
                                    >
                                        {renderCellContent(column, rowData, rowIndex)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination (inside the bordered table wrapper) */}
                {pagination && pagination.enabled && paginationInfo && (
                    <div className="table-pagination">
                        <div className="table-pagination-rows">
                            <span className="table-pagination-rows-label">Rows per page:</span>
                            <div className="table-pagination-rows-select-wrap">
                                <select
                                    className="table-pagination-rows-select"
                                    value={pagination.pageSize || 10}
                                    disabled={!pagination.onPageSizeChange}
                                    onChange={(e) => {
                                        if (!pagination.onPageSizeChange) return;
                                        pagination.onPageSizeChange(parseInt(e.target.value, 10));
                                    }}
                                >
                                    {(pagination.pageSizeOptions && pagination.pageSizeOptions.length
                                        ? pagination.pageSizeOptions
                                        : [5, 10, 25, 50, 100]
                                    ).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <span className="table-pagination-info">
                            {paginationInfo.start}-{paginationInfo.end} of {paginationInfo.total}
                        </span>

                        <div className="table-pagination-nav">
                            <button
                                className="table-pagination-btn"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1 || paginationInfo.total === 0}
                                type="button"
                            >
                                <i className="fas fa-chevron-left" />
                            </button>

                            <button
                                className="table-pagination-btn"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage >= pagination.totalPages || paginationInfo.total === 0}
                                type="button"
                            >
                                <i className="fas fa-chevron-right" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Table;
