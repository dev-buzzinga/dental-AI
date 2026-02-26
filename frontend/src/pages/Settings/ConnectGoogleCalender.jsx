import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../config/supabase';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import '../../styles/Settings.css';
import { AuthContext } from '../../context/AuthContext';
import googleService from '../../service/google';

const ConnectGoogleCalender = () => {
    const { user } = useContext(AuthContext);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDoctors();
        }
    }, []);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('doctors')
                .select('id, name, image_url')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) throw error;
            setDoctors(data || []);
        } catch (error) {
            console.error('Error fetching doctors:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!selectedDoctor) return;
        try {
            setConnecting(true);
            const response = await googleService.connectGoogle(selectedDoctor);
            const url = response?.data?.url;
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                console.error('No Google auth URL returned from backend');
            }
        } catch (error) {
            console.error('Error connecting to Google Calendar:', error);
        } finally {
            setConnecting(false);
        }
    };

    const renderDoctorAvatar = (doctor) => {
        if (doctor.image_url) {
            return (
                <img
                    src={doctor.image_url}
                    alt={doctor.name}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
            );
        }
        return (
            <div
                style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: doctor.color || 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                }}
            >
                {doctor.name.charAt(0).toUpperCase()}
            </div>
        );
    };

    return (
        <div className="settings-page custom-scrollbar">
            <div className="settings-header">
                <div>
                    <h2 className="settings-title">Google Calendar</h2>
                    <p className="settings-subtitle">Connect your doctor's Google Calendar to sync appointments</p>
                </div>
            </div>

            <div className="phone-table-card" style={{ padding: '24px', maxWidth: '600px', overflow: 'visible' }}>
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <SearchableDropdown
                                label="Select Doctor"
                                placeholder={loading ? "Loading doctors..." : "Search and select a doctor"}
                                options={doctors}
                                value={selectedDoctor}
                                onChange={(opt) => setSelectedDoctor(opt.id)}
                                renderOption={(opt) => (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {renderDoctorAvatar(opt)}
                                        <span>{opt.name}</span>
                                    </div>
                                )}
                                displayValue={(opt) => opt.name}
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
                            disabled={!selectedDoctor || connecting}
                        >
                            <i className="fab fa-google" style={{ marginRight: '8px' }} />
                            {connecting ? 'Connecting...' : 'Connect with Google Calendar'}
                        </button>
                    </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '24px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />
                    Selecting a doctor will allow you to authorize access to their specific Google Calendar for appointment synchronization.
                </p>
            </div>
        </div>
    );
};

export default ConnectGoogleCalender;
