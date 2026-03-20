import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import '../../styles/VoiceNotes.css';
import aiScribeService from '../../service/ai-scribe';
import ReactMarkdown from 'react-markdown';
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

const renderMarkdownToPdf = (doc, markdown = '') => {
    const marginLeft = 40;
    const marginTop = 40;
    const maxWidth = 515;
    const baseLineHeight = 18;
    const pageBottom = 800;
    const normalized = markdown.replace(/\r\n/g, '\n');
    let cursorY = marginTop;

    const ensurePageSpace = (requiredHeight = baseLineHeight) => {
        if (cursorY + requiredHeight > pageBottom) {
            doc.addPage();
            cursorY = marginTop;
        }
    };

    const parseBoldSegments = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        return parts.map((part) => ({
            text: part.startsWith('**') && part.endsWith('**') ? part.slice(2, -2) : part,
            isBold: part.startsWith('**') && part.endsWith('**'),
        }));
    };

    const stripInlineMarkdown = (text) => text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1');

    const drawInlineText = (lineText, { fontSize = 12, forceBold = false, indent = 0 } = {}) => {
        const left = marginLeft + indent;
        const right = marginLeft + maxWidth;
        const lineHeight = fontSize >= 16 ? fontSize + 6 : baseLineHeight;
        let x = left;

        doc.setFontSize(fontSize);

        const segments = forceBold
            ? [{ text: stripInlineMarkdown(lineText), isBold: true }]
            : parseBoldSegments(lineText);
        segments.forEach((segment) => {
            const tokens = segment.text.split(/(\s+)/).filter((t) => t !== '');
            tokens.forEach((token) => {
                doc.setFont('helvetica', segment.isBold ? 'bold' : 'normal');
                const tokenWidth = doc.getTextWidth(token);
                if (x + tokenWidth > right && token.trim()) {
                    cursorY += lineHeight;
                    ensurePageSpace(lineHeight);
                    x = left;
                }
                doc.text(token, x, cursorY);
                x += tokenWidth;
            });
        });

        cursorY += lineHeight;
    };

    normalized.split('\n').forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
            ensurePageSpace(baseLineHeight);
            cursorY += Math.floor(baseLineHeight * 0.7);
            return;
        }

        if (/^[-*_]{3,}$/.test(line)) {
            ensurePageSpace(baseLineHeight);
            doc.setDrawColor(180);
            doc.line(marginLeft, cursorY, marginLeft + maxWidth, cursorY);
            cursorY += baseLineHeight;
            return;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            const headingSizeMap = { 1: 20, 2: 18, 3: 16, 4: 14, 5: 13, 6: 12 };
            ensurePageSpace(baseLineHeight + 6);
            drawInlineText(headingText, { fontSize: headingSizeMap[level], forceBold: true });
            return;
        }

        const listMatch = line.match(/^[-*]\s+(.*)$/);
        if (listMatch) {
            ensurePageSpace(baseLineHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('•', marginLeft, cursorY);
            drawInlineText(listMatch[1], { fontSize: 12, indent: 12 });
            return;
        }

        ensurePageSpace(baseLineHeight);
        drawInlineText(line, { fontSize: 12 });
    });
};

const VoiceNoteDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const showToast = useToast();

    const [note, setNote] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!id) return;

        const fetchNote = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await aiScribeService.getAiScribeById(id);
                const data = response.data?.data;
                setNote(data || null);
                if (!data) {
                    setError('Voice note not found.');
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error fetching voice note:', err);
                setError('Failed to load voice note.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNote();
    }, [id]);

    const handleBack = () => {
        navigate('/voice-notes');
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    const handleDownloadRecording = async (event) => {
        event.preventDefault();
        const recordingUrl = note?.user_recording_url;
        if (!recordingUrl) return;

        try {
            const response = await fetch(recordingUrl);
            if (!response.ok) {
                throw new Error('Unable to download recording.');
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = 'voice-note-recording.webm';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        } catch (downloadError) {
            setError('Failed to download recording. Please try again.');
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || Number.isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopySummary = async () => {
        const summary = note?.ai_summary;
        if (!summary) {
            showToast('No AI summary to copy.', 'error');
            return;
        }
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(summary);
                showToast('Copied to clipboard!', 'success');
            } else {
                showToast('Copy not supported in this browser.', 'error');
            }
        } catch {
            showToast('Failed to copy. Please try again.', 'error');
        }
    };

    const handleExportPdf = () => {
        const summary = note?.ai_summary;
        if (!summary) {
            showToast('No AI summary to export.', 'error');
            return;
        }

        try {
            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4',
            });

            renderMarkdownToPdf(doc, summary);

            const fileName = `dental-summary-${note?.date_created || note?.created_at || 'note'}.pdf`;
            doc.save(fileName);
            // showToast('PDF downloaded successfully.', 'success');
        } catch (pdfError) {
            showToast('Failed to export PDF. Please try again.', 'error');
        }
    };

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <button
                        type="button"
                        className="patient-detail-back"
                        onClick={handleBack}
                    >
                        <i className="fas fa-arrow-left" />
                    </button>
                    <h2 className="voice-notes-title">Voice Note Details</h2>
                </div>
            </div>

            <div className="voice-notes-content">
                {isLoading && (
                    <div className="voice-notes-empty-state">
                        <i className="fas fa-spinner fa-spin" />
                        <h3>Loading voice note...</h3>
                    </div>
                )}

                {!isLoading && error && (
                    <div className="voice-notes-empty-state">
                        <i className="fas fa-exclamation-circle" />
                        <h3>{error}</h3>
                        <button
                            type="button"
                            className="btn-outline"
                            onClick={handleBack}
                        >
                            Back to list
                        </button>
                    </div>
                )}

                {!isLoading && !error && note && (
                    <div className="voice-notes-modal">
                        <div className="voice-notes-modal-body">
                            {/* Top Info Row */}
                            <div className="voice-notes-top-row">
                                <div className="voice-notes-field">
                                    <label>Patient Name</label>
                                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#F9FAFB' }}>
                                        {note.patients?.name || '-'}
                                    </div>
                                </div>
                                <div className="voice-notes-field">
                                    <label>Doctor Name</label>
                                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#F9FAFB' }}>
                                        {note.doctors?.name || '-'}
                                    </div>
                                </div>
                                <div className="voice-notes-field">
                                    <label>Date Created</label>
                                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#F9FAFB' }}>
                                        {formatDate(note.date_created || note.created_at)}
                                    </div>
                                </div>
                                <div className="voice-notes-field">
                                    <label>Duration</label>
                                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#F9FAFB' }}>
                                        {formatDuration(note.duration_seconds)}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {note.description && (
                                <div className="voice-notes-description">
                                    <div className="voice-notes-field">
                                        <label>Description</label>
                                        <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#F9FAFB', minHeight: '60px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {note.description}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Audio Player and Transcript/Summary Grid */}
                            <div className="voice-notes-main-grid">
                                {/* Left Panel - Audio Player + Transcript */}
                                <div className="voice-panel">
                                    <div className="voice-panel-header">
                                        <div className="voice-panel-title">
                                            <i className="fas fa-wave-square" />
                                            <span>Recording & Transcript</span>
                                        </div>
                                    </div>
                                    <div className="voice-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Audio Player */}
                                        {!note.user_recording_url && (
                                            <div style={{
                                                background: '#FEF2F2',
                                                border: '1px dashed #DC2626',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                color: '#DC2626',
                                                fontSize: '13px'
                                            }}>
                                                <i className="fas fa-exclamation-triangle" />
                                                <span>No audio recording available</span>
                                            </div>
                                        )}
                                        
                                        {note.user_recording_url && (
                                            <div style={{
                                                background: '#fff',
                                                border: '1px solid var(--border)',
                                                borderRadius: '10px',
                                                padding: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}>
                                                    <button
                                                        type="button"
                                                        onClick={handlePlayPause}
                                                        style={{
                                                            background: 'var(--primary)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                                                    >
                                                        <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} />
                                                    </button>
                                                    
                                                    <div style={{ flex: 1 }}>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={note.duration_seconds || 0}
                                                            value={currentTime}
                                                            onChange={(e) => {
                                                                const time = parseFloat(e.target.value);
                                                                setCurrentTime(time);
                                                                if (audioRef.current) {
                                                                    audioRef.current.currentTime = time;
                                                                }
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                height: '4px',
                                                                cursor: 'pointer',
                                                                accentColor: 'var(--primary)'
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: 'var(--text-secondary)',
                                                        minWidth: '50px',
                                                        textAlign: 'right'
                                                    }}>
                                                        {formatTime(currentTime)} / {formatTime(note.duration_seconds)}
                                                    </div>
                                                    
                                                    <a
                                                        href={note.user_recording_url}
                                                        download="voice-note-recording.webm"
                                                        onClick={handleDownloadRecording}
                                                        style={{
                                                            background: '#F3F4F6',
                                                            color: 'var(--text-secondary)',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '36px',
                                                            height: '36px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            textDecoration: 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Download Recording"
                                                        onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                                                        onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                                                    >
                                                        <i className="fas fa-download" />
                                                    </a>
                                                </div>
                                                
                                                <audio
                                                    ref={audioRef}
                                                    src={note.user_recording_url}
                                                    onTimeUpdate={handleTimeUpdate}
                                                    onLoadedMetadata={handleLoadedMetadata}
                                                    onEnded={handleEnded}
                                                    onError={(e) => {
                                                        // console.error('🚨 Audio loading error:', e);
                                                        // console.error('  URL:', note.user_recording_url);
                                                        // console.error('  Error code:', e.target.error?.code);
                                                        // console.error('  Error message:', e.target.error?.message);
                                                    }}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>
                                        )}

                                        {/* Transcript */}
                                        {note.live_transcript && (
                                            <div style={{
                                                background: '#F9FAFB',
                                                border: '1px dashed var(--border)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                minHeight: '120px',
                                                overflowY: 'auto',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                lineHeight: '1.5'
                                            }}>
                                                {note.live_transcript}
                                            </div>
                                        )}

                                        {!note.live_transcript && (
                                            <div style={{
                                                background: '#F9FAFB',
                                                border: '1px dashed var(--border)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                fontSize: '13px',
                                                color: 'var(--text-secondary)',
                                                minHeight: '120px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                No transcript available
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel - AI Summary */}
                                <div className="voice-panel">
                                    <div className="voice-panel-header">
                                        <div className="voice-panel-title">
                                            <i className="fas fa-robot" />
                                            <span>AI Summary</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="btn-outline"
                                                onClick={handleCopySummary}
                                                disabled={!note.ai_summary}
                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                            >
                                                <i className="fas fa-copy" /> Copy
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-outline"
                                                onClick={handleExportPdf}
                                                disabled={!note.ai_summary}
                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                            >
                                                <i className="fas fa-file-pdf" /> Export PDF
                                            </button>
                                        </div>
                                    </div>
                                    <div className="voice-panel-body">
                                        <div className="ai-summary-box">
                                            {note.ai_summary ? (
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
                                                        {note.ai_summary}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '13px'
                                                }}>
                                                    No AI summary available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceNoteDetailPage;

