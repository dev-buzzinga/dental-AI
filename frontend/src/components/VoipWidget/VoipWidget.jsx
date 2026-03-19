import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { dialpadKeys } from '../../data/dummyData';
import { SearchInput } from '../common/SearchInput';
import twilioService from '../../service/twilio';
import outgoingService from '../../service/outgoing';
import { Device } from '@twilio/voice-sdk';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import './VoipWidget.css';

const VoipWidget = () => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
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
    const [callerDisplayName, setCallerDisplayName] = useState('');

    const timerRef = useRef(null);
    const deviceRef = useRef(null);
    const tokenRef = useRef(null);
    const dialInputRef = useRef(null);
    const callEventsWsRef = useRef(null);

    // Fetch Twilio token from backend
    const fetchTwilioToken = useCallback(async () => {
        try {
            if (!user?.id) {
                console.error('User not available for Twilio token');
                return null;
            }
            const response = await twilioService.generateTwilioToken(user.id);
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
            // console.log("token==>", token);
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
            device.on('incoming', async (connection) => {
                const callerNumber = connection.parameters.From || 'Unknown';
                console.log('Incoming call from:', callerNumber);

                // Look up patient by phone number
                let patientName = null;
                try {
                    const { data: patient } = await supabase
                        .from('patients')
                        .select('name')
                        .eq('phone', callerNumber)
                        .single();
                    if (patient) {
                        patientName = patient.name;
                    }
                } catch (err) {
                    console.log('Patient lookup failed:', err);
                }

                const displayName = patientName || callerNumber;
                setCallerDisplayName(displayName);

                setIncomingCall({
                    connection,
                    from: callerNumber,
                    name: displayName,
                    isPatient: !!patientName,
                    timeReceived: new Date(),
                });

                // Auto-open widget and switch to incoming tab
                setIsOpen(true);
                setActiveTab('incoming');
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

    // ─── Call-events WebSocket (timer start/stop from backend) ───
    useEffect(() => {
        if (!user?.id) return;

        let ws = null;
        let reconnectTimer = null;
        let isCancelled = false;

        const connect = () => {
            if (isCancelled) return;

            const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('http', 'ws')}/ws/call-events?userId=${user.id}`;
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('📡 Call-events WS connected');
            };

            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    console.log('📩 Call event received:', data);

                    if (data.event === 'call:answered') {
                        startTimer(true);
                    } else if (data.event === 'call:ended') {
                        stopTimer();
                        setActiveCallConnection(null);
                        setActiveTab('dialpad');
                    }
                } catch (err) {
                    console.error('Error parsing call event:', err);
                }
            };

            ws.onerror = (err) => console.error('Call-events WS error:', err);

            ws.onclose = () => {
                console.log('🔌 Call-events WS disconnected');
                // Auto-reconnect after 3s if not intentionally cancelled
                if (!isCancelled) {
                    reconnectTimer = setTimeout(connect, 3000);
                }
            };

            callEventsWsRef.current = ws;
        };

        connect();

        return () => {
            isCancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) {
                ws.onclose = null; // prevent reconnect on intentional close
                ws.close();
            }
            callEventsWsRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    // Auto-focus dial input when switching to dialpad tab
    useEffect(() => {
        if (activeTab === 'dialpad' && dialInputRef.current) {
            setTimeout(() => dialInputRef.current.focus(), 100);
        }
    }, [activeTab]);

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
            setCallerDisplayName(incomingCall.name || incomingCall.from);
            setIncomingCall(null);
            startTimer(true);
            setActiveTab('active');

            // Handle call end
            incomingCall.connection.on('disconnect', () => {
                setActiveCallConnection(null);
                setCallerDisplayName('');
                stopTimer();
            });
        }
    };

    const startCall = async () => {
        if (!deviceRef.current || !dialInput) {
            alert('Enter a phone number');
            return;
        }

        // Cleanup any previous call/microphone
        // deviceRef.current.disconnectAll();
        // await new Promise(resolve => setTimeout(resolve, 500));

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
        setCallerDisplayName('');
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


    const isInboxPage = location.pathname.startsWith('/sms') || location.pathname.startsWith('/email');
    const fabClassName = `voip-fab${isInboxPage ? ' voip-fab--raised' : ''}`;
    const widgetClassName = `voip-widget${isInboxPage ? ' voip-widget--raised' : ''} ${isOpen ? 'open' : 'closed'}`;

    if (!isOpen) {
        return (
            <div className={fabClassName} onClick={() => setIsOpen(true)}>
                <div className={`voip-fab-btn${incomingCall ? ' voip-fab-ringing' : ''}`}>
                    <i className={`fas fa-phone${incomingCall ? ' animate-pulse-custom' : ''}`} />
                    <span>VoIP</span>
                    {incomingCall && <div className="voip-fab-badge">1</div>}
                </div>
            </div>
        );
    }

    return (
        <div className={widgetClassName}>
            {/* Header */}
            <div className="voip-header">
                <span>DENTALAIASSIST {deviceReady ? <span style={{ color: '#4ade80', fontSize: '10px' }}>● Connected</span> : <span style={{ color: '#ff6b6b', fontSize: '10px' }}>● Not Connected</span>}</span>
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
                                <div className="voip-avatar">
                                    {incomingCall.name
                                        ? incomingCall.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                                        : <i className="fas fa-phone" />}
                                </div>
                                <div className="voip-caller-name">{incomingCall.name || incomingCall.from}</div>
                                <div className="voip-caller-badge">
                                    {incomingCall.isPatient ? 'Existing Patient' : 'Unknown Caller'}
                                </div>
                                {incomingCall.isPatient && incomingCall.from && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                                        {incomingCall.from}
                                    </div>
                                )}
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
                    {activeCallConnection ? (
                        <>
                            <div className="voip-active-header">
                                <div className="left">
                                    <div className="voip-active-dot animate-pulse-custom" />
                                    <span className="voip-active-name">{callerDisplayName || 'Active Call'}</span>
                                </div>
                                <span className="voip-timer">{formatTime(callSeconds)}</span>
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
                        </>
                    ) : (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <i className="fas fa-phone-slash" style={{ fontSize: '24px', marginBottom: '12px', display: 'block', color: '#D1D5DB' }} />
                            <p>No active call</p>
                        </div>
                    )}
                </div>
            )}

            {/* Dialpad Tab */}
            {activeTab === 'dialpad' && (
                <div className="fade-in">
                    <div className="voip-dialpad-header"><span>Dialpad</span></div>
                    <div className="voip-dial-input-wrapper">
                        <i className="fas fa-phone voip-dial-input-icon" />
                        <input
                            ref={dialInputRef}
                            className="voip-dial-input"
                            type="tel"
                            placeholder="Enter number..."
                            value={dialInput}
                            onChange={(e) => { setDialInput(e.target.value); setSearchTerm(e.target.value); }}
                        />
                        {dialInput && (
                            <button className="voip-dial-clear-btn" onClick={() => { setDialInput(''); setSearchTerm(''); dialInputRef.current?.focus(); }}>
                                <i className="fas fa-xmark" />
                            </button>
                        )}
                    </div>
                    <div className="voip-dialpad-grid">
                        {dialpadKeys.map(([digit, letters]) => (
                            <button key={digit} className="voip-dial-key" onClick={() => { setDialInput((v) => v + digit); dialInputRef.current?.focus(); }}>
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
