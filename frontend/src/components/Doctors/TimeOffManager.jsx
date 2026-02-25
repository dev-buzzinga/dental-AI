import React, { useState, useEffect } from "react";

const TimeOffManager = ({ initialOffDays = [], onChange, error }) => {
    const [offDays, setOffDays] = useState([]);

    useEffect(() => {
        // Parse initialOffDays if they are stringified
        const parsed = (initialOffDays || []).map(day => {
            if (typeof day === "string") {
                try {
                    return JSON.parse(day);
                } catch (e) {
                    return day;
                }
            }
            return day;
        });
        setOffDays(parsed);
    }, [initialOffDays]);

    const handleAdd = () => {
        const updated = [...offDays, { name: "", from: "", to: "" }];
        setOffDays(updated);
        onChange(updated);
    };

    const handleRemove = (index) => {
        const updated = offDays.filter((_, i) => i !== index);
        setOffDays(updated);
        onChange(updated);
    };

    const handleChange = (index, field, value) => {
        const updated = [...offDays];
        updated[index][field] = value;
        setOffDays(updated);
        onChange(updated);
    };

    return (
        <div className="off-days-step">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>Off Days / Holidays</h3>
                    {error && <span className="field-error-text">{error}</span>}
                </div>
                <button className="add-off-day-btn btn-primary" onClick={handleAdd}>
                    <i className="fas fa-plus" style={{ marginRight: 6 }} /> Add Off Day
                </button>
            </div>

            {offDays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', border: '1px dashed #D1D5DB', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>No off days added yet.</p>
                </div>
            ) : (
                <div className="off-days-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {offDays.map((day, index) => (
                        <div key={index} className="off-day-item" style={{
                            background: '#F9FAFB',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'end' }}>
                                <button className="remove-day-btn" style={{ color: '#EF4444' }} onClick={() => handleRemove(index)}>
                                    <i className="fas fa-trash-alt" />
                                </button>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '12px', marginBottom: '4px' }}>Reason / Holiday Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Annual Leave"
                                    value={day.name}
                                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>From</label>
                                    <input
                                        type="date"
                                        value={day.from}
                                        onChange={(e) => handleChange(index, 'from', e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', marginBottom: '4px' }}>To</label>
                                    <input
                                        type="date"
                                        value={day.to}
                                        onChange={(e) => handleChange(index, 'to', e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimeOffManager;
