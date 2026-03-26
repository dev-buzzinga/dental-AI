import { useState, useEffect, useRef, useMemo } from 'react';
import Lottie from 'lottie-react';
import { useToast } from '../../components/Toast/Toast';
import waveanimation from '../../assets/waveform.json';
import '../../styles/Settings.css';

import {
    getAIAgentVoices,
    getAIAgentDetails,
    updateAIAgentDetails,
    generateAIAgentPreviewAudio,
} from '../../service/aiAgent.js';

// ─── Avatar imports ────────────────────────────────────────────────────────────
import LauraAvatar from '../../assets/images/ai_agent_avtaars/Laura.png';
import RiverAvatar from '../../assets/images/ai_agent_avtaars/River.png';
import AriaAvatar from '../../assets/images/ai_agent_avtaars/Aria.png';
import AliceAvatar from '../../assets/images/ai_agent_avtaars/Alice.png';
import BrianAvatar from '../../assets/images/ai_agent_avtaars/Brian.png';
import GeorgeAvatar from '../../assets/images/ai_agent_avtaars/George.png';
import SarahAvatar from '../../assets/images/ai_agent_avtaars/Sarah.png';
import MatildaAvatar from '../../assets/images/ai_agent_avtaars/Matilda.png';
import LiamAvatar from '../../assets/images/ai_agent_avtaars/Liam.png';
import DanielAvatar from '../../assets/images/ai_agent_avtaars/Daniel.png';
import BillAvatar from '../../assets/images/ai_agent_avtaars/Bill.png';
import MonikaAvatar from '../../assets/images/ai_agent_avtaars/Monika.png';
import JessicaAvatar from '../../assets/images/ai_agent_avtaars/Jessica.png';
import LiyaAvatar from '../../assets/images/ai_agent_avtaars/Liya.png';
import CharlotteAvatar from '../../assets/images/ai_agent_avtaars/Charlotte.png';
import CallumAvatar from '../../assets/images/ai_agent_avtaars/Callum.png';
import WillAvatar from '../../assets/images/ai_agent_avtaars/Will.png';
import EricAvatar from '../../assets/images/ai_agent_avtaars/Eric.png';
import Boy1Avatar from '../../assets/images/ai_agent_avtaars/Boy 1.png';
import ChrisAvatar from '../../assets/images/ai_agent_avtaars/Chris.png';
import CharlieAvatar from '../../assets/images/ai_agent_avtaars/Charlie.png';
import AriaOldLadyAvatar from '../../assets/images/ai_agent_avtaars/Aria old lady.png';

// ─── Avatar helpers ────────────────────────────────────────────────────────────
function normalizeAvatarKey(name) {
    if (!name) return '';
    return String(name).trim().toLowerCase().replace(/\s+/g, ' ').replace(/['']/g, '').replace(/[^a-z0-9 ]/g, '');
}

const femaleVoiceNames = [
    'aria', 'sarah', 'laura', 'river', 'charlotte', 'alice', 'matilda',
    'jessica', 'liya', 'lily', 'monika', 'monika sogam',
];
const femaleVoiceNameKeySet = new Set(femaleVoiceNames.map(normalizeAvatarKey));

const isFemaleVoiceName = (name) => {
    const key = normalizeAvatarKey(name);
    if (!key) return false;
    if (femaleVoiceNameKeySet.has(key)) return true;
    const firstWord = key.split(' ')[0];
    return Boolean(firstWord && femaleVoiceNameKeySet.has(firstWord));
};

const avatarMapping = {
    'laura': LauraAvatar,
    'river': RiverAvatar,
    'aria': AriaAvatar,
    'alice': AliceAvatar,
    'brian': BrianAvatar,
    'george': GeorgeAvatar,
    'sarah': SarahAvatar,
    'matilda': MatildaAvatar,
    'liam': LiamAvatar,
    'daniel': DanielAvatar,
    'bill': BillAvatar,
    'monika': MonikaAvatar,
    'monika sogam': MonikaAvatar,
    'jessica': JessicaAvatar,
    'liya': LiyaAvatar,
    'lily': LiyaAvatar,
    'charlotte': CharlotteAvatar,
    'clyde': CharlotteAvatar,
    'callum': CallumAvatar,
    'will': WillAvatar,
    'eric': EricAvatar,
    'rachel': Boy1Avatar,
    'chris': ChrisAvatar,
    'charlie': CharlieAvatar,
    'aria old lady': AriaOldLadyAvatar,
};

