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
    const [apiKeySid, setApiKeySid] = useState('');
    const [apiKeySecret, setApiKeySecret] = useState('');
    const [intelligenceServiceSid, setIntelligenceServiceSid] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialValues, setInitialValues] = useState(null);
    const showToast = useToast();

    useEffect(() => {
        if (!user) return;

        const fetchConfig = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('twilio_config')
                    .select('account_sid, auth_token, app_sid, api_key_sid, api_key_secret, intelligence_service_sid')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    showToast('Failed to load Twilio config', 'error');
                    return;
                }
                if (data) {
                    const vals = {
                        accountSid: data.account_sid || '',
                        authToken: data.auth_token || '',
                        appSid: data.app_sid || '',
                        apiKeySid: data.api_key_sid || '',
                        apiKeySecret: data.api_key_secret || '',
                        intelligenceServiceSid: data.intelligence_service_sid || '',
                    };
                    setAccountSid(vals.accountSid);
                    setAuthToken(vals.authToken);
                    setAppSid(vals.appSid);
                    setApiKeySid(vals.apiKeySid);
                    setApiKeySecret(vals.apiKeySecret);
                    setIntelligenceServiceSid(vals.intelligenceServiceSid);
                    setInitialValues(vals);
                } else {
                    setInitialValues({
                        accountSid: '',
                        authToken: '',
                        appSid: '',
                        apiKeySid: '',
                        apiKeySecret: '',
                        intelligenceServiceSid: '',
                    });
                }
            } catch (err) {
                showToast('Failed to load Twilio config', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const hasChanges = initialValues
        ? accountSid !== initialValues.accountSid ||
        authToken !== initialValues.authToken ||
        appSid !== initialValues.appSid ||
        apiKeySid !== initialValues.apiKeySid ||
        apiKeySecret !== initialValues.apiKeySecret ||
        intelligenceServiceSid !== initialValues.intelligenceServiceSid
        : false;

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
                        api_key_sid: apiKeySid || '',
                        api_key_secret: apiKeySecret || '',
                        intelligence_service_sid: intelligenceServiceSid || '',
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
                        api_key_sid: apiKeySid || '',
                        api_key_secret: apiKeySecret || '',
                        intelligence_service_sid: intelligenceServiceSid || '',
                        user_id: user.id,
                    });

                if (error) {
                    showToast(error.message || 'Failed to save', 'error');
                    return;
                }
            }
            setInitialValues({ accountSid, authToken, appSid, apiKeySid, apiKeySecret, intelligenceServiceSid });
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

                        <div className="twilio-form-group">
                            <label className="twilio-label">API Key SID</label>
                            <input
                                className="twilio-input"
                                type="text"
                                name="twilio_api_key_sid"
                                autoComplete="off"
                                data-form-type="other"
                                value={apiKeySid}
                                onChange={(e) => setApiKeySid(e.target.value)}
                                placeholder="API Key SID"
                            />
                        </div>

                        <div className="twilio-form-group">
                            <label className="twilio-label">API Key Secret</label>
                            <input
                                className="twilio-input"
                                type="password"
                                name="twilio_api_key_secret"
                                autoComplete="new-password"
                                data-form-type="other"
                                value={apiKeySecret}
                                onChange={(e) => setApiKeySecret(e.target.value)}
                                placeholder="API Key Secret"
                            />
                        </div>
                        <div className="twilio-form-group">
                            <label className="twilio-label">Intelligence Service SID  (Call Transcription and Recording)</label>
                            <input
                                className="twilio-input"
                                type="text"
                                name="twilio_intelligence_service_sid"
                                autoComplete="off"
                                data-form-type="other"
                                value={intelligenceServiceSid}
                                onChange={(e) => setIntelligenceServiceSid(e.target.value)}
                                placeholder="Intelligence Service SID"
                            />
                        </div>
                        <div className="twilio-actions">
                            <button
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
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
