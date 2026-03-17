import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceNotes.css';
import aiScribeService from '../../service/ai-scribe';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';


const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString();
};

const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const paddedSecs = secs.toString().padStart(2, '0');
    return `${mins}:${paddedSecs}`;
};

const VoiceNotesPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const showToast = useToast();

    const [voiceNotes, setVoiceNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (!user?.id) return;

        const fetchVoiceNotes = async () => {
            setIsLoading(true);
            try {
                const response = await aiScribeService.getAiScribesByUser(user.id);
                const data = response.data?.data || [];
                setVoiceNotes(Array.isArray(data) ? data : []);
                setCurrentPage(1);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching voice notes:', error);
                showToast('Failed to load voice notes.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVoiceNotes();
    }, [showToast]);

    const totalPages = useMemo(() => {
        if (!voiceNotes.length) return 1;
        return Math.ceil(voiceNotes.length / ITEMS_PER_PAGE);
    }, [voiceNotes.length]);

    const paginatedNotes = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return voiceNotes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [voiceNotes, currentPage]);

    const handleDelete = async (id) => {
        if (!id) return;
        // Simple confirmation – can be improved with a custom modal
        // eslint-disable-next-line no-alert
        const confirmed = window.confirm('Are you sure you want to delete this voice note?');
        if (!confirmed) return;

        try {
            await aiScribeService.deleteAiScribe(id);
            setVoiceNotes((prev) => prev.filter((note) => note.id !== id));
            showToast('Voice note deleted successfully.', 'success');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error deleting voice note:', error);
            showToast('Failed to delete voice note.', 'error');
        }
    };

    const handleEdit = (id) => {
        if (!id) return;
        navigate(`/add-voice-notes?id=${id}`);
    };

    const handleAddNew = () => {
        navigate('/add-voice-notes');
    };

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        for (let i = 1; i <= totalPages; i += 1) {
            pages.push(
                <button
                    key={i}
                    type="button"
                    className={`pagination-page ${i === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="voice-notes-pagination">
                <button
                    type="button"
                    className="pagination-nav"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <i className="fas fa-chevron-left" />
                </button>
                {pages}
                <button
                    type="button"
                    className="pagination-nav"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <i className="fas fa-chevron-right" />
                </button>
            </div>
        );
    };

    const hasNotes = voiceNotes.length > 0;

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <h2 className="voice-notes-title">Voice Notes</h2>
                </div>
                <div className="voice-notes-header-actions">
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleAddNew}
                    >
                        <i className="fas fa-plus" /> Add Note
                    </button>
                </div>
            </div>

            <div className="voice-notes-content">
                {isLoading && (
                    <div className="voice-notes-empty-state">
                        <i className="fas fa-spinner fa-spin" />
                        <h3>Loading voice notes...</h3>
                    </div>
                )}

                {!isLoading && !hasNotes && (
                    <div className="voice-notes-empty-state">
                        <i className="fas fa-microphone" />
                        <h3>No voice notes yet</h3>
                        <p>Create a new voice note to get started.</p>
                        <button
                            type="button"
                            className="btn-outline"
                            onClick={handleAddNew}
                        >
                            <i className="fas fa-plus" /> Add Note
                        </button>
                    </div>
                )}

                {!isLoading && hasNotes && (
                    <div className="voice-notes-table-wrapper">
                        <table className="voice-notes-table">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Doctor</th>
                                    <th>Date Created</th>
                                    <th>Duration</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedNotes.map((note) => (
                                    <tr key={note.id}>
                                        <td>{note.patients?.name || '-'}</td>
                                        <td>{note.doctors?.name || '-'}</td>
                                        <td>{formatDate(note.date_created || note.created_at)}</td>
                                        <td>{formatDuration(note.duration_seconds)}</td>
                                        
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="btn-text"
                                                onClick={() => navigate(`/voice-notes/${note.id}`)}
                                            >
                                                <i className="fas fa-edit" />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-text danger"
                                                onClick={() => handleDelete(note.id)}
                                            >
                                                <i className="fas fa-trash" />
                                            </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {renderPagination()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceNotesPage;
