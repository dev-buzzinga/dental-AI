import { useState } from 'react';
import { initialPhoneNumbers, initialDoctors } from '../../data/dummyData';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal, Toggle } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import '../../styles/Settings.css';

const AddNumberPage = () => {
    const [phoneNumbers, setPhoneNumbers] = useState(initialPhoneNumbers);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        number: '', label: '', doctor: '', isAI: false,
        type: 'Inbound / Outbound', status: true
    });
    const showToast = useToast();

    const filtered = phoneNumbers.filter((p) =>
        p.number.includes(searchTerm) || p.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ number: '', label: '', doctor: '', isAI: false, type: 'Inbound / Outbound', status: true });
        setModalOpen(true);
    };

    const openEditModal = (id) => {
        const p = phoneNumbers.find((n) => n.id === id);
        setEditingId(id);
        setFormData({
            number: p.number, label: p.label, doctor: p.doctor,
            isAI: p.isAI, type: p.type, status: p.status === 'Active',
        });
        setModalOpen(true);
    };

    const saveNumber = () => {
        if (!formData.number) { showToast('Please enter a phone number', 'message'); return; }
        if (editingId) {
            setPhoneNumbers((prev) => prev.map((p) => p.id === editingId ? {
                ...p, ...formData, status: formData.status ? 'Active' : 'Inactive',
                doctor: formData.isAI ? 'AI Agent' : formData.doctor,
            } : p));
            showToast('Number updated successfully', 'success');
        } else {
            const newId = phoneNumbers.length > 0 ? Math.max(...phoneNumbers.map((p) => p.id)) + 1 : 1;
            setPhoneNumbers((prev) => [...prev, {
                id: newId, ...formData, status: formData.status ? 'Active' : 'Inactive',
                doctor: formData.isAI ? 'AI Agent' : formData.doctor,
                added: 'Just now', initials: formData.isAI ? 'robot' : formData.doctor?.charAt(0) || '?',
                color: '#EDE9FE', textColor: '#7C3AED',
            }]);
            showToast('Number added successfully', 'success');
        }
        setModalOpen(false);
    };

    const deleteNumber = (id) => {
        setPhoneNumbers((prev) => prev.filter((p) => p.id !== id));
        showToast('Number removed', 'success');
    };

    const activeCount = phoneNumbers.filter((p) => p.status === 'Active').length;
    const assignedCount = phoneNumbers.filter((p) => p.doctor !== 'Unassigned').length;

    return (
        <div className="settings-page custom-scrollbar">
            <div className="settings-header">
                <div>
                    <h2 className="settings-title">Phone Numbers</h2>
                    <p className="settings-subtitle">Manage your Twilio phone numbers and assignments</p>
                </div>
                <button className="btn-primary" onClick={openAddModal}>
                    <i className="fas fa-plus" /> Add Number
                </button>
            </div>

            {/* Stats */}
            <div className="settings-stats">
                <div className="stat-card">
                    <div className="stat-card-value">{phoneNumbers.length}</div>
                    <div className="stat-card-label">Total Numbers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{assignedCount}</div>
                    <div className="stat-card-label">Doctors Assigned</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{activeCount}</div>
                    <div className="stat-card-label">Active Numbers</div>
                </div>
            </div>

            {/* Table */}
            <div className="phone-table-card">
                <div className="phone-table-header">
                    <span style={{ fontWeight: 600 }}>All Numbers</span>
                    <SearchInput placeholder="Search numbers..." value={searchTerm} onChange={setSearchTerm} />
                </div>
                <table className="phone-table">
                    <thead>
                        <tr>
                            <th>Number</th>
                            <th>Assigned To</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    <div className="phone-num-cell">
                                        <div className="phone-num-avatar" style={{ background: p.color, color: p.textColor }}>
                                            {p.isAI ? <i className="fas fa-robot" /> : p.initials}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.number}</div>
                                            <div className="phone-num-label">{p.label}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{p.doctor}</td>
                                <td>{p.type}</td>
                                <td>
                                    <span className={p.status === 'Active' ? 'phone-status-active' : 'phone-status-inactive'}>
                                        {p.status}
                                    </span>
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.added}</td>
                                <td>
                                    <button className="phone-action-btn" onClick={() => openEditModal(p.id)}><i className="fas fa-pen" /></button>
                                    <button className="phone-action-btn" onClick={() => deleteNumber(p.id)}><i className="fas fa-trash" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Number Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} width={480}>
                <div className="doctor-modal-header">
                    <span className="doctor-modal-title">{editingId ? 'Edit Number' : 'Add Number'}</span>
                    <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
                        <i className="fas fa-xmark" />
                    </button>
                </div>
                <div className="add-num-modal-body">
                    <label className="doctor-form-label">Assign To</label>
                    <div className="add-num-toggle-group">
                        <div
                            className={`add-num-toggle-card ${!formData.isAI ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, isAI: false })}
                        >
                            <i className="fas fa-user-doctor" style={{ fontSize: 20, color: !formData.isAI ? 'var(--primary)' : '#9CA3AF', marginBottom: 6 }} />
                            <div style={{ fontWeight: 600, fontSize: 13 }}>Doctor</div>
                        </div>
                        <div
                            className={`add-num-toggle-card ${formData.isAI ? 'selected' : ''}`}
                            onClick={() => setFormData({ ...formData, isAI: true })}
                        >
                            <i className="fas fa-robot" style={{ fontSize: 20, color: formData.isAI ? 'var(--primary)' : '#9CA3AF', marginBottom: 6 }} />
                            <div style={{ fontWeight: 600, fontSize: 13 }}>AI Agent</div>
                        </div>
                    </div>

                    {!formData.isAI && (
                        <>
                            <label className="doctor-form-label">Select Doctor</label>
                            <select
                                className="doctor-form-input"
                                value={formData.doctor}
                                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                            >
                                <option value="">Select...</option>
                                {initialDoctors.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </>
                    )}

                    <label className="doctor-form-label">Phone Number</label>
                    <input
                        className="doctor-form-input"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="+61 X XXXX XXXX"
                    />

                    <label className="doctor-form-label">Label</label>
                    <input
                        className="doctor-form-input"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        placeholder="e.g. Main Reception"
                    />

                    <label className="doctor-form-label">Number Type</label>
                    <div className="add-num-type-pills">
                        {['Inbound / Outbound', 'Inbound Only', 'Outbound Only'].map((t) => (
                            <div
                                key={t}
                                className={`add-num-type-pill ${formData.type === t ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, type: t })}
                            >
                                {t}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Status Active</span>
                        <Toggle on={formData.status} onToggle={() => setFormData({ ...formData, status: !formData.status })} />
                    </div>
                </div>

                <div className="doctor-modal-footer">
                    <button className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn-primary" onClick={saveNumber}>{editingId ? 'Update' : 'Add Number'}</button>
                </div>
            </Modal>
        </div>
    );
};

export default AddNumberPage;
