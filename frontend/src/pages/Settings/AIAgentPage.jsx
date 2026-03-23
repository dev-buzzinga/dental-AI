import { useState, useMemo } from 'react';
import { voices } from '../../data/dummyData';
import { Toggle } from '../../components/common/SearchInput';
import { useToast } from '../../components/Toast/Toast';
import AiAgentModelImage from '../../assets/images/ai-model.png';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [prompt, setPrompt] = useState('Hi this Laura from Sky NY dental');
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
        if (searchTerm) list = list.filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return list;
    }, [genderFilter, searchTerm]);

    const handleVoiceSelect = (voice) => {
        setSelectedVoice(voice);
        setVoiceDropdownOpen(false);
    };

    const toggleBehaviour = (key) => setBehaviours((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="practice-details-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div>
                        <h2 className="settings-title">AI Agent Configuration</h2>
                    </div>
                    <button className="btn-primary" onClick={() => showToast('Agent settings saved', 'success')}>
                        <i className="fas fa-save" /> Save Agent
                    </button>
                </div>
            </div>

            <div className="settings-page-content">
                <div className="ai-agent-layout">
                    {/* Left Column */}
                    <div>
                        {/* Voice Selector */}
                        <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                            <div className="ai-agent-section-title"><i className="fas fa-microphone" /> Voice</div>
                            <button
                                className="voice-picker-btn"
                                onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                            >
                                <i className="fas fa-waveform" style={{ marginRight: 8 }} />
                                <span>{selectedVoice.name} - {selectedVoice.attitude}</span>
                                <i className="fas fa-chevron-down" style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.2s', transform: voiceDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                            </button>

                            {voiceDropdownOpen && (
                                <div className="voice-picker-dropdown fade-in">
                                    <div className="voice-dropdown-header">
                                        <div className="voice-filters">
                                            <div className="filter-section">
                                                <span className="filter-title">Filters</span>
                                                <button className="clear-filters-btn">Clear Filters</button>
                                            </div>
                                            <div className="filter-section">
                                                <span className="filter-title">Gender</span>
                                                <i className="fas fa-chevron-up" style={{ fontSize: 10, color: '#9CA3AF' }} />
                                                <label className="checkbox-container">
                                                    <input type="checkbox" checked={genderFilter === 'All'} onChange={() => setGenderFilter('All')} />
                                                    <span className="checkmark"></span>
                                                    All
                                                </label>
                                                <label className="checkbox-container">
                                                    <input type="checkbox" checked={genderFilter === 'Male'} onChange={() => setGenderFilter('Male')} />
                                                    <span className="checkmark"></span>
                                                    Male
                                                </label>
                                                <label className="checkbox-container">
                                                    <input type="checkbox" checked={genderFilter === 'Female'} onChange={() => setGenderFilter('Female')} />
                                                    <span className="checkmark"></span>
                                                    Female
                                                </label>
                                            </div>
                                        </div>
                                        <div className="voice-search">
                                            <i className="fas fa-search" style={{ color: '#9CA3AF' }} />
                                            <input
                                                type="text"
                                                placeholder="Search for a voice..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="voice-list custom-scrollbar">
                                        {filteredVoices.map((voice) => (
                                            <div
                                                key={voice.id}
                                                className={`voice-list-item ${selectedVoice.id === voice.id ? 'selected' : ''}`}
                                                onClick={() => handleVoiceSelect(voice)}
                                            >
                                                <i className="fas fa-play-circle" style={{ color: '#9CA3AF', fontSize: 16 }} />
                                                <div className="voice-details">
                                                    <div className="voice-name">{voice.name} - {voice.attitude}</div>
                                                    <div className="voice-gender">• {voice.gender}</div>
                                                </div>
                                                {selectedVoice.id === voice.id && <i className="fas fa-check" style={{ color: 'var(--primary)' }} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Agent Prompt */}
                        <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                            <div className="ai-agent-section-title"><i className="fas fa-file-lines" /> Agent Prompt</div>
                            <p className="prompt-description">
                                Give AI agent a brief introduction prompt. This will be used to introduce agent to users for inbound calls.
                            </p>
                            <textarea
                                className="ai-prompt-textarea"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                placeholder="Enter agent prompt..."
                            />
                            <div className="ai-prompt-counter">{prompt.length} / 250</div>
                        </div>

                        {/* Behaviour Toggles */}
                        {/* <div className="ai-agent-card">
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
                    </div> */}
                    </div>

                    {/* Right Column - Preview */}
                    <div>
                        <div className="ai-agent-card">
                            <div className="ai-agent-section-title"><i className="fas fa-eye" /> Agent</div>
                            <div className="agent-display-card">
                                <div className="agent-header">
                                    <div className="agent-avatar">
                                        <img src={AiAgentModelImage} alt="Agent" style={{ width: 240, height: 240, borderRadius: '16px', objectFit: 'cover' }} />
                                    </div>
                                </div>
                                <div className="agent-info">
                                    <h3 className="agent-name">Agent</h3>
                                    <p className="agent-voice-info">{selectedVoice.name}</p>
                                </div>
                                <button className="agent-play-btn">
                                    <i className="fas fa-play" /> Play
                                </button>
                            </div>
                        </div>

                        {/* <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Active Features</div>
                            {Object.entries(behaviours).map(([key, on]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                    <i className={`fas ${on ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: on ? 'var(--success)' : '#D1D5DB', fontSize: 13 }} />
                                    <span style={{ fontSize: 13 }}>
                                        {key === 'autoAnswer' ? 'Auto-Answer' : key === 'recordCalls' ? 'Recording' : key === 'transcribe' ? 'Transcription' : 'Smart Escalation'}
                                    </span>
                                </div>
                            ))}
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAgentPage;
