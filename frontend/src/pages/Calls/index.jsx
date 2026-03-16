import { useState, useMemo, useEffect } from 'react';
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
    const [activeCallId, setActiveCallId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCalls = async () => {
            try {
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

    return (
        <div className="calls-page">
            {/* Left Panel */}
            <div className="calls-sidebar">
                <div className="calls-sidebar-header">
                    <h2 className="calls-sidebar-title">Recent Calls</h2>
                    <SearchInput placeholder="Search calls..." value={searchTerm} onChange={setSearchTerm} />
                </div>
                <div className="calls-list custom-scrollbar">
                    {filteredCalls.map((call) => (
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
                                <i className="fas fa-circle" />
                                {/* {getDisplayDuration(call)} */}
                                {formatCallDate(call.created_at || call.started_at)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel */}
            {activeCall ? (
                <div className="call-detail custom-scrollbar">
                    {/* Header */}
                    <div className="call-detail-header">
                        <div className="call-detail-caller">
                            <div className="call-detail-avatar">{getInitials(activeCall.patients_name)}</div>
                            <div>
                                <div className="call-detail-name">{activeCall.patients_name || 'Unknown'}</div>
                                <div className="call-detail-phone">{activeCall.to_number || activeCall.from_number || '—'}</div>
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
                            <span className="call-status-pill pill-completed">{activeCall.status || 'Completed'}</span>
                        </div>
                        <div className="call-status-item">
                            <i className="fas fa-phone-volume" style={{ color: 'var(--primary)' }} />
                            <span className="call-status-pill pill-inbound">
                                {activeCall.direction === 'outbound-dial' ? 'Outbound' : activeCall.direction || 'Call'}
                            </span>
                        </div>
                        <div className="call-status-item">
                            <i className="far fa-clock" style={{ color: 'var(--text-secondary)' }} />
                            <span>{getDisplayDuration(activeCall)}</span>
                        </div>
                        <div className="call-status-item">
                            <i className="far fa-calendar" style={{ color: 'var(--text-secondary)' }} />
                            <span>{formatCallDate(activeCall.created_at || activeCall.started_at)}</span>
                        </div>
                    </div>

                    {/* Waveform */}
                    <div className="call-waveform-card">
                        <div className="call-waveform-title">Call Recording</div>
                        <div className="call-waveform-container">
                            <div className="call-waveform-play"><i className="fas fa-play" style={{ fontSize: 14 }} /></div>
                            <div className="call-waveform-bars">
                                {waveformHeights.map((h, i) => (
                                    <div key={i} className="waveform-bar-el" style={{ height: h, background: i < 30 ? 'var(--primary)' : '#E5E7EB' }} />
                                ))}
                            </div>
                            <span className="call-waveform-time">0:00 / {getDisplayDuration(activeCall)}</span>
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="call-summary-card">
                        <div className="call-summary-title"><i className="fas fa-robot" /> AI Call Summary</div>
                        <div className="call-summary-text">
                            <p>Patient <strong>{activeCall.patients_name || 'Unknown'}</strong> called to reschedule their upcoming dental cleaning. Key points discussed:</p>
                            <ul>
                                <li>Original appointment was Feb 20 at 2:00 PM</li>
                                <li>Rescheduled to <span className="highlight-blue">Feb 24 at 10:00 AM</span></li>
                                <li>Patient asked about teeth whitening options</li>
                                <li>Front desk confirmed the change and sent a new reminder</li>
                            </ul>
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="call-transcript-card">
                        <div className="call-transcript-title"><i className="fas fa-file-lines" style={{ color: 'var(--primary)' }} /> Full Transcript</div>
                        {[
                            { role: 'Receptionist', text: "Good morning, Smile Dental — this is Jake speaking. How can I help you today?", time: '0:00', color: '#7C3AED', initials: 'JR' },
                            { role: activeCall.patients_name || 'Patient', text: "Hi Jake — I need to reschedule my cleaning next Thursday. Something came up at work.", time: '0:08', color: '#6B7280', initials: getInitials(activeCall.patients_name) },
                            { role: 'Receptionist', text: "Of course! Let me pull up your file. Looks like you're booked for Feb 20 at 2 PM with Dr. Rama. When works better for you?", time: '0:18', color: '#7C3AED', initials: 'JR' },
                            { role: activeCall.patients_name || 'Patient', text: "Could I do a morning appointment the following Monday — Feb 24?", time: '0:33', color: '#6B7280', initials: getInitials(activeCall.patients_name) },
                            { role: 'Receptionist', text: "We've got 10 AM or 11:30 AM available that day. Which works best?", time: '0:41', color: '#7C3AED', initials: 'JR' },
                            { role: activeCall.patients_name || 'Patient', text: "10 AM is perfect. Also, I've been thinking about teeth whitening — do you guys do that?", time: '0:52', color: '#6B7280', initials: getInitials(activeCall.patients_name) },
                        ].map((line, i) => (
                            <div key={i} className="transcript-line">
                                <div className="transcript-avatar" style={{ background: line.color }}>{line.initials}</div>
                                <div className="transcript-content">
                                    <span className="transcript-name">{line.role}</span>
                                    <span className="transcript-time">{line.time}</span>
                                    <p className="transcript-text">{line.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="call-detail-empty">Select a call to view details</div>
            )}
        </div>
    );
};

export default CallsPage;
