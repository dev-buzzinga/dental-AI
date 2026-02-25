import { useState, useEffect, useRef, useCallback } from 'react';
import { dialpadKeys } from '../../data/dummyData';
import { SearchInput } from '../common/SearchInput';
import './VoipWidget.css';

const VoipWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('incoming');
    const [callSeconds, setCallSeconds] = useState(0);
    const [isCallActive, setIsCallActive] = useState(false);
    const [dialInput, setDialInput] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);
    const [controls, setControls] = useState({ mute: false, hold: false, record: false });
    const [searchTerm, setSearchTerm] = useState('');
    const timerRef = useRef(null);

    const startTimer = useCallback((reset = true) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (reset) setCallSeconds(0);
        setIsCallActive(true);
        timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsCallActive(false);
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const formatTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const answerCall = () => { startTimer(true); setActiveTab('active'); };
    const startCall = () => { startTimer(true); setActiveTab('active'); };
    const endCall = () => { stopTimer(); setActiveTab('incoming'); };

    const toggleControl = (key) => setControls((prev) => ({ ...prev, [key]: !prev[key] }));

    const searchResults = searchTerm.length > 0
        ? [{ name: 'Tim Johnson', number: '+61421671766', initials: 'TJ' }].filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    if (!isOpen) {
        return (
            <div className="voip-fab" onClick={() => setIsOpen(true)}>
                <div className="voip-fab-btn">
                    <i className="fas fa-phone" />
                    <span>VoIP</span>
                    <div className="voip-fab-badge">2</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`voip-widget ${isOpen ? 'open' : 'closed'}`}>
            {/* Header */}
            <div className="voip-header">
                <span>DENTALAIASSIST</span>
                <button onClick={() => setIsOpen(false)}><i className="fas fa-minus" /></button>
            </div>

            {/* Tabs */}
            <div className="voip-tabs">
                {['incoming', 'active', 'dialpad'].map((tab) => (
                    <button
                        key={tab}
                        className={`voip-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'incoming' ? 'Incoming' : tab === 'active' ? 'Active Call' : 'Dialpad'}
                    </button>
                ))}
            </div>

            {/* Incoming Tab */}
            {activeTab === 'incoming' && (
                <div className="fade-in">
                    <div className="voip-incoming-header">
                        <div className="left">
                            <i className="fas fa-phone-volume animate-pulse-custom" style={{ color: '#fff' }} />
                            <span style={{ color: '#fff', fontWeight: 700 }}>Incoming Call</span>
                        </div>
                        <button onClick={() => setActiveTab('dialpad')} style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <i className="fas fa-xmark" />
                        </button>
                    </div>
                    <div className="voip-caller-info">
                        <div className="voip-avatar">TJ</div>
                        <div className="voip-caller-name">Tim Johnson</div>
                        <div className="voip-caller-badge">Existing Patient</div>
                    </div>
                    <div className="voip-patient-stats">
                        <div>
                            <p className="voip-stat-label">Next Appt</p>
                            <p className="voip-stat-value">Feb 24</p>
                        </div>
                        <div className="voip-stat-divider">
                            <p className="voip-stat-label">Last Visit</p>
                            <p className="voip-stat-value">Jan 10</p>
                        </div>
                        <div>
                            <p className="voip-stat-label">Balance</p>
                            <p className="voip-stat-value">$120</p>
                        </div>
                    </div>
                    <div className="voip-actions">
                        <button className="voip-btn voip-btn-answer" onClick={answerCall}>
                            <i className="fas fa-phone" /> Answer
                        </button>
                        <button className="voip-btn voip-btn-decline" onClick={() => setActiveTab('dialpad')}>
                            <i className="fas fa-phone-slash" /> Decline
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call Tab */}
            {activeTab === 'active' && (
                <div className="fade-in">
                    <div className="voip-active-header">
                        <div className="left">
                            <div className="voip-active-dot animate-pulse-custom" />
                            <span className="voip-active-name">Tim Johnson</span>
                        </div>
                        <span className="voip-timer">{formatTime(callSeconds)}</span>
                    </div>
                    <div className="voip-call-info">
                        <div className="voip-call-info-row">
                            <span className="voip-call-info-label">Appt Type</span>
                            <span className="voip-call-info-value">General Checkup</span>
                        </div>
                        <div className="voip-call-info-doctor">
                            <div className="voip-doctor-avatar">R</div>
                            <span style={{ fontSize: 12 }}>Dr. Rama</span>
                        </div>
                    </div>
                    <div className="voip-controls">
                        <button className={`voip-control-btn ${controls.mute ? 'active' : ''}`} onClick={() => toggleControl('mute')}>
                            <i className="fas fa-microphone-slash" />
                        </button>
                        <button className={`voip-control-btn ${controls.hold ? 'active' : ''}`} onClick={() => toggleControl('hold')}>
                            <i className="fas fa-pause" />
                        </button>
                        <button className="voip-control-btn"><i className="fas fa-right-left" /></button>
                        <button className={`voip-control-btn ${controls.record ? 'active' : ''}`} onClick={() => toggleControl('record')}>
                            <i className="fas fa-circle-dot" />
                        </button>
                        <button className={`voip-control-btn ${noteOpen ? 'active' : ''}`} onClick={() => setNoteOpen(!noteOpen)}>
                            <i className="fas fa-note-sticky" />
                        </button>
                    </div>
                    <div className="voip-note-section" style={{ maxHeight: noteOpen ? 100 : 0 }}>
                        <div style={{ padding: '8px 0' }}>
                            <textarea className="voip-note-textarea" rows="2" placeholder="Type notes..." />
                        </div>
                    </div>
                    <div className="voip-actions">
                        <button className="voip-btn voip-btn-end" onClick={endCall}>
                            <i className="fas fa-phone-slash" /> End Call
                        </button>
                    </div>
                </div>
            )}

            {/* Dialpad Tab */}
            {activeTab === 'dialpad' && (
                <div className="fade-in">
                    <div className="voip-dialpad-header"><span>Dialpad</span></div>
                    <div className="voip-dialpad-search" style={{ position: 'relative' }}>
                        <SearchInput
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(v) => { setSearchTerm(v); setDialInput(v); }}
                        />
                        {searchResults.length > 0 && (
                            <div className="voip-search-results">
                                {searchResults.map((p) => (
                                    <div key={p.number} className="voip-search-result" onClick={() => {
                                        setDialInput(p.number);
                                        setSearchTerm('');
                                    }}>
                                        <div style={{ width: 32, height: 32, background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                            {p.initials}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.number}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="voip-dialpad-grid">
                        {dialpadKeys.map(([digit, letters]) => (
                            <button key={digit} className="voip-dial-key" onClick={() => setDialInput((v) => v + digit)}>
                                <span className="digit">{digit}</span>
                                <span className="letters">{letters}</span>
                            </button>
                        ))}
                    </div>
                    <div className="voip-call-fab">
                        <button onClick={startCall}><i className="fas fa-phone" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoipWidget;
