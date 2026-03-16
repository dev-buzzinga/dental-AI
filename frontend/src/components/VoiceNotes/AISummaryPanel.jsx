import PropTypes from 'prop-types';

const AISummaryPanel = ({
    summary,
    onDelete,
    onRegenerate,
    onCopy,
    onExportPdf,
}) => {
    return (
        <div className="voice-panel">
            <div className="voice-panel-header">
                <div className="voice-panel-title">
                    <i className="fas fa-robot" />
                    <span>AI Summary</span>
                </div>
                <div className="ai-summary-actions">
                    <button
                        type="button"
                        className="ai-summary-action-btn"
                        onClick={onDelete}
                    >
                        <i className="fas fa-trash" />
                        Delete
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn primary"
                        onClick={onRegenerate}
                    >
                        <i className="fas fa-sync-alt" />
                        Regenerate
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn"
                        onClick={onCopy}
                    >
                        <i className="fas fa-copy" />
                        Copy
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn"
                        onClick={onExportPdf}
                    >
                        <i className="fas fa-file-pdf" />
                        Export PDF
                    </button>
                </div>
            </div>
            <div className="voice-panel-body">
                <div className="ai-summary-box">
                    {summary || 'AI-generated summary will appear here...'}
                </div>
            </div>
        </div>
    );
};

AISummaryPanel.propTypes = {
    summary: PropTypes.string,
    onDelete: PropTypes.func.isRequired,
    onRegenerate: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired,
    onExportPdf: PropTypes.func.isRequired,
};

AISummaryPanel.defaultProps = {
    summary: '',
};

export default AISummaryPanel;

