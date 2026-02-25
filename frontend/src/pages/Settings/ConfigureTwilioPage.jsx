import { useState } from 'react';
import { useToast } from '../../components/Toast/Toast';
import '../../styles/Settings.css';

const ConfigureTwilioPage = () => {
    const [accountSid, setAccountSid] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [webhookUrl] = useState('https://dental-ai.com/api/twilio/webhook');
    const [testing, setTesting] = useState(false);
    const showToast = useToast();

    const handleTest = () => {
        setTesting(true);
        setTimeout(() => {
            setTesting(false);
            showToast('Connection successful!', 'success');
        }, 2000);
    };

    const handleSave = () => {
        showToast('Configuration saved successfully', 'success');
    };

    const handleCopy = () => {
        navigator.clipboard?.writeText(webhookUrl);
        showToast('Webhook URL copied to clipboard', 'success');
    };

    return (
        <div className="settings-page custom-scrollbar">
            <div className="settings-header">
                <div>
                    <h2 className="settings-title">Configure Twilio</h2>
                    <p className="settings-subtitle">Connect your Twilio account for calls and SMS</p>
                </div>
            </div>

            <div className="twilio-card">
                <div className="twilio-form-group">
                    <label className="twilio-label">Account SID</label>
                    <input
                        className="twilio-input"
                        value={accountSid}
                        onChange={(e) => setAccountSid(e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                </div>

                <div className="twilio-form-group">
                    <label className="twilio-label">Auth Token</label>
                    <input
                        className="twilio-input"
                        type="password"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="Your Auth Token"
                    />
                </div>

                <div className="twilio-form-group">
                    <label className="twilio-label">Default Twilio Number</label>
                    <input
                        className="twilio-input"
                        value={twilioNumber}
                        onChange={(e) => setTwilioNumber(e.target.value)}
                        placeholder="+1 234 567 8900"
                    />
                </div>

                <div className="twilio-form-group">
                    <label className="twilio-label">Webhook URL</label>
                    <div className="twilio-input-with-copy">
                        <input className="twilio-input" value={webhookUrl} readOnly style={{ background: '#F9FAFB' }} />
                        <button className="twilio-copy-btn" onClick={handleCopy}>
                            <i className="fas fa-copy" />
                        </button>
                    </div>
                </div>

                <div className="twilio-actions">
                    <button className="twilio-test-btn" onClick={handleTest} disabled={testing}>
                        {testing ? (
                            <><i className="fas fa-spinner fa-spin" /> Testing...</>
                        ) : (
                            <><i className="fas fa-plug" /> Test Connection</>
                        )}
                    </button>
                    <button className="btn-primary" onClick={handleSave}>
                        <i className="fas fa-save" /> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigureTwilioPage;
