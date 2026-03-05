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
    const [threadHistory, setThreadHistory] = useState(null);
    const [loadingThreadHistory, setLoadingThreadHistory] = useState(false);
    const [threadHistoryError, setThreadHistoryError] = useState(null);
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
    }, [authLoading]);

    const loadExistingThreads = async () => {
        if (!isGmailActive) return;

        try {
            setLoadingThreads(true);
            setThreadsError(null);
            const response = await gmailService.getGmailThreads();
            const data = response?.data || [];
            setThreads(data);
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
            // syncReferralEmails();
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGmailActive]);

    useEffect(() => {
        if (!activeThreadId || !isGmailActive) {
            setThreadHistory(null);
            setThreadHistoryError(null);
            return;
        }

        let cancelled = false;

        const loadThreadHistory = async () => {
            setLoadingThreadHistory(true);
            setThreadHistoryError(null);
            try {
                const res = await gmailService.getThreadHistory(activeThreadId);
                if (!cancelled && res?.data) {
                    setThreadHistory(res.data);
                }
            } catch (err) {
                if (!cancelled) {
                    setThreadHistoryError(err?.response?.data?.message || 'Failed to load thread');
                    setThreadHistory(null);
                }
            } finally {
                if (!cancelled) setLoadingThreadHistory(false);
            }
        };

        loadThreadHistory();
        return () => { cancelled = true; };
    }, [activeThreadId, isGmailActive]);

    const handleAttachmentDownload = async (messageId, filename) => {
        try {
            const blob = await gmailService.getAttachmentBlob(messageId, filename);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'attachment';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Attachment download failed', err);
        }
    };

    const handleAttachmentView = async (messageId, filename, mimeType) => {
        try {
            const blob = await gmailService.getAttachmentBlob(messageId, filename);
            const url = URL.createObjectURL(blob);
            const canViewInline = (mimeType || '').startsWith('image/') || (mimeType || '').includes('pdf');
            if (canViewInline) {
                window.open(url, '_blank', 'noopener');
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'attachment';
                a.target = '_blank';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Attachment view failed', err);
        }
    };

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

            {/* Center - Email thread chat history */}
            <div className="sms-chat">
                {!activeThreadId ? (
                    <div className="sms-chat-placeholder custom-scrollbar">
                        <span style={{ color: 'var(--text-secondary)' }}>Select an email to view thread</span>
                    </div>
                ) : (
                    <>
                        <div className="sms-chat-header">
                            <div>
                                <div className="sms-chat-name">
                                    {activeThread?.sender_name || activeThread?.sender_email || 'Unknown sender'}
                                </div>
                                <div className="sms-chat-number">
                                    {threadHistory?.subject ?? activeThread?.subject ?? 'Referral Thread'}
                                </div>
                            </div>
                        </div>

                        <div className="sms-messages custom-scrollbar">
                            {loadingThreadHistory && (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    Loading thread...
                                </div>
                            )}
                            {threadHistoryError && !loadingThreadHistory && (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger, #dc2626)' }}>
                                    {threadHistoryError}
                                </div>
                            )}
                            {!loadingThreadHistory && !threadHistoryError && threadHistory?.messages?.length > 0 && threadHistory.messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`sms-bubble ${msg.isFromMe ? 'sms-bubble-outgoing' : 'sms-bubble-incoming'}`}
                                >
                                    <div className="sms-bubble-label">
                                        {msg.fromName || msg.from} {msg.isFromMe && '(You)'}
                                    </div>
                                    <div className="sms-bubble-time" style={{ marginBottom: 6 }}>
                                        {new Date(msg.date).toLocaleString()}
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {msg.bodyText || msg.snippet}
                                    </div>
                                    {msg.attachments?.length > 0 && (
                                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {msg.attachments.map((att) => (
                                                <span key={att.attachmentId} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="sms-chat-action-btn"
                                                        style={{ fontSize: 12, padding: '6px 10px' }}
                                                        onClick={() => handleAttachmentDownload(msg.id, att.filename)}
                                                        title={`Download ${att.filename}`}
                                                    >
                                                        <i className="fas fa-download" /> {att.filename}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sms-chat-action-btn"
                                                        style={{ fontSize: 12, padding: '6px 10px' }}
                                                        onClick={() => handleAttachmentView(msg.id, att.filename, att.mimeType)}
                                                        title={`View ${att.filename}`}
                                                    >
                                                        <i className="fas fa-external-link-alt" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!loadingThreadHistory && !threadHistoryError && threadHistory?.messages?.length === 0 && (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No messages in this thread.
                                </div>
                            )}
                        </div>

                        <div className="sms-compose">
                            <input
                                type="text"
                                className="sms-compose-input"
                                placeholder="Type a reply..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                            />
                            <button className="sms-compose-send" type="button">
                                <i className="fas fa-paper-plane" />
                            </button>
                        </div>
                    </>
                )}
            </div>

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
