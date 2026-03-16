import PropTypes from 'prop-types';

const VoiceTranscriptPanel = ({
    transcript,
    onTranscriptChange,
    isRecording,
    recordingTime = 0,
    onToggleRecording,
    onSaveRecording,
    onCancelRecording,
}) => {
    // Format recording time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="voice-panel">
            <div className="voice-panel-header">
                <div className="voice-panel-title">
                    <i className="fas fa-wave-square" />
                    <span>Live Transcript</span>
                </div>
                
                {!isRecording ? (
                    <button
                        type="button"
                        className="voice-record-btn"
                        onClick={onToggleRecording}
                    >
                        <i className="fas fa-microphone" />
                        Start Recording
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px 16px',
                            background: 'var(--primary-light)',
                            borderRadius: '20px',
                            gap: '8px'
                        }}>
                            <span style={{ 
                                color: 'var(--primary)',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                {formatTime(recordingTime)}
                            </span>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--danger)',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                        </div>
                        
                        <button
                            type="button"
                            className="voice-action-btn voice-save-btn"
                            onClick={onSaveRecording}
                            title="Save Recording"
                            style={{
                                background: 'var(--success)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fas fa-check" />
                        </button>
                        
                        <button
                            type="button"
                            className="voice-action-btn voice-cancel-btn"
                            onClick={onCancelRecording}
                            title="Cancel Recording"
                            style={{
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>
                )}
            </div>
            <div className="voice-panel-body">
                <textarea
                    className="voice-panel-textarea"
                    placeholder="Transcript will appear here..."
                    value={transcript}
                    onChange={(e) => onTranscriptChange(e.target.value)}
                />
            </div>
        </div>
    );
};

VoiceTranscriptPanel.propTypes = {
    transcript: PropTypes.string.isRequired,
    onTranscriptChange: PropTypes.func.isRequired,
    isRecording: PropTypes.bool.isRequired,
    recordingTime: PropTypes.number,
    onToggleRecording: PropTypes.func.isRequired,
    onSaveRecording: PropTypes.func,
    onCancelRecording: PropTypes.func,
};

export default VoiceTranscriptPanel;

