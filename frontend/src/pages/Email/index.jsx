import { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import gmailService from '../../service/gmail';
import { SearchInput } from '../../components/common/SearchInput';
import { Toggle } from '../../components/common/SearchInput';
import '../../styles/SMS.css';

const getDisplayUser = (thread, currentUserEmail) => {
    if (!thread) {
        return { name: 'Unknown', email: '' };
    }

    const me = (currentUserEmail || '').toLowerCase();
    const senderEmail = (thread.sender_email || '').toLowerCase();
    const isMeSender = me && senderEmail === me;

    if (isMeSender) {
        const name = thread.receiver_name || thread.receiver_email || 'Unknown';
        const email = thread.receiver_email || thread.receiver_name || '';
        return { name, email };
    }

    const name = thread.sender_name || thread.sender_email || 'Unknown';
    const email = thread.sender_email || thread.sender_name || '';
    return { name, email };
};

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
    const [replyAttachments, setReplyAttachments] = useState([]);
    const [sendingReply, setSendingReply] = useState(false);
    const [markingRead, setMarkingRead] = useState(false);
    const [refreshingChat, setRefreshingChat] = useState(false);
    const [viewingAttachmentKey, setViewingAttachmentKey] = useState(null); // 'messageId-filename' when loading
    const threadHistoryLoadIdRef = useRef(0);
    const replyFileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

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
                    .select('is_active, ai_auto_reply')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error checking Gmail connection:', error);
                    setIsGmailActive(false);
                } else {
                    setIsGmailActive(Boolean(data?.is_active));
                    setAiAutoReply(data?.ai_auto_reply !== false);
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
    }, [authLoading, user?.id]);

    const loadExistingThreads = async () => {
        if (!isGmailActive) return;

        try {
            setLoadingThreads(true);
            setThreadsError(null);
            const response = await gmailService.getGmailThreads();
            const data = response?.data || [];
            setThreads(data);
            if (!activeThreadId && data.length > 0) {
                setActiveThreadId(data[0].thread_id);
            }
        } catch (error) {
            console.error('Failed to load gmail threads', error);
            setThreadsError(error?.response?.data?.message || 'Failed to load gmail threads');
        } finally {
            setLoadingThreads(false);
        }
    };

    const loadThreadHistoryForThread = async (threadId) => {
        if (!threadId || !isGmailActive) return;
        const loadId = ++threadHistoryLoadIdRef.current;
        setLoadingThreadHistory(true);
        setThreadHistoryError(null);
        try {
            const res = await gmailService.getThreadHistory(threadId);
            if (loadId === threadHistoryLoadIdRef.current && res?.data) {
                setThreadHistory(res.data);
            }
        } catch (err) {
            if (loadId === threadHistoryLoadIdRef.current) {
                setThreadHistoryError(err?.response?.data?.message || 'Failed to load thread');
                setThreadHistory(null);
            }
        } finally {
            if (loadId === threadHistoryLoadIdRef.current) {
                setLoadingThreadHistory(false);
            }
        }
    };

    const syncReferralEmails = async () => {
        if (!isGmailActive) return;

        try {
            setSyncing(true);
            const response = await gmailService.getReferralEmails();
            const data = response?.data || [];
            setThreads(data);
            if (activeThreadId) {
                await loadThreadHistoryForThread(activeThreadId);
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
        loadThreadHistoryForThread(activeThreadId);
    }, [activeThreadId, isGmailActive]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (threadHistory?.messages?.length > 0) {
            scrollToBottom();
        }
    }, [threadHistory]);

    const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const handleSendReply = async () => {
        if (!activeThreadId || sendingReply) return;
        const body = (messageInput || '').trim();
        if (!body && replyAttachments.length === 0) return;

        setSendingReply(true);
        try {
            const attachments = await Promise.all(
                replyAttachments.map(async (f) => ({
                    filename: f.name,
                    content: await fileToBase64(f),
                    mimeType: f.type || 'application/octet-stream',
                }))
            );
            await gmailService.sendReply(activeThreadId, { body: body || ' ', attachments });
            setMessageInput('');
            setReplyAttachments([]);
            const res = await gmailService.getThreadHistory(activeThreadId);
            if (res?.data) setThreadHistory(res.data);
        } catch (err) {
            console.error('Send reply failed', err);
        } finally {
            setSendingReply(false);
        }
    };

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
        const key = `${messageId}-${filename}`;
        setViewingAttachmentKey(key);
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
        } finally {
            setViewingAttachmentKey(null);
        }
    };

    const handleMarkActiveThreadAsRead = async () => {
        if (!activeThread || !user || markingRead) return;

        const threadId = activeThread.thread_id;
        setMarkingRead(true);

        // Optimistic UI update
        setThreads((prev) =>
            prev.map((t) =>
                t.thread_id === threadId ? { ...t, is_new: false } : t
            )
        );

        try {
            const { error } = await supabase
                .from('gmail_threads')
                .update({ is_new: false })
                .eq('user_id', user.id)
                .eq('thread_id', threadId);

            if (error) {
                console.error('Failed to mark gmail thread as read', error);
            }
        } catch (err) {
            console.error('Failed to mark gmail thread as read', err);
        } finally {
            setMarkingRead(false);
        }
    };

    const handleRefreshChat = async () => {
        if (!activeThreadId || refreshingChat) return;
        setRefreshingChat(true);
        try {
            const res = await gmailService.getThreadHistory(activeThreadId);
            if (res?.data) setThreadHistory(res.data);
        } catch (err) {
            console.error('Refresh chat failed', err);
        } finally {
            setRefreshingChat(false);
        }
    };

    const filtered = useMemo(() => {
        let list = threads;

        if (filter === 'unread') {
            list = list.filter((t) => t.is_new);
        }

        // 'ai' tab is reserved for future flags; currently behaves like 'all'.

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter((t) => {
                const display = getDisplayUser(t, user?.email);
                const matchMessage = (t.last_message || '').toLowerCase().includes(term);
                const matchName = (display.name || '').toLowerCase().includes(term);
                const matchEmail = (display.email || '').toLowerCase().includes(term);
                return matchMessage || matchName || matchEmail;
            });
        }

        return list;
    }, [threads, searchTerm, filter, user?.email]);

    const activeThread = filtered.find((t) => t.thread_id === activeThreadId) || filtered[0];

    const handleAiAutoReplyToggle = async (newValue) => {
        if (!user?.id) return;
        setAiAutoReply(newValue);
        try {
            const { error } = await supabase
                .from('user_gmail_accounts')
                .update({ ai_auto_reply: newValue })
                .eq('user_id', user.id);
            if (error) {
                console.error('Error updating ai_auto_reply:', error);
                setAiAutoReply(!newValue);
            }
        } catch (err) {
            console.error('Unexpected error updating ai_auto_reply:', err);
            setAiAutoReply(!newValue);
        }
    };

    return (
        <div className="sms-page">
            {/* Left Panel */}
            <div className="sms-sidebar">
                <div className="sms-sidebar-header">
                    <div className="sms-sidebar-top">
                        <h2 className="sms-sidebar-title">Email Inbox</h2>
                        <div className="sms-ai-toggle">
                            <span className="sms-ai-label">AI Auto-Reply</span>
                            <Toggle on={aiAutoReply} onToggle={() => handleAiAutoReplyToggle(!aiAutoReply)} size="sm" />
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
                    {['all', 'unread'].map((f) => (
                        <button
                            key={f}
                            className={`sms-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : ''}
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
                                {(getDisplayUser(thread, user?.email).name || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="sms-meta">
                                <div className="sms-name-row">
                                    <span className="sms-name">
                                        {getDisplayUser(thread, user?.email).name || 'Unknown sender'}
                                    </span>
                                    <span className="sms-time">
                                        {thread.last_message_time
                                            ? new Date(thread.last_message_time).toLocaleString()
                                            : ''}
                                    </span>
                                </div>
                                <div className="sms-preview">
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        <span style={{ fontWeight: 500 }}>From:</span>{' '}
                                        {thread.sender_name || thread.sender_email || 'Unknown'}
                                        <span style={{ margin: '0 6px', color: 'var(--border-subtle, #e0e0e0)' }}>•</span>
                                        <span style={{ fontWeight: 500 }}>To:</span>{' '}
                                        {thread.receiver_name || thread.receiver_email || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            {thread.is_new && <div className="sms-unread-dot" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Center - Email thread chat history */}
            <div className="sms-chat">
                {!activeThread ? (
                    <div className="sms-chat-placeholder custom-scrollbar">
                        <span style={{ color: 'var(--text-secondary)' }}>Select an email to view thread</span>
                    </div>
                ) : (
                    <>
                        <div className="sms-chat-header">
                            <div>
                                {(() => {
                                    const display = getDisplayUser(activeThread, user?.email);
                                    return (
                                        <>
                                            <div className="sms-chat-name">
                                                {display.name}
                                            </div>
                                            <div className="sms-chat-number">
                                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {display.email || activeThread?.sender_email || activeThread?.receiver_email || ''}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="sms-chat-actions">
                                <button
                                    type="button"
                                    className="sms-chat-action-btn"
                                    disabled={refreshingChat}
                                    onClick={handleRefreshChat}
                                    title="Refresh to get latest messages"
                                >
                                    {refreshingChat ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-sync-alt" />}
                                    {' '}{refreshingChat ? 'Refreshing…' : 'Refresh chat'}
                                </button>
                                {activeThread?.is_new && (
                                    <button
                                        type="button"
                                        className="sms-chat-action-btn"
                                        disabled={markingRead}
                                        onClick={handleMarkActiveThreadAsRead}
                                    >
                                        {markingRead ? 'Marking…' : 'Mark as read'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="sms-messages custom-scrollbar">
                            {loadingThreadHistory && (
                                <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <i className="fas fa-spinner fa-spin" />
                                    <span>Loading thread...</span>
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
                                        {msg.isFromMe
                                            ? `${(user?.user_metadata?.full_name || user?.email || msg.fromName || msg.from) || ''} (You)`
                                            : (msg.fromName || msg.from)
                                        }
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
                                                        disabled={viewingAttachmentKey === `${msg.id}-${att.filename}`}
                                                        onClick={() => handleAttachmentView(msg.id, att.filename, att.mimeType)}
                                                        title={`View ${att.filename}`}
                                                    >
                                                        {viewingAttachmentKey === `${msg.id}-${att.filename}` ? (
                                                            <i className="fas fa-spinner fa-spin" />
                                                        ) : (
                                                            <i className="fas fa-external-link-alt" />
                                                        )}
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
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="sms-compose-wrap">
                            {replyAttachments.length > 0 && (
                                <div className="sms-reply-attachments">
                                    {replyAttachments.map((f, i) => (
                                        <span key={i} className="sms-reply-attachment-chip">
                                            <i className="fas fa-paperclip" /> {f.name}
                                            <button
                                                type="button"
                                                aria-label="Remove"
                                                onClick={() => setReplyAttachments((prev) => prev.filter((_, j) => j !== i))}
                                            >
                                                <i className="fas fa-times" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="sms-compose">
                                <input
                                    ref={replyFileInputRef}
                                    type="file"
                                    multiple
                                    accept="*/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const files = e.target.files ? [...e.target.files] : [];
                                        setReplyAttachments((prev) => [...prev, ...files]);
                                        e.target.value = '';
                                    }}
                                />
                                <textarea
                                    className="sms-compose-input"
                                    placeholder="Type a reply..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    rows={2}
                                    style={{ resize: 'none', minHeight: 44 }}
                                />
                                <button
                                    type="button"
                                    className="sms-chat-action-btn"
                                    style={{ alignSelf: 'flex-end' }}
                                    onClick={() => replyFileInputRef.current?.click()}
                                    title="Attach file"
                                >
                                    <i className="fas fa-paperclip" />
                                </button>
                                <button
                                    className="sms-compose-send"
                                    type="button"
                                    disabled={sendingReply || ((!messageInput || !messageInput.trim()) && replyAttachments.length === 0)}
                                    onClick={handleSendReply}
                                >
                                    {sendingReply ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>


        </div>
    );
};

export default EmailPage;
