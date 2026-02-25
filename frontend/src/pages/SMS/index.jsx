import { useState, useMemo } from 'react';
import { initialSmsData } from '../../data/dummyData';
import { SearchInput } from '../../components/common/SearchInput';
import { Toggle } from '../../components/common/SearchInput';
import './SMS.css';

const SMSPage = () => {
    const [activeSMSId, setActiveSMSId] = useState('EH');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [aiAutoReply, setAiAutoReply] = useState(true);
    const [showAISuggestion, setShowAISuggestion] = useState(true);
    const [showPatientContext, setShowPatientContext] = useState(false);
    const [messageInput, setMessageInput] = useState('');

    const filtered = useMemo(() => {
        let list = initialSmsData;
        if (filter === 'unread') list = list.filter((s) => s.unread > 0);
        if (filter === 'ai') list = list.filter((s) => s.ai);
        if (searchTerm) {
            list = list.filter((s) =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.number.includes(searchTerm)
            );
        }
        return list;
    }, [filter, searchTerm]);

    const activeSMS = initialSmsData.find((s) => s.id === activeSMSId);

    return (
        <div className="sms-page">
            {/* Left Panel */}
            <div className="sms-sidebar">
                <div className="sms-sidebar-header">
                    <div className="sms-sidebar-top">
                        <h2 className="sms-sidebar-title">SMS Inbox</h2>
                        <div className="sms-ai-toggle">
                            <span className="sms-ai-label">AI Auto-Reply</span>
                            <Toggle on={aiAutoReply} onToggle={() => setAiAutoReply(!aiAutoReply)} size="sm" />
                        </div>
                    </div>
                    <SearchInput placeholder="Search conversations..." value={searchTerm} onChange={setSearchTerm} />
                </div>

                <div className="sms-tabs">
                    {['all', 'unread', 'ai'].map((f) => (
                        <button
                            key={f}
                            className={`sms-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'AI Handled'}
                        </button>
                    ))}
                </div>

                <div className="sms-inbox-list custom-scrollbar">
                    {filtered.map((sms) => (
                        <div
                            key={sms.id}
                            className={`sms-row ${activeSMSId === sms.id ? 'active' : ''}`}
                            onClick={() => { setActiveSMSId(sms.id); }}
                        >
                            <div className="sms-avatar">{sms.initials}</div>
                            <div className="sms-meta">
                                <div className="sms-name-row">
                                    <span className="sms-name">
                                        {sms.name}
                                        {sms.ai && <span className="sms-ai-badge">AI</span>}
                                    </span>
                                    <span className="sms-time">{sms.time}</span>
                                </div>
                                <div className="sms-preview">{sms.preview}</div>
                            </div>
                            {sms.unread > 0 && <div className="sms-unread-dot" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Center - Chat */}
            {activeSMS ? (
                <div className="sms-chat">
                    <div className="sms-chat-header">
                        <div>
                            <div className="sms-chat-name">{activeSMS.name}</div>
                            <div className="sms-chat-number">{activeSMS.number}</div>
                        </div>
                        <div className="sms-chat-actions">
                            <button className="sms-chat-action-btn" onClick={() => setShowPatientContext(!showPatientContext)}>
                                <i className="fas fa-user" /> Patient Info
                            </button>
                            <button className="sms-chat-action-btn">
                                <i className="fas fa-phone" /> Call
                            </button>
                        </div>
                    </div>

                    <div className="sms-messages custom-scrollbar">
                        {activeSMS.messages.length > 0 ? (
                            activeSMS.messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`sms-bubble sms-bubble-${msg.type}`}
                                >
                                    {msg.type === 'ai' && (
                                        <div className="sms-bubble-label" style={{ color: 'var(--primary)' }}>
                                            <i className="fas fa-robot" /> AI Agent
                                        </div>
                                    )}
                                    {msg.type === 'staff' && (
                                        <div className="sms-bubble-label" style={{ color: 'var(--text-secondary)' }}>
                                            <i className="fas fa-headset" /> Staff
                                        </div>
                                    )}
                                    <div>{msg.text}</div>
                                    <div className="sms-bubble-time">{msg.time}</div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                                No conversation messages yet
                            </div>
                        )}
                    </div>

                    {showAISuggestion && activeSMS.messages.length > 0 && (
                        <div className="sms-ai-suggestion">
                            <i className="fas fa-robot" style={{ color: 'var(--primary)', fontSize: 16 }} />
                            <div className="sms-ai-suggestion-text">
                                AI suggestion: "You're welcome Emily! Looking forward to seeing you on Tuesday. Don't forget to brush and floss before coming in 😊"
                            </div>
                            <div className="sms-ai-suggestion-actions">
                                <button className="sms-ai-suggestion-btn send" onClick={() => setShowAISuggestion(false)}>Send</button>
                                <button className="sms-ai-suggestion-btn edit">Edit</button>
                            </div>
                        </div>
                    )}

                    <div className="sms-compose">
                        <input
                            type="text"
                            className="sms-compose-input"
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                        />
                        <button className="sms-compose-send">
                            <i className="fas fa-paper-plane" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="sms-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Select a conversation</span>
                </div>
            )}

            {/* Right Panel - Patient Context */}
            {showPatientContext && activeSMS && (
                <div className="sms-patient-context custom-scrollbar fade-in">
                    <div className="sms-patient-context-header">
                        <div className="sms-patient-avatar-lg">{activeSMS.initials}</div>
                        <div className="sms-patient-name">{activeSMS.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{activeSMS.number}</div>
                    </div>

                    <div className="sms-patient-ctx-section">
                        <div className="sms-patient-ctx-section-title">Patient Details</div>
                        {[
                            ['Insurance', 'HCF'],
                            ['Member ID', 'HCF-112233'],
                            ['Next Appt', 'Feb 18, 2026'],
                            ['Last Visit', 'Jan 20, 2026'],
                            ['Balance', '$0.00'],
                        ].map(([label, value]) => (
                            <div key={label} className="sms-patient-ctx-row">
                                <span className="sms-patient-ctx-label">{label}</span>
                                <span className="sms-patient-ctx-value">{value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="sms-patient-ctx-section">
                        <div className="sms-patient-ctx-section-title">SMS Activity</div>
                        {[
                            ['Total SMS', '12'],
                            ['AI Handled', '8'],
                            ['Avg Reply Time', '2 min'],
                        ].map(([label, value]) => (
                            <div key={label} className="sms-patient-ctx-row">
                                <span className="sms-patient-ctx-label">{label}</span>
                                <span className="sms-patient-ctx-value">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SMSPage;
