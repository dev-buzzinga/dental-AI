import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { dialpadKeys } from '../../data/dummyData';
import { SearchInput } from '../common/SearchInput';
import twilioService from '../../service/twilio';
import outgoingService from '../../service/outgoing';
import { Device } from '@twilio/voice-sdk';
import './VoipWidget.css';

const VoipWidget = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('incoming');
    const [callSeconds, setCallSeconds] = useState(0);
    const [isCallActive, setIsCallActive] = useState(false);
    const [dialInput, setDialInput] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);
    const [controls, setControls] = useState({ mute: false, hold: false, record: false });
    const [searchTerm, setSearchTerm] = useState('');
    const [deviceReady, setDeviceReady] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCallConnection, setActiveCallConnection] = useState(null);
    
    const timerRef = useRef(null);
    const deviceRef = useRef(null);
    const tokenRef = useRef(null);

    // Fetch Twilio token from backend
    const fetchTwilioToken = useCallback(async () => {
        try {
            const response = await twilioService.generateTwilioToken('user-' + Date.now());
            return response.data.token;
        } catch (error) {
            console.error('Error fetching token:', error);
            return null;
        }
    }, []);

    // Initialize Twilio Device
    const initializeTwilioDevice = useCallback(async () => {
        try {
            const token = await fetchTwilioToken();
            console.log("token==>", token);
            if (!token) {
                console.error('Could not get Twilio token');
                return;
            }

            tokenRef.current = token;

            // Create and setup device using Twilio Voice SDK
            const device = new Device(token, {
                logLevel: 1,
                codecPreferences: ['opus', 'pcmu'],
            });

            // Handle incoming calls
            device.on('incoming', (connection) => {
                console.log('Incoming call from:', connection.parameters.From);
                setIncomingCall({
                    connection,
                    from: connection.parameters.From,
                    name: 'Tim Johnson', // This should come from the call metadata
                    timeReceived: new Date(),
                });
            });

            // Handle device ready
            device.on('registered', () => {
                console.log('Twilio Device is ready');
                setDeviceReady(true);
            });

            // Handle device offline
            device.on('unregistered', () => {
                console.log('Twilio Device is offline');
                setDeviceReady(false);
            });

            // Handle errors
            device.on('error', (error) => {
                console.error('Device error:', error);
            });

            // Register the device to listen for incoming calls
            await device.register();
            deviceRef.current = device;
        } catch (error) {
            console.error('Error initializing Twilio:', error);
        }
    }, [fetchTwilioToken]);

    // Initialize on component mount
    useEffect(() => {
        initializeTwilioDevice();
        return () => {
            if (deviceRef.current) {
                deviceRef.current.unregister();
                deviceRef.current.destroy();
            }
        };
    }, [initializeTwilioDevice]);

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

    const answerCall = () => {
        if (incomingCall?.connection) {
            incomingCall.connection.accept();
            setActiveCallConnection(incomingCall.connection);
            setIncomingCall(null);
            startTimer(true);
            setActiveTab('active');

            // Handle call end
            incomingCall.connection.on('disconnect', () => {
                setActiveCallConnection(null);
                stopTimer();
            });
        }
    };

    const startCall = async () => {
        if (!deviceRef.current || !dialInput) {
            alert('Enter a phone number');
            return;
        }

        try {
            // Get user's active phone number
            const numbersResponse = await twilioService.getActiveNumbers();
            const userPhoneNumber = numbersResponse.data.data[0] || '+1234567890';

            // Notify backend of outgoing call
            await outgoingService.makeOutgoingCall(dialInput, userPhoneNumber);

            // Initiate call via Twilio SDK
            const outgoingConnection = await deviceRef.current.connect({
                params: { To: dialInput },
            });

            setActiveCallConnection(outgoingConnection);
            startTimer(true);
            setActiveTab('active');
            setDialInput('');

            // Handle call end
            outgoingConnection.on('disconnect', () => {
                setActiveCallConnection(null);
                stopTimer();
                setActiveTab('dialpad');
            });

            outgoingConnection.on('error', (error) => {
                console.error('Call error:', error);
                alert('Call failed: ' + error.message);
                setActiveCallConnection(null);
                stopTimer();
            });
        } catch (error) {
            console.error('Error starting call:', error);
            alert('Failed to start call: ' + error.message);
        }
    };

    const endCall = () => {
        if (activeCallConnection) {
            activeCallConnection.disconnect();
            setActiveCallConnection(null);
        }
        stopTimer();
        setActiveTab('incoming');
    };

    const toggleControl = (key) => {
        setControls((prev) => ({ ...prev, [key]: !prev[key] }));

        if (key === 'mute' && activeCallConnection) {
            activeCallConnection.mute(!controls.mute);
        }
    };

    const declineCall = () => {
        if (incomingCall?.connection) {
            incomingCall.connection.reject();
            setIncomingCall(null);
        }
        setActiveTab('dialpad');
    };

    const searchResults = searchTerm.length > 0
        ? [{ name: 'Tim Johnson', number: '+61421671766', initials: 'TJ' }].filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const isInboxPage = location.pathname.startsWith('/sms') || location.pathname.startsWith('/email');
    const fabClassName = `voip-fab${isInboxPage ? ' voip-fab--raised' : ''}`;
    const widgetClassName = `voip-widget${isInboxPage ? ' voip-widget--raised' : ''} ${isOpen ? 'open' : 'closed'}`;

    if (!isOpen) {
        return (
            <div className={fabClassName} onClick={() => setIsOpen(true)}>
                <div className="voip-fab-btn">
                    <i className="fas fa-phone" />
                    <span>VoIP</span>
                    <div className="voip-fab-badge">{incomingCall ? '1' : '0'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={widgetClassName}>
            {/* Header */}
            <div className="voip-header">
                <span>DENTALAIASSIST {!deviceReady && <span style={{ color: '#ff6b6b', fontSize: '10px' }}>● Offline</span>}</span>
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
                    {incomingCall ? (
                        <>
                            <div className="voip-incoming-header">
                                <div className="left">
                                    <i className="fas fa-phone-volume animate-pulse-custom" style={{ color: '#fff' }} />
                                    <span style={{ color: '#fff', fontWeight: 700 }}>Incoming Call</span>
                                </div>
                                <button onClick={() => declineCall()} style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                                <button className="voip-btn voip-btn-decline" onClick={() => declineCall()}>
                                    <i className="fas fa-phone-slash" /> Decline
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p>No incoming calls</p>
                        </div>
                    )}
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
                            placeholder="Search or dial..."
                            value={dialInput}
                            onChange={(v) => { setDialInput(v); setSearchTerm(v); }}
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
                        <button onClick={startCall} disabled={!deviceReady || !dialInput}>
                            <i className="fas fa-phone" />
                        </button>
                    </div>
                    {!deviceReady && <div style={{ textAlign: 'center', color: '#ff6b6b', fontSize: '12px', marginTop: '10px' }}>Waiting for device connection...</div>}
                </div>
            )}
        </div>
    );
};

export default VoipWidget;
