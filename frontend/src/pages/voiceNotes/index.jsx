import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceNotes.css';
import aiScribeService from '../../service/ai-scribe';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast/Toast';
import Table from '../../components/common/Table';


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
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [pageSize, setPageSize] = useState(10);

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
        return Math.ceil(voiceNotes.length / pageSize);
    }, [voiceNotes.length, pageSize]);

    const paginatedNotes = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return voiceNotes.slice(startIndex, startIndex + pageSize);
    }, [voiceNotes, currentPage, pageSize]);

    const handleDeleteClick = (note) => {
        if (!note) return;
        setNoteToDelete(note);
    };

    const handleConfirmDelete = async () => {
        if (!noteToDelete?.id) return;

        try {
            await aiScribeService.deleteAiScribe(noteToDelete.id);
            setVoiceNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
            showToast('Voice note deleted successfully.', 'success');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error deleting voice note:', error);
            showToast('Failed to delete voice note.', 'error');
        } finally {
            setNoteToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setNoteToDelete(null);
    };

    const handleEdit = (id) => {
        if (!id) return;
        navigate(`/add-voice-notes?id=${id}`);
    };

    const handleAddNew = () => {
        navigate('/add-voice-notes');
    };

    // Table columns configuration
    const columns = [
        { key: 'id', label: 'ID', align: 'left' },
        { key: 'patient', label: 'Patient Name', align: 'left' },
        { key: 'doctor', label: 'Doctor', align: 'left' },
        { key: 'dateCreated', label: 'Date Created', align: 'left' },
        { key: 'duration', label: 'Duration', align: 'left' },
        { key: 'summary', label: 'Summary', align: 'left' },
        { key: 'actions', label: 'Actions', align: 'center' }
    ];

    // Custom cell renderer
    const renderCell = (column, rowData, index) => {
        if (column.key === 'id') {
            const globalIndex = (currentPage - 1) * pageSize + index;
            const serialNumber = voiceNotes.length - globalIndex;
            return serialNumber;
        }

        if (column.key === 'patient') {
            return rowData.patients?.name || '-';
        }

        if (column.key === 'doctor') {
            return rowData.doctors?.name || '-';
        }

        if (column.key === 'dateCreated') {
            return formatDate(rowData.date_created || rowData.created_at);
        }

        if (column.key === 'duration') {
            return formatDuration(rowData.duration_seconds);
        }

        if (column.key === 'summary') {
            return (
                <button
                    type="button"
                    className="voice-notes-link"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/voice-notes/${rowData.id}`);
                    }}
                >
                    Click to view
                </button>
            );
        }

        if (column.key === 'actions') {
            return (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="btn-text"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(rowData);
                        }}
                    >
                        <i className="fas fa-trash" />
                    </button>
                </div>
            );
        }

        return rowData[column.key] || '-';
    };

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
                <Table
                    columns={columns}
                    data={paginatedNotes}
                    loading={isLoading}
                    renderCell={renderCell}
                    pagination={{
                        enabled: true,
                        currentPage: currentPage,
                        totalPages: totalPages,
                        totalItems: voiceNotes.length,
                        pageSize,
                        onPageChange: (page) => setCurrentPage(page),
                        onPageSizeChange: (newPageSize) => {
                            setPageSize(newPageSize);
                            setCurrentPage(1);
                        }
                    }}
                    emptyState={{
                        icon: 'fas fa-microphone',
                        title: 'No voice notes yet',
                        description: 'Create a new voice note to get started.',
                        action: {
                            icon: 'fas fa-plus',
                            label: 'Add Note',
                            onClick: handleAddNew
                        }
                    }}
                />
            </div>

            {noteToDelete && (
                <div className="voice-notes-confirm-overlay">
                    <div className="voice-notes-confirm-modal">
                        <h3>Delete voice note?</h3>
                        <p>
                            Are you sure you want to delete this voice note for{' '}
                            <strong>{noteToDelete.patients?.name || 'this patient'}</strong>? This
                            action cannot be undone.
                        </p>
                        <div className="voice-notes-confirm-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleCancelDelete}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-save"
                                onClick={handleConfirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceNotesPage;
