import './common.css';

export const SearchInput = ({ placeholder = 'Search...', value, onChange, className = '' }) => (
    <div className={`search-input-wrapper ${className}`}>
        <i className="fas fa-magnifying-glass search-icon" />
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="search-input"
        />
    </div>
);

export const Toggle = ({ on, onToggle, size = 'md' }) => {
    const cls = size === 'sm' ? 'toggle-sm' : 'toggle-md';
    return (
        <div className={`toggle ${cls} ${on ? 'toggle-on' : 'toggle-off'}`} onClick={onToggle}>
            <div className={`toggle-knob ${on ? 'active' : ''}`} />
        </div>
    );
};

export const Modal = ({ open, onClose, children, width = 480 }) => {
    if (!open) return null;
    return (
        <div className="modal-container">
            <div className="modal-overlay" onClick={onClose} />
            <div className="modal-content" style={{ width }}>
                {children}
            </div>
        </div>
    );
};
