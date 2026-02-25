import { useState, useMemo } from 'react';
import { voices } from '../../data/dummyData';
import { Toggle } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import '../../styles/Settings.css';

const defaultPrompt = `You are a professional dental practice AI assistant for Smile Dental. Your role is to handle incoming calls and SMS messages. Be warm, empathetic, and efficient. Always:

• Greet patients by name when known
• Confirm appointment details clearly
• Offer alternative times if requested slot is unavailable
• Provide basic dental care advice (no diagnosis)
• Escalate to a real person when the conversation requires clinical judgment`;

const AIAgentPage = () => {
    const [selectedVoice, setSelectedVoice] = useState(voices[0]);
    const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
    const [genderFilter, setGenderFilter] = useState('All');
    const [voiceSearch, setVoiceSearch] = useState('');
    const [prompt, setPrompt] = useState(defaultPrompt);
    const [behaviours, setBehaviours] = useState({
        autoAnswer: true,
        recordCalls: true,
        transcribe: true,
        smartEscalation: false,
    });
    const showToast = useToast();

    const filteredVoices = useMemo(() => {
        let list = voices;
        if (genderFilter !== 'All') list = list.filter((v) => v.gender === genderFilter);
        if (voiceSearch) list = list.filter((v) => v.name.toLowerCase().includes(voiceSearch.toLowerCase()));
        return list;
    }, [genderFilter, voiceSearch]);

    const toggleBehaviour = (key) => setBehaviours((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="settings-page custom-scrollbar">
            <div className="settings-header">
                <div>
                    <h2 className="settings-title">AI Agent Configuration</h2>
                    <p className="settings-subtitle">Configure your AI assistant's voice, personality, and behaviour</p>
                </div>
                <button className="btn-primary" onClick={() => showToast('Agent settings saved', 'success')}>
                    <i className="fas fa-save" /> Save Agent
                </button>
            </div>

            <div className="ai-agent-layout">
                {/* Left Column */}
                <div>
                    {/* Voice Selector */}
                    <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                        <div className="ai-agent-section-title"><i className="fas fa-microphone" /> Agent Voice</div>
                        <button
                            className="voice-picker-btn"
                            onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                        >
                            <span>{selectedVoice.name}</span>
                            <i className={`fas fa-chevron-down`} style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.2s', transform: voiceDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                        </button>

                        {voiceDropdownOpen && (
                            <div className="voice-picker-dropdown fade-in">
                                <div className="voice-picker-filters">
                                    {['All', 'Male', 'Female'].map((g) => (
                                        <button
                                            key={g}
                                            className={`voice-filter-btn ${genderFilter === g ? 'active' : ''}`}
                                            onClick={() => setGenderFilter(g)}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={voiceSearch}
                                        onChange={(e) => setVoiceSearch(e.target.value)}
                                        style={{
                                            flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-btn)', fontSize: 12, outline: 'none',
                                        }}
                                    />
                                </div>
                                <div className="voice-list custom-scrollbar">
                                    {filteredVoices.map((v) => (
                                        <div
                                            key={v.id}
                                            className={`voice-item ${selectedVoice.id === v.id ? 'active' : ''}`}
                                            onClick={() => { setSelectedVoice(v); setVoiceDropdownOpen(false); }}
                                        >
                                            <span className="voice-item-name">{v.name}</span>
                                            <span className="voice-item-gender">{v.gender}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Agent Prompt */}
                    <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                        <div className="ai-agent-section-title"><i className="fas fa-file-lines" /> Agent Prompt</div>
                        <textarea
                            className="ai-prompt-textarea"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={8}
                        />
                        <div className="ai-prompt-counter">{prompt.length} / 2000 characters</div>
                    </div>

                    {/* Behaviour Toggles */}
                    <div className="ai-agent-card">
                        <div className="ai-agent-section-title"><i className="fas fa-sliders" /> Agent Behaviour</div>
                        {[
                            { key: 'autoAnswer', label: 'Auto-Answer Calls', desc: 'AI picks up when no staff is available' },
                            { key: 'recordCalls', label: 'Record All Calls', desc: 'Store recordings for compliance and training' },
                            { key: 'transcribe', label: 'Auto-Transcribe', desc: 'Generate transcripts for every call' },
                            { key: 'smartEscalation', label: 'Smart Escalation', desc: 'Auto-escalate complex requests to staff' },
                        ].map(({ key, label, desc }) => (
                            <div key={key} className="ai-behaviour-row">
                                <div>
                                    <div className="ai-behaviour-label">{label}</div>
                                    <div className="ai-behaviour-desc">{desc}</div>
                                </div>
                                <Toggle on={behaviours[key]} onToggle={() => toggleBehaviour(key)} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Preview */}
                <div>
                    <div className="ai-agent-card">
                        <div className="ai-agent-section-title"><i className="fas fa-eye" /> Agent Preview</div>
                        <div className="ai-preview-card">
                            <div className="ai-preview-icon"><i className="fas fa-robot" /></div>
                            <div className="ai-preview-name">DentalAI Assist</div>
                            <div className="ai-preview-label">{selectedVoice.name.split(' - ')[0]} Voice</div>
                            <button className="ai-preview-play">
                                <i className="fas fa-play" /> Play Sample
                            </button>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Active Features</div>
                            {Object.entries(behaviours).map(([key, on]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                    <i className={`fas ${on ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: on ? 'var(--success)' : '#D1D5DB', fontSize: 13 }} />
                                    <span style={{ fontSize: 13 }}>
                                        {key === 'autoAnswer' ? 'Auto-Answer' : key === 'recordCalls' ? 'Recording' : key === 'transcribe' ? 'Transcription' : 'Smart Escalation'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAgentPage;
