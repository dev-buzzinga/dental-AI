import PropTypes from 'prop-types';

const VoiceTranscriptPanel = ({
    transcript,
    onTranscriptChange,
    isRecording,
    onToggleRecording,
}) => {
    return (
        <div className="voice-panel">
            <div className="voice-panel-header">
                <div className="voice-panel-title">
                    <i className="fas fa-wave-square" />
                    <span>Live Transcript</span>
                </div>
                <button
                    type="button"
                    className={`voice-record-btn ${isRecording ? 'recording' : ''}`}
                    onClick={onToggleRecording}
                >
                    <i className={isRecording ? 'fas fa-stop' : 'fas fa-microphone'} />
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
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
    onToggleRecording: PropTypes.func.isRequired,
};

export default VoiceTranscriptPanel;

