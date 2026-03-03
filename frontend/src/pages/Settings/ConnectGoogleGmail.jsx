import { useState, useEffect, useContext } from 'react';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import '../../styles/Settings.css';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import gmailService from '../../service/gmail.js';
import { useToast } from '../../components/Toast/Toast';
const ConnectGoogleGmail = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(null);
    const showToast = useToast();

    useEffect(() => {
        if (!user) return;

        const fetchGmailStatus = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('user_gmail_accounts')
                    .select('is_active')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching Gmail connection status:', error);
                    setIsConnected(false);
                    return;
                }

                setIsConnected(Boolean(data?.is_active));
            } catch (error) {
                console.error('Error fetching Gmail connection status:', error);
                setIsConnected(false);
            } finally {
                setLoading(false);
            }
        };

        fetchGmailStatus();
    }, [user]);


    const handleConnect = async () => {
        try {
            setConnecting(true);

            const response = await gmailService.connectGmail();

            if (response.status === 200) {
                showToast('Successfully sent email to connect Google Gmail', 'success');
            } else {
                showToast('Failed to send email to connect Google Gmail', 'error');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setConnecting(false);
        }
    }

    return (
        <div className="connect-calendar-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 className="settings-title">Connect Google Gmail</h2>
                        {loading ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Checking Gmail connection status...
                            </span>
                        ) : isConnected ? (
                            <span className="phone-status-active">Connected</span>
                        ) : (
                            <span className="phone-status-inactive">Not connected</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="phone-table-card" style={{ padding: '24px', maxWidth: '600px', overflow: 'visible', margin: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="email"
                                className="practice-input"
                                placeholder="Your login email"
                                value={user?.email || ""}
                                readOnly
                                disabled
                            />
                        </div>
                        <button
                            className="btn-primary"
                            style={{
                                whiteSpace: 'nowrap',
                                height: '42px',
                                marginBottom: '0px' // SearchableDropdown has its own label/margin
                            }}
                            onClick={handleConnect}
                            disabled={connecting}
                        >
                            {connecting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                                    Sending Email...
                                </>
                            ) : (
                                <>
                                    <i className="fab fa-google" style={{ marginRight: '8px' }} />
                                    Connect Google Gmail
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '24px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />
                    Click the button to send an email to the doctor with a link to connect their Google Gmail.
                </p>
            </div>
        </div>
    );
};

export default ConnectGoogleGmail;
