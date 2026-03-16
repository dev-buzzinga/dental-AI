
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceNotes.css';

const VoiceNotesPage = () => {
    const navigate = useNavigate();

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <h2 className="voice-notes-title">Voice Notes</h2>
                </div>
                <div className="voice-notes-header-actions">
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/add-voice-notes')}
                    >
                        <i className="fas fa-plus" /> Add Note
                    </button>
                </div>
            </div>

            <div className="voice-notes-content">
                <div className="voice-notes-empty-state">
                    <i className="fas fa-microphone" />
                    <h3>No voice notes yet</h3>
                    <p>Create a new voice note to get started.</p>
                    <button
                        className="btn-outline"
                        onClick={() => navigate('/add-voice-notes')}
                    >
                        <i className="fas fa-plus" /> Add Note
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceNotesPage;