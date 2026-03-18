import { useState, useMemo, useEffect, useRef } from 'react';
import { SearchInput } from '../../components/common/SearchInput';
import outgoing from '../../service/outgoing';
import '../../styles/Calls.css';

const waveformHeights = Array.from({ length: 80 }, () => Math.floor(Math.random() * 40) + 8);

// Get initials from patient name (e.g. "due john" -> "DJ")
const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    return name.trim().split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2) || '?';
};

// Format duration from started_at and ended_at, or return formatted duration string
const getDisplayDuration = (call) => {
    if (!call) return '0:00';
    const started = call.started_at ? new Date(call.started_at.trim()).getTime() : null;
    const ended = call.ended_at ? new Date(String(call.ended_at).replace(/"/g, '').trim()).getTime() : null;
    if (started && ended && !isNaN(started) && !isNaN(ended)) {
        const secs = Math.max(0, Math.floor((ended - started) / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    // Fallback: if API sends duration as seconds number or "MM:SS" string
    if (typeof call.duration === 'number') {
        const m = Math.floor(call.duration / 60);
        const s = call.duration % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (typeof call.duration === 'string' && /^\d+:\d+/.test(call.duration)) return call.duration;
    return '0:00';
};

// Format date for display (e.g. "16 Mar 2026 04:56:19 +0000" -> "Mar 16, 2026 • 04:56 AM")
const formatCallDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(String(dateStr).replace(/"/g, '').trim());
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CallsPage = () => {
    const [calls, setCalls] = useState([]);
    const [callsLoading, setCallsLoading] = useState(true);
    const [activeCallId, setActiveCallId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [callDetail, setCallDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                setCallsLoading(true);
                const res = await outgoing.getCallLogs();
                const data = res?.data;
                if (data?.success && Array.isArray(data?.data)) {
                    setCalls(data.data);
                    if (data.data.length > 0) {
                        setActiveCallId(data.data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to load calls:', err);
            } finally {
                setCallsLoading(false);
            }
        };

        fetchCalls();
    }, []);

    const filteredCalls = useMemo(() =>
        calls.filter((c) => {
            const name = (c.patients_name || '').toLowerCase();
            const from = (c.from_number || '');
            const to = (c.to_number || '');
            const term = searchTerm.toLowerCase();
            return name.includes(term) || from.includes(searchTerm) || to.includes(searchTerm);
        }), [calls, searchTerm]);

    const activeCall = filteredCalls.find((c) => c.id === activeCallId) || filteredCalls[0];

    // Reset audio URL when call changes
    useEffect(() => {
        setAudioUrl(null);
    }, [activeCall?.call_sid]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!activeCall?.call_sid) {
                setCallDetail(null);
                return;
            }
            setDetailLoading(true);
            try {
                const res = await outgoing.getCallDetail(activeCall.call_sid);
                const data = res?.data;
                if (data?.success && data?.data) {
                    setCallDetail(data.data);
                } else {
                    setCallDetail(null);
                }
            } catch (err) {
                console.error('Failed to load call detail:', err);
                setCallDetail(null);
            } finally {
                setDetailLoading(false);
            }
        };
        fetchDetail();
    }, [activeCall?.call_sid]);

    const panelCall = callDetail || activeCall;

    // Fetch recording as blob via axios so auth headers are included.
    useEffect(() => {
        let cancelled = false;
        let nextObjectUrl = null;

        const run = async () => {
            const streamUrl = callDetail?.recording?.stream_url;
            if (!streamUrl) return;

            try {
                const res = await outgoing.getRecording(streamUrl);
                const blob = new Blob([res.data], { type: "audio/mpeg" });
                nextObjectUrl = URL.createObjectURL(blob);
                if (!cancelled) {
                    setAudioUrl(nextObjectUrl);
                } else {
                    URL.revokeObjectURL(nextObjectUrl);
                }
            } catch (err) {
                console.error("Failed to load recording audio:", err);
                if (!cancelled) setAudioUrl(null);
            }
        };

        run();

        return () => {
            cancelled = true;
            if (nextObjectUrl) {
                URL.revokeObjectURL(nextObjectUrl);
            }
        };
    }, [callDetail?.recording?.stream_url]);

    // Revoke previous blob URL when audioUrl changes/unmounts (avoid leaks)
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const formatTranscriptTime = (seconds) => {
        const n = Number(seconds);
        if (!isFinite(n) || n < 0) return '';
        const s = Math.floor(n);
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return `${m}:${rem.toString().padStart(2, '0')}`;
    };

    // Reset audio player when call changes
    useEffect(() => {
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [activeCall?.call_sid]);

    // Toggle play/pause
    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="calls-page">
            {/* Left Panel */}
            <div className="calls-sidebar">
                <div className="calls-sidebar-header">
                    <h2 className="calls-sidebar-title">Recent Calls</h2>
                    <SearchInput placeholder="Search calls..." value={searchTerm} onChange={setSearchTerm} />
                </div>
                <div className="calls-list custom-scrollbar">
                    {callsLoading ? (
                        <div className="calls-loader">
                            <i className="fas fa-spinner fa-spin" />
                            <span>Loading calls…</span>
                        </div>
                    ) : filteredCalls.length === 0 ? (
                        <div className="calls-list-empty">
                            <div className="calls-list-empty-icon">
                                <i className="fas fa-phone-slash" />
                            </div>
                            <div className="calls-list-empty-title">
                                {searchTerm ? 'No matching calls' : 'No calls yet'}
                            </div>
                            <div className="calls-list-empty-subtitle">
                                {searchTerm ? 'Try a different search.' : 'When calls are made, they’ll show up here.'}
                            </div>
                        </div>
                    ) : (
                        filteredCalls.map((call) => (
                            <div
                                key={call.id}
                                className={`call-row ${activeCallId === call.id ? 'active' : ''}`}
                                onClick={() => setActiveCallId(call.id)}
                            >
                                <div className="call-avatar">{getInitials(call.patients_name)}</div>
                                <div className="call-meta">
                                    <div className="call-name">{call.patients_name || 'Unknown'}</div>
                                    <div className="call-number">{call.to_number || call.from_number || '—'}</div>
                                </div>
                                <div className="call-badge">
                                    {formatCallDate(call.created_at || call.started_at)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel */}
            {callsLoading ? (
                <div className="call-detail-empty">
                    <div className="calls-loader">
                        <i className="fas fa-spinner fa-spin" />
                        <span>Loading…</span>
                    </div>
                </div>
            ) : activeCall ? (
                <div className="call-detail custom-scrollbar">
                    {/* Header */}
                    <div className="call-detail-header">
                        <div className="call-detail-caller">
                            <div className="call-detail-avatar">{getInitials(panelCall?.patients_name)}</div>
                            <div>
                                <div className="call-detail-name">{panelCall?.patients_name || 'Unknown'}</div>
                                <div className="call-detail-phone">{panelCall?.to_number || panelCall?.from_number || '—'}</div>
                            </div>
                        </div>
                        <div className="call-detail-actions">
                            <div className="call-action-btn"><i className="fas fa-phone" /></div>
                            <div className="call-action-btn"><i className="fas fa-message" /></div>
                            <div className="call-action-btn"><i className="fas fa-ellipsis-vertical" /></div>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="call-status-bar">
                        <div className="call-status-item">
                            <i className="fas fa-circle-check" style={{ color: 'var(--success)' }} />
                            <span className="call-status-pill pill-completed">{panelCall?.status || 'Completed'}</span>
                        </div>
                        <div className="call-status-item">
                            <i className="fas fa-phone-volume" style={{ color: 'var(--primary)' }} />
                            <span className="call-status-pill pill-inbound">
                                {panelCall?.direction === 'outbound-dial' ? 'Outbound' : panelCall?.direction || 'Call'}
                            </span>
                        </div>
                        {/* <div className="call-status-item">
                            <i className="far fa-clock" style={{ color: 'var(--text-secondary)' }} />
                            <span>{(panelCall.duration)}</span>
                        </div> */}
                        <div className="call-status-item">
                            <i className="far fa-calendar" style={{ color: 'var(--text-secondary)' }} />
                            <span>{formatCallDate(panelCall?.date || panelCall?.created_at || panelCall?.started_at)}</span>
                        </div>
                    </div>

                    {/* Waveform */}
                    <div className="call-waveform-card">
                        <div className="call-waveform-title">Call Recording</div>
                        <div className="call-waveform-container">
                            <div
                                className="call-waveform-play"
                                onClick={handlePlayPause}
                                style={{ cursor: panelCall?.recording?.stream_url ? 'pointer' : 'default' }}
                            >
                                <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`} style={{ fontSize: 14 }} />
                            </div>
                            <div className="call-waveform-bars">
                                {waveformHeights.map((h, i) => (
                                    <div key={i} className="waveform-bar-el" style={{ height: h, background: i < 30 ? 'var(--primary)' : '#E5E7EB' }} />
                                ))}
                            </div>
                        </div>
                        {detailLoading ? (
                            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Loading recording…</div>
                        ) : panelCall?.recording?.stream_url ? (
                            <audio
                                ref={audioRef}
                                style={{ width: '100%', marginTop: 10 }}
                                controls
                                src={audioUrl || undefined}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        ) : (
                            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>No recording available</div>
                        )}
                        {!detailLoading && panelCall?.recording?.stream_url && !audioUrl ? (
                            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Loading audio…</div>
                        ) : null}
                    </div>

                    {/* AI Summary */}
                    <div className="call-summary-card">
                        <div className="call-summary-title"><i className="fas fa-robot" /> AI Call Summary</div>
                        <div className="call-summary-text">
                            {panelCall?.aiSummary || 'No summary available'}
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="call-transcript-card">
                        <div className="call-transcript-title"><i className="fas fa-file-lines" style={{ color: 'var(--primary)' }} /> Full Transcript</div>
                        {detailLoading ? (
                            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Loading transcript…</div>
                        ) : Array.isArray(panelCall?.transcript) && panelCall.transcript.length > 0 ? (
                            panelCall.transcript.map((line, i) => {
                                const role = line.speaker || 'Speaker';
                                const isAgent = String(role).toLowerCase() === 'agent';
                                const color = isAgent ? '#7C3AED' : '#6B7280';
                                const initials = isAgent ? 'AG' : getInitials(panelCall?.patients_name);
                                return (
                                    <div key={i} className="transcript-line">
                                        <div className="transcript-avatar" style={{ background: color }}>{initials}</div>
                                        <div className="transcript-content">
                                            <span className="transcript-name">{role}</span>
                                            <span className="transcript-time">{formatTranscriptTime(line.timestamp)}</span>
                                            <p className="transcript-text">{line.text || ''}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>No transcript available</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="call-detail-empty">Select a call to view details</div>
            )
            }
        </div >
    );
};

export default CallsPage;
