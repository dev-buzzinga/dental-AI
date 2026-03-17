import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';

const AISummaryPanel = ({
    summary,
    onDelete,
    onRegenerate,
    onCopy,
    onExportPdf,
    isGenerating = false,
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
                        disabled={isGenerating || !summary}
                    >
                        <i className="fas fa-trash" />
                        Delete
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn primary"
                        onClick={onRegenerate}
                        disabled={isGenerating}
                    >
                        <i className={`fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
                        {isGenerating ? 'Generating...' : 'Regenerate'}
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn"
                        onClick={onCopy}
                        disabled={isGenerating || !summary}
                    >
                        <i className="fas fa-copy" />
                        Copy
                    </button>
                    <button
                        type="button"
                        className="ai-summary-action-btn"
                        onClick={onExportPdf}
                        disabled={isGenerating || !summary}
                    >
                        <i className="fas fa-file-pdf" />
                        Export PDF
                    </button>
                </div>
            </div>
            <div className="voice-panel-body">
                <div className="ai-summary-box">
                    {isGenerating ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            padding: '40px',
                            color: 'var(--text-secondary)'
                        }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--primary)' }} />
                            <span>Generating AI Summary...</span>
                            <span style={{ fontSize: '12px' }}>This may take a few seconds</span>
                        </div>
                    ) : summary ? (
                        <div className="ai-summary-markdown">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="ai-summary-h1">{children}</h1>,
                                    h2: ({ children }) => <h2 className="ai-summary-h2">{children}</h2>,
                                    strong: ({ children }) => <strong className="ai-summary-strong">{children}</strong>,
                                    p: ({ children }) => <p className="ai-summary-p">{children}</p>,
                                    hr: () => <hr className="ai-summary-hr" />,
                                }}
                            >
                                {summary}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        'AI-generated summary will appear here...'
                    )}
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
    isGenerating: PropTypes.bool,
};

AISummaryPanel.defaultProps = {
    summary: '',
    isGenerating: false,
};

export default AISummaryPanel;

