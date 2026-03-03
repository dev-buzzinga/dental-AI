import { useState, useMemo, useEffect, useContext } from 'react';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import gmailService from '../../service/gmail';
import { SearchInput } from '../../components/common/SearchInput';
import { Toggle } from '../../components/common/SearchInput';
import '../../styles/SMS.css';

const EmailPage = () => {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [gmailChecked, setGmailChecked] = useState(false);
    const [isGmailActive, setIsGmailActive] = useState(false);
    const [threads, setThreads] = useState([]);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [threadsError, setThreadsError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [aiAutoReply, setAiAutoReply] = useState(true);
    const [showAISuggestion, setShowAISuggestion] = useState(true);
    const [showPatientContext, setShowPatientContext] = useState(false);
    const [messageInput, setMessageInput] = useState('');

    useEffect(() => {
        const checkGmailConnection = async () => {
            if (!user) {
                setIsGmailActive(false);
                setGmailChecked(true);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_gmail_accounts')
                    .select('is_active')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error checking Gmail connection:', error);
                    setIsGmailActive(false);
                } else {
                    setIsGmailActive(Boolean(data?.is_active));
                }
            } catch (err) {
                console.error('Unexpected error checking Gmail connection:', err);
                setIsGmailActive(false);
            } finally {
                setGmailChecked(true);
            }
        };

        if (!authLoading) {
            checkGmailConnection();
        }
    }, [authLoading, user]);

    const loadExistingThreads = async () => {
        if (!isGmailActive) return;

        try {
            setLoadingThreads(true);
            setThreadsError(null);
            const response = await gmailService.getGmailThreads();
            const data = response?.data || [];
            setThreads(data);
            if (data.length > 0) {
                setActiveThreadId(data[0].thread_id);
            }
        } catch (error) {
            console.error('Failed to load gmail threads', error);
            setThreadsError(error?.response?.data?.message || 'Failed to load gmail threads');
        } finally {
            setLoadingThreads(false);
        }
    };

    const syncReferralEmails = async () => {
        if (!isGmailActive) return;

        try {
            setSyncing(true);
            const response = await gmailService.getReferralEmails();
            const data = response?.data || [];
            setThreads(data);
            if (data.length > 0) {
                setActiveThreadId((prev) => prev || data[0].thread_id);
            }
        } catch (error) {
            console.error('Failed to sync referral emails', error);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (!isGmailActive) return;

        const bootstrap = async () => {
            await loadExistingThreads();
            syncReferralEmails();
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGmailActive]);

    const filtered = useMemo(() => {
        let list = threads;

        if (searchTerm) {
            list = list.filter((t) =>
                (t.last_message || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return list;
    }, [threads, searchTerm]);

    const activeThread = filtered.find((t) => t.thread_id === activeThreadId) || filtered[0];

    return (
        <div className="sms-page">
            {/* Left Panel */}
            <div className="sms-sidebar">
                <div className="sms-sidebar-header">
                    <div className="sms-sidebar-top">
                        <h2 className="sms-sidebar-title">Email Inbox</h2>
                        <div className="sms-ai-toggle">
                            <span className="sms-ai-label">AI Auto-Reply</span>
                            <Toggle on={aiAutoReply} onToggle={() => setAiAutoReply(!aiAutoReply)} size="sm" />
                            <button
                                type="button"
                                onClick={syncReferralEmails}
                                disabled={syncing || !isGmailActive}
                                style={{
                                    marginLeft: 8,
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: syncing || !isGmailActive ? 'not-allowed' : 'pointer',
                                    color: syncing ? 'var(--primary)' : 'var(--text-secondary)',
                                    padding: 4,
                                }}
                                title="Sync latest referral emails"
                            >
                                <i className={`fas fa-rotate-right ${syncing ? 'fa-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <SearchInput placeholder="Search conversations..." value={searchTerm} onChange={setSearchTerm} />
                </div>

                {authLoading || !gmailChecked ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Checking Gmail connection...
                    </div>
                ) : !isGmailActive ? (
                    <div
                        style={{
                            margin: '24px 12px',
                            padding: '16px 20px',
                            borderRadius: 12,
                            border: '1px solid var(--border-subtle, #e0e0e0)',
                            background: 'var(--bg-elevated, #fff)',
                            textAlign: 'left',
                            fontSize: 14,
                        }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Gmail is not connected</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                            Please connect your Gmail account in Settings to view referral emails.
                        </div>
                    </div>
                ) : null}

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
                    {loadingThreads && threads.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Loading referral emails...
                        </div>
                    )}
                    {threadsError && !loadingThreads && (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger, #dc2626)' }}>
                            {threadsError}
                        </div>
                    )}
                    {!loadingThreads && !threadsError && filtered.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No referral emails found.
                        </div>
                    )}
                    {!loadingThreads && !threadsError && filtered.map((thread) => (
                        <div
                            key={thread.thread_id}
                            className={`sms-row ${activeThread && activeThread.thread_id === thread.thread_id ? 'active' : ''}`}
                            onClick={() => { setActiveThreadId(thread.thread_id); }}
                        >
                            <div className="sms-avatar">
                                {(thread.sender_name || thread.sender_email || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="sms-meta">
                                <div className="sms-name-row">
                                    <span className="sms-name">
                                        {thread.sender_name || thread.sender_email || 'Unknown sender'}
                                    </span>
                                    <span className="sms-time">
                                        {thread.last_message_time
                                            ? new Date(thread.last_message_time).toLocaleString()
                                            : ''}
                                    </span>
                                </div>
                                <div className="sms-preview">
                                    {thread.subject || 'Referral Thread'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center - Chat */}
            {activeThread ? (
                <div className="sms-chat">
                    <div className="sms-chat-header">
                        <div>
                            <div className="sms-chat-name">
                                {activeThread.sender_name || activeThread.sender_email || 'Unknown sender'}
                            </div>
                            <div className="sms-chat-number">
                                {activeThread.subject || 'Referral Thread'}
                            </div>
                        </div>
                        {/* <div className="sms-chat-actions">
                            <button className="sms-chat-action-btn" onClick={() => setShowPatientContext(!showPatientContext)}>
                                <i className="fas fa-user" /> Patient Info
                            </button>
                            <button className="sms-chat-action-btn">
                                <i className="fas fa-phone" /> Call
                            </button>
                        </div> */}
                    </div>

                    <div className="sms-messages custom-scrollbar">
                        <div
                            className="sms-bubble sms-bubble-incoming"
                        >
                            <div className="sms-bubble-label" style={{ color: 'var(--primary)' }}>
                                <i className="fas fa-robot" /> AI Classified Referral
                            </div>
                            <div>{activeThread.last_message || 'Referral email detected.'}</div>
                            <div className="sms-bubble-time">
                                {activeThread.last_message_time
                                    ? new Date(activeThread.last_message_time).toLocaleString()
                                    : ''}
                            </div>
                        </div>
                    </div>

                    {/* {showAISuggestion && activeSMS.messages.length > 0 && (
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
                    )} */}

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
                    <span style={{ color: 'var(--text-secondary)' }}>Select a referral email</span>
                </div>
            )}

            {/* Right Panel - Patient Context */}
            {/* {showPatientContext && activeSMS && (
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
            )} */}
        </div>
    );
};

export default EmailPage;