const FEMALE_COVER_AVATAR = LauraAvatar;
const MALE_COVER_AVATAR = Boy1Avatar;

const getAvatarSrcForVoiceName = (voiceName) => {
    const key = normalizeAvatarKey(voiceName);
    if (!key) return FEMALE_COVER_AVATAR;
    if (avatarMapping[key]) return avatarMapping[key];
    const firstWord = key.split(' ')[0];
    if (firstWord && avatarMapping[firstWord]) return avatarMapping[firstWord];
    return isFemaleVoiceName(voiceName) ? FEMALE_COVER_AVATAR : MALE_COVER_AVATAR;
};

// ─── Component ─────────────────────────────────────────────────────────────────
const AIAgentPage = () => {
    const showToast = useToast();
    const audioRef = useRef(null);
    const audioPreviewRef = useRef(null);
    const lottieRef = useRef(null);



    // Data state
    const [voice, setVoice] = useState('');
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceDetails, setSelectedVoiceDetails] = useState(null);
    const [agentPrompt, setAgentPrompt] = useState('');

    // UI state
    const [loading, setLoading] = useState(true);
    const [btnLoading, setBtnLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingPreview, setPlayingPreview] = useState(null); // voiceId in dropdown

    useEffect(() => {
        if (isPlaying) {
            lottieRef.current?.play();
        } else {
            lottieRef.current?.stop();
        }
    }, [isPlaying]);

    // Voice picker state
    const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
    const [genderFilter, setGenderFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Validation errors
    const [errors, setErrors] = useState({ prompt: '', voice: '' });

    // ── Fetch on mount ──────────────────────────────────────────────────────────
    const fetchDetails = async () => {
        setLoading(true);
        try {
            const voices = await getAIAgentVoices();
            if (voices?.length) setAvailableVoices(voices);

            const agent = await getAIAgentDetails();
            if (agent?.voice_id) {
                setVoice(agent.voice_id);
                const match = voices?.find((v) => v.voiceId === agent.voice_id);
                setSelectedVoiceDetails(match || null);
                setAgentPrompt(agent.introduction_prompt || '');
            }
        } catch (err) {
            console.error('fetchDetails error:', err);
            showToast('Failed to load AI agent settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, []);

    // ── Voice picker helpers ────────────────────────────────────────────────────
    const filteredVoices = useMemo(() => {
        let list = availableVoices;
        if (genderFilter === 'Female') list = list.filter((v) => isFemaleVoiceName(v.name));
        if (genderFilter === 'Male') list = list.filter((v) => !isFemaleVoiceName(v.name));
        if (searchTerm) list = list.filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return list;
    }, [availableVoices, genderFilter, searchTerm]);

    const handleVoiceSelect = (voiceData) => {
        setVoice(voiceData.voiceId);
        setSelectedVoiceDetails(voiceData);
        setVoiceDropdownOpen(false);
        setErrors((prev) => ({ ...prev, voice: '' }));
    };

    const toggleVoicePreview = (e, voiceData) => {
        e.stopPropagation();
        if (playingPreview === voiceData.voiceId) {
            audioPreviewRef.current?.pause();
            setPlayingPreview(null);
        } else {
            if (audioPreviewRef.current) {
                audioPreviewRef.current.src = voiceData.previewUrl;
                audioPreviewRef.current.play().catch((err) => console.error('Audio play error', err));
                setPlayingPreview(voiceData.voiceId);
            }
        }
    };

    // ── Save ────────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const newErrors = { prompt: '', voice: '' };
        let hasError = false;
        if (!voice) { newErrors.voice = 'Voice selection is required'; hasError = true; }
        if (!agentPrompt.trim()) { newErrors.prompt = 'Agent prompt is required'; hasError = true; }
        setErrors(newErrors);
        if (hasError) return;

        try {
            setBtnLoading(true);
            await updateAIAgentDetails({ voiceId: voice, introductionPrompt: agentPrompt });
            showToast('AI Agent settings saved successfully', 'success');
        } catch (err) {
            console.error('handleSave error:', err);
            showToast('Failed to save AI agent settings', 'error');
        } finally {
            setBtnLoading(false);
        }
    };

    // ── Main audio preview (right column play button) ───────────────────────────
    const toggleAudio = async () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }
        const text = agentPrompt?.trim();
        if (!text || !voice) {
            showToast('Select a voice and enter an agent prompt to preview', 'error');
            return;
        }
        try {
            setPreviewLoading(true);
            const blob = await generateAIAgentPreviewAudio({ text, voiceId: voice });
            const blobUrl = URL.createObjectURL(blob);
            audioRef.current.src = blobUrl;
            await audioRef.current.play();
            setIsPlaying(true);
        } catch (err) {
            console.error('toggleAudio error:', err);
            showToast('Failed to play preview audio', 'error');
        } finally {
            setPreviewLoading(false);
        }
    };

    // ── Loading skeleton ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="practice-details-page custom-scrollbar">
                <div className="practice-header-section">
                    <div className="practice-header-content">
                        <h2 className="settings-title">AI Agent Configuration</h2>
                        <div style={{ width: 100, height: 36, background: '#f0f0f0', borderRadius: 8 }} />
                    </div>
                </div>
                <div className="settings-page-content">
                    <div className="ai-agent-layout">
                        <div className="ai-agent-left-column">
                            <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                                <div style={{ width: 60, height: 20, background: '#f0f0f0', borderRadius: 4, marginBottom: 12 }} />
                                <div style={{ width: '100%', height: 40, background: '#f5f5f5', borderRadius: 8 }} />
                            </div>
                            <div className="ai-agent-card">
                                <div style={{ width: 100, height: 20, background: '#f0f0f0', borderRadius: 4, marginBottom: 12 }} />
                                <div style={{ width: '100%', height: 120, background: '#f5f5f5', borderRadius: 8 }} />
                            </div>
                        </div>
                        <div className="ai-agent-right-column">
                            <div className="ai-agent-card">
                                <div style={{ width: 60, height: 20, background: '#f0f0f0', borderRadius: 4, marginBottom: 16 }} />
                                <div style={{ width: 240, height: 240, background: '#f0f0f0', borderRadius: 16, margin: '0 auto 16px' }} />
                                <div style={{ width: 80, height: 36, background: '#f5f5f5', borderRadius: 8, margin: '0 auto' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main render ─────────────────────────────────────────────────────────────
    return (
        <div className="practice-details-page custom-scrollbar">
            <div className="practice-header-section">
                <div className="practice-header-content">
                    <div>
                        <h2 className="settings-title">AI Agent Configuration</h2>
                    </div>

                </div>
            </div>

            <div className="settings-page-content">
                <div className="ai-agent-layout">
                    {/* Left Column */}
                    <div className="ai-agent-left-column">

                        {/* Voice Selector */}
                        <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                            <div className="ai-agent-section-title"><i className="fas fa-microphone" /> Voice</div>

                            <div className="voice-picker-wrapper" style={{ position: 'relative' }}>
                                <button
                                    className="voice-picker-btn"
                                    onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                                >
                                    <i className="fas fa-wave-square" style={{ marginRight: 8 }} />
                                    <span>{selectedVoiceDetails ? selectedVoiceDetails.name : 'Select Voice'}</span>
                                    <i
                                        className="fas fa-chevron-down"
                                        style={{
                                            fontSize: 12,
                                            color: '#9CA3AF',
                                            transition: 'transform 0.2s',
                                            transform: voiceDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                        }}
                                    />
                                </button>
                                {errors.voice && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.voice}</div>}

                                {voiceDropdownOpen && (
                                    <div className="voice-picker-dropdown fade-in">
                                        {/* Sidebar filters */}
                                        <div className="voice-picker-sidebar">
                                            <div className="filter-group">
                                                <div className="filter-group-title">
                                                    <span className="filter-title-large">Gender</span>
                                                    <button
                                                        className="clear-filters-btn"
                                                        onClick={() => { setGenderFilter('All'); setSearchTerm(''); }}
                                                        style={{ fontSize: 11 }}
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                                {['All', 'Male', 'Female'].map((g) => (
                                                    <label key={g} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            checked={genderFilter === g}
                                                            onChange={() => setGenderFilter(g)}
                                                        />
                                                        {g}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Voice list */}
                                        <div className="voice-picker-main">
                                            <div className="voice-search-container">
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
                                                {filteredVoices.map((v) => (
                                                    <div
                                                        key={v.voiceId}
                                                        className={`voice-list-item ${voice === v.voiceId ? 'selected' : ''}`}
                                                        onClick={() => handleVoiceSelect(v)}
                                                    >
                                                        <button
                                                            className="voice-play-circle"
                                                            onClick={(e) => toggleVoicePreview(e, v)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                        >
                                                            <i
                                                                className={`fas ${playingPreview === v.voiceId ? 'fa-light fa-circle-pause' : 'fa-light fa-circle-play'}`}
                                                                style={{ fontSize: '10px', marginLeft: playingPreview === v.voiceId ? 0 : '2px' }}
                                                            />
                                                        </button>
                                                        <div className="voice-details">
                                                            <div className="voice-name">{v.name}</div>
                                                            <div className="voice-gender">
                                                                <span className="gender-dot" />
                                                                {isFemaleVoiceName(v.name) ? 'Female' : 'Male'}
                                                            </div>
                                                        </div>
                                                        {voice === v.voiceId && (
                                                            <i className="fas fa-check" style={{ color: '#6F2AC3', fontSize: '16px' }} />
                                                        )}
                                                    </div>
                                                ))}
                                                {filteredVoices.length === 0 && (
                                                    <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center', fontSize: 14 }}>
                                                        No voices found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Hidden audio element for dropdown preview */}
                            <audio ref={audioPreviewRef} onEnded={() => setPlayingPreview(null)} />
                        </div>

                        {/* Agent Prompt */}
                        <div className="ai-agent-card" style={{ marginBottom: 24 }}>
                            <div className="ai-agent-section-title"><i className="fas fa-file-lines" /> Agent Prompt</div>
                            <p className="prompt-description">
                                Give AI agent a brief introduction prompt. This will be used to introduce agent to users for inbound calls.
                            </p>
                            <textarea
                                className="ai-prompt-textarea"
                                value={agentPrompt}
                                onChange={(e) => {
                                    if (e.target.value.length <= 250) setAgentPrompt(e.target.value);
                                }}
                                rows={6}
                                placeholder="Enter agent prompt..."
                            />
                            <div className="ai-prompt-counter">{agentPrompt.length} / 250</div>
                            {errors.prompt && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.prompt}</div>}
                        </div>
                    </div>

                    {/* Right Column — Agent Preview */}
                    <div className="ai-agent-right-column">
                        <div className="ai-agent-card">
                            <div className="ai-agent-preview-title">Agent</div>
                            <div className="agent-display-card">
                                <div className="agent-info" style={{ textAlign: 'center' }}>
                                    <h3 className="agent-name">
                                        {selectedVoiceDetails ? (
                                            `${selectedVoiceDetails.name}${selectedVoiceDetails.description ? ` - ${selectedVoiceDetails.description}` : ''}`
                                        ) : 'Select a Voice'}
                                    </h3>
                                </div>
                                <div className="agent-header">
                                    <div className="agent-avatar">
                                        <img
                                            src={getAvatarSrcForVoiceName(selectedVoiceDetails?.name)}
                                            alt={selectedVoiceDetails?.name || 'AI Agent'}
                                        />
                                    </div>
                                </div>


                                {/* Play button */}
                                <button
                                    className="agent-play-btn-circular"
                                    onClick={toggleAudio}
                                    disabled={previewLoading}
                                >
                                    {previewLoading ? (
                                        <i className="fas fa-spinner fa-spin" />
                                    ) : (
                                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
                                    )}
                                </button>

                                {/* Waveform animation */}
                                <div className={`ai-agent-waveform ${!isPlaying ? 'ai-agent-waveform--idle' : ''}`}>
                                    <Lottie 
                                        animationData={waveanimation} 
                                        loop={true} 
                                        autoplay={false}
                                        lottieRef={lottieRef}
                                    />
                                </div>

                                {/* Hidden audio element for main preview */}
                                <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

                            </div>
                        </div>
                    </div>
                </div>
                <button className="btn-primary" onClick={handleSave} disabled={btnLoading}>
                    {btnLoading ? <i className="fas fa-spinner fa-spin" /> : ''}
                    {' '}Save Agent
                </button>
            </div>
        </div>
    );
};

export default AIAgentPage;
