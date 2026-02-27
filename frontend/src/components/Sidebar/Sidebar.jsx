import { useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Sidebar.css';
import logo from '../../assets/images/logo.png';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    const isActive = (path) => location.pathname === path;
    const isSettingsActive = ['/settings/doctors', '/settings/appointment-types', '/settings/add-number', '/settings/configure-twilio', '/settings/ai-agent', '/settings/connect-google-calendar', '/settings/practice-details']
        .includes(location.pathname);

    const navItems = [
        { path: '/calls', icon: 'fa-phone-volume', label: 'Calls' },
        { path: '/sms', icon: 'fa-message', label: 'SMS Inbox', badge: 4 },
        { path: '/calendar', icon: 'fa-calendar-days', label: 'Calendar' },
        { path: '/patients', icon: 'fa-users', label: 'Patients' },
    ];

    const settingsItems = [
        { path: '/settings/doctors', icon: 'fa-user-doctor', label: 'Doctors' },
        { path: '/settings/appointment-types', icon: 'fa-calendar-check', label: 'Appointment Types' },
        { path: '/settings/connect-google-calendar', icon: 'fa-calendar-plus', label: 'Connect Google Calendar' },
        { path: '/settings/practice-details', icon: 'fa-building', label: 'Practice Details' },
        // { path: '/settings/add-number', icon: 'fa-plus-circle', label: 'Add Number' },
        // { path: '/settings/configure-twilio', icon: 'fa-plug', label: 'Configure Twilio' },
        // { path: '/settings/ai-agent', icon: 'fa-robot', label: 'AI Agent' },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-nav">

                <div className="sidebar-logo">
                    <img src={logo} style={{ width: "100%" }} alt="DentalAI" />
                </div>
                {navItems.map((item) => (
                    <div
                        key={item.path}
                        className={`sidebar-item ${isActive(item.path) || (item.path === '/calls' && location.pathname === '/') ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <i className={`fas ${item.icon}`} />
                        <span>{item.label}</span>
                        {item.badge && <div className="sidebar-badge">{item.badge}</div>}
                    </div>
                ))}

                <div className="sidebar-divider" />
                <p className="sidebar-section-label">Settings</p>

                <div
                    className={`sidebar-settings-header ${isSettingsActive ? 'active' : ''}`}
                    onClick={() => setSettingsOpen(!settingsOpen)}
                >
                    <div className="left">
                        <i className="fas fa-gear" style={{ width: 20, textAlign: 'center' }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Settings</span>
                    </div>
                    <i className={`fas fa-chevron-up chevron ${!settingsOpen ? 'collapsed' : ''}`} />
                </div>

                <div className={`sidebar-submenu ${settingsOpen ? 'expanded' : 'collapsed'}`}>
                    {settingsItems.map((item) => (
                        <div
                            key={item.path}
                            className={`sidebar-sub-item ${isActive(item.path) ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <i className={`fas ${item.icon}`} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sidebar-footer">
                <div
                    className={`sidebar-item ${isLoggingOut ? 'disabled' : ''}`}
                    onClick={!isLoggingOut ? handleLogout : undefined}
                    style={{ opacity: isLoggingOut ? 0.7 : 1, cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
                >
                    <i className={isLoggingOut ? "fas fa-spinner fa-spin" : "fas fa-right-from-bracket"} />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
