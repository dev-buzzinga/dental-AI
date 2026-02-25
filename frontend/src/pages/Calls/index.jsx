import { useState, useMemo } from 'react';
import { callLog } from '../../data/dummyData';
import { SearchInput } from '../../components/common/SearchInput';
import '../../styles/Calls.css';

const waveformHeights = Array.from({ length: 80 }, () => Math.floor(Math.random() * 40) + 8);

const CallsPage = () => {
    const [activeCallId, setActiveCallId] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCalls = useMemo(() =>
        callLog.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.number.includes(searchTerm)
        ), [searchTerm]);

    const activeCall = callLog.find((c) => c.id === activeCallId);

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
                            <div className="call-avatar">{call.initials}</div>
                            <div className="call-meta">
                                <div className="call-name">{call.name}</div>
                                <div className="call-number">{call.number}</div>
                            </div>
                            <div className="call-badge">
                                <i className="fas fa-circle" />
                                {call.duration}
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
                            <div className="call-detail-avatar">{activeCall.initials}</div>
                            <div>
                                <div className="call-detail-name">{activeCall.name}</div>
                                <div className="call-detail-phone">{activeCall.number}</div>
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
                            <span className="call-status-pill pill-completed">Completed</span>
                        </div>
                        <div className="call-status-item">
                            <i className="fas fa-phone-volume" style={{ color: 'var(--primary)' }} />
                            <span className="call-status-pill pill-inbound">Inbound</span>
                        </div>
                        <div className="call-status-item">
                            <i className="far fa-clock" style={{ color: 'var(--text-secondary)' }} />
                            <span>{activeCall.duration}</span>
                        </div>
                        <div className="call-status-item">
                            <i className="far fa-calendar" style={{ color: 'var(--text-secondary)' }} />
                            <span>Feb 19, 2026 • 10:32 AM</span>
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
                            <span className="call-waveform-time">02:34 / {activeCall.duration}</span>
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="call-summary-card">
                        <div className="call-summary-title"><i className="fas fa-robot" /> AI Call Summary</div>
                        <div className="call-summary-text">
                            <p>Patient <strong>{activeCall.name}</strong> called to reschedule their upcoming dental cleaning. Key points discussed:</p>
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
                            { role: activeCall.name, text: "Hi Jake — I need to reschedule my cleaning next Thursday. Something came up at work.", time: '0:08', color: '#6B7280', initials: activeCall.initials },
                            { role: 'Receptionist', text: "Of course! Let me pull up your file. Looks like you're booked for Feb 20 at 2 PM with Dr. Rama. When works better for you?", time: '0:18', color: '#7C3AED', initials: 'JR' },
                            { role: activeCall.name, text: "Could I do a morning appointment the following Monday — Feb 24?", time: '0:33', color: '#6B7280', initials: activeCall.initials },
                            { role: 'Receptionist', text: "We've got 10 AM or 11:30 AM available that day. Which works best?", time: '0:41', color: '#7C3AED', initials: 'JR' },
                            { role: activeCall.name, text: "10 AM is perfect. Also, I've been thinking about teeth whitening — do you guys do that?", time: '0:52', color: '#6B7280', initials: activeCall.initials },
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
