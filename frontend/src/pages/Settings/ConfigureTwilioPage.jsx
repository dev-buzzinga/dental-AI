import { useState, useEffect, useContext } from 'react';
import { useToast } from '../../components/Toast/Toast';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import '../../styles/Settings.css';

const ConfigureTwilioPage = () => {
    const { user } = useContext(AuthContext);
    const [accountSid, setAccountSid] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [appSid, setAppSid] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        if (!user) return;

        const fetchConfig = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('twilio_config')
                    .select('account_sid, auth_token, app_sid')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    showToast('Failed to load Twilio config', 'error');
                    return;
                }
                if (data) {
                    setAccountSid(data.account_sid || '');
                    setAuthToken(data.auth_token || '');
                    setAppSid(data.app_sid || '');
                }
            } catch (err) {
                showToast('Failed to load Twilio config', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        try {
            setSaving(true);
            const { data: existing } = await supabase
                .from('twilio_config')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('twilio_config')
                    .update({
                        account_sid: accountSid,
                        auth_token: authToken,
                        app_sid: appSid || '',
                    })
                    .eq('user_id', user.id);

                if (error) {
                    showToast(error.message || 'Failed to save', 'error');
                    return;
                }
            } else {
                const { error } = await supabase
                    .from('twilio_config')
                    .insert({
                        account_sid: accountSid,
                        auth_token: authToken,
                        app_sid: appSid || '',
                        user_id: user.id,
                    });

                if (error) {
                    showToast(error.message || 'Failed to save', 'error');
                    return;
                }
            }
            showToast('Configuration saved successfully', 'success');
        } catch (err) {
            showToast('Failed to save configuration', 'error');
        } finally {
            setSaving(false);
        }
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
                {loading ? (
                    <p className="settings-subtitle">Loading...</p>
                ) : (
                    <>
                        <div className="twilio-form-group">
                            <label className="twilio-label">Account SID</label>
                            <input
                                className="twilio-input"
                                type="text"
                                name="twilio_account_sid"
                                autoComplete="off"
                                data-form-type="other"
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
                                name="twilio_auth_token"
                                autoComplete="new-password"
                                data-form-type="other"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                placeholder="Your Auth Token"
                            />
                        </div>

                        <div className="twilio-form-group">
                            <label className="twilio-label">App SID (Voice)</label>
                            <input
                                className="twilio-input"
                                type="text"
                                name="twilio_app_sid"
                                autoComplete="off"
                                data-form-type="other"
                                value={appSid}
                                onChange={(e) => setAppSid(e.target.value)}
                                placeholder="App SID"
                            />
                        </div>

                        <div className="twilio-actions">
                            <button
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><i className="fas fa-spinner fa-spin" /> Saving...</>
                                ) : (
                                    <><i className="fas fa-save" /> Save Configuration</>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ConfigureTwilioPage;
