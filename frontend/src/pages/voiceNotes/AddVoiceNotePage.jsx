import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/VoiceNotes.css';
import VoiceTranscriptPanel from '../../components/VoiceNotes/VoiceTranscriptPanel';
import AISummaryPanel from '../../components/VoiceNotes/AISummaryPanel';
import AddTemplateModal from '../../components/VoiceNotes/AddTemplateModal';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import aiScribeService from '../../service/ai-scribe';

const AddVoiceNotePage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDetails, setNewTemplateDetails] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [patientId, setPatientId] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [dateCreated, setDateCreated] = useState(() => new Date().toISOString().slice(0, 10));
    const [templateId, setTemplateId] = useState('');
    const [description, setDescription] = useState('');
    const [transcript, setTranscript] = useState('');
    const [summary, setSummary] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState('');
    const [wsConnection, setWsConnection] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [voiceNoteId, setVoiceNoteId] = useState(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);

    const liveTranscriptRef = useRef(transcript);
    const recordingIntervalRef = useRef(null);
    const shouldUploadOnStopRef = useRef(true);

    const selectedPatient = useMemo(
        () => patients.find((p) => p.id === patientId),
        [patientId, patients]
    );

    const selectedDoctor = useMemo(
        () => doctors.find((d) => d.id === doctorId),
        [doctorId, doctors]
    );

    useEffect(() => {
        liveTranscriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        const fetchDropdownData = async () => {
            if (!user?.id) return;
            setIsLoadingDropdowns(true);

            try {
                const [{ data: patientsData, error: patientsError }, { data: doctorsData, error: doctorsError }, { data: templatesData, error: templatesError }] =
                    await Promise.all([
                        supabase
                            .from('patients')
                            .select('id, name, phone, email')
                            .eq('user_id', user.id),
                        supabase
                            .from('doctors')
                            .select('id, name')
                            .eq('user_id', user.id),
                        supabase
                            .from('voice_notes_template')
                            .select('id, name, details')
                            .eq('user_id', user.id),
                    ]);

                if (patientsError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching patients:', patientsError);
                } else {
                    setPatients(patientsData || []);
                }

                if (doctorsError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching doctors:', doctorsError);
                } else {
                    setDoctors(doctorsData || []);
                }

                if (templatesError) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching templates:', templatesError);
                } else {
                    setTemplates(templatesData || []);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching dropdown data:', error);
            } finally {
                setIsLoadingDropdowns(false);
            }
        };

        fetchDropdownData();
    }, [user]);

    const connectWebSocket = (newVoiceNoteId) => {
        return new Promise((resolve, reject) => {
            if (!newVoiceNoteId) {
                console.error('❌ No voiceNoteId available');
                reject('No voiceNoteId');
                return;
            }

            const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('http', 'ws')}/ws/transcribe?voiceNoteId=${newVoiceNoteId}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setIsConnected(true);
                setWsConnection(ws);
                resolve(ws);
            };

            ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            };

            ws.onclose = () => {
                console.log('🔌 WebSocket closed');
                setIsConnected(false);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'transcript' && data.text) {
                        setTranscript((prev) => {
                            const newTranscript = prev ? `${prev} ${data.text}` : data.text;
                            return newTranscript;
                        });
                    }
                } catch (err) {
                    console.error('❌ Error parsing ws message:', err);
                }
            };
        });
    };

    const disconnectWebSocket = () => {
        if (wsConnection) {
            wsConnection.close();
            setWsConnection(null);
            setIsConnected(false);
        }
    };

    const handleSaveVoiceNote = async () => {
        try {
            const payload = {
                user_id: user.id,
                patient_id: patientId,
                doctor_id: doctorId,
                template_id: templateId || null,
                description: description || null,
                date_created: dateCreated,
            };

            const response = await aiScribeService.createAiScribe(payload);

            if (response.data && response.data.success && response.data.data) {
                return response.data.data.id;
            }

            throw new Error('Failed to create voice note');
        } catch (error) {
            console.error('Error saving voice note:', error);
            alert('Failed to create voice note. Please try again.');
            return null;
        }
    };

    const startRecording = async () => {
        let newVoiceNoteId = voiceNoteId;

        // Save voice note metadata first if not saved
        if (!voiceNoteId) {
            setIsSavingNote(true);
            newVoiceNoteId = await handleSaveVoiceNote();
            setIsSavingNote(false);
        }

        if (!newVoiceNoteId) return;

        setVoiceNoteId(newVoiceNoteId);

        try {
            // Step 1: Connect WebSocket for live transcription
            const ws = await connectWebSocket(newVoiceNoteId);

            // Step 2: Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            const chunks = [];

            // Step 3: On each audio chunk, send to server via WebSocket
            recorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);

                    // Send audio data to WebSocket for transcription
                    if (ws.readyState === WebSocket.OPEN) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64Audio = reader.result.split(',')[1];
                            ws.send(JSON.stringify({
                                type: 'audio',
                                data: base64Audio
                            }));
                        };
                        reader.readAsDataURL(event.data);
                    }
                }
            };

            // Step 4: When recording stops
            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                setAudioChunks(chunks);
                setAudioBlob(audioBlob);

                // Generate AI summary with the complete transcript
                if (shouldUploadOnStopRef.current) {
                    uploadAudioAndGenerateSummary(audioBlob, newVoiceNoteId);
                }
            };

            // Step 5: Start recording
            recorder.start(1000); // Capture data every 1 second
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            // Timer for recording duration
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording. Check microphone permissions.');
        }
    };

    const pauseRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            setIsPaused(true);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            setIsPaused(false);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsPaused(false);
            clearInterval(recordingIntervalRef.current);
            disconnectWebSocket();
        }
    };

    const handleToggleRecording = () => {
        if (!isRecording) {
            startRecording();
        } else if (isPaused) {
            resumeRecording();
        } else {
            pauseRecording();
        }
    };

    const uploadAudioAndGenerateSummary = async (blob, noteId) => {
        const currentVoiceNoteId = noteId || voiceNoteId;

        if (!blob || !currentVoiceNoteId) return;

        // Upload audio
        setIsUploadingAudio(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');
            formData.append('duration', recordingTime.toString());

            const res = await aiScribeService.uploadAiScribeAudio(currentVoiceNoteId, formData);

            if (res.data && res.data.url) {
                setAudioUrl(res.data.url);
            }
        } catch (error) {
            console.error('Upload audio error:', error);
            alert('Failed to upload audio');
        } finally {
            setIsUploadingAudio(false);
        }

        // Generate summary
        const patient = patients.find(p => p.id === patientId);
        const doctor = doctors.find(d => d.id === doctorId);
        const selectedTemplate = templates.find(t => t.id === templateId);

        setIsGeneratingSummary(true);
        try {
            const payload = {
                transcript: liveTranscriptRef.current,
                patient_name: patient ? patient.name : '',
                doctor_name: doctor ? doctor.name : '',
                template: selectedTemplate ? selectedTemplate.details : description
            };

            const response = await aiScribeService.generateAiScribeSummary(currentVoiceNoteId, payload);

            if (response.data && response.data.success && response.data.data) {
                setSummary(response.data.data.ai_summary);
            }
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            alert('Failed to generate AI summary. Try again.');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleClose = () => {
        navigate('/voice-notes');
    };

    const handleDeleteSummary = () => {
        setSummary('');
    };

    const handleRegenerateSummary = async () => {
        if (!transcript || !voiceNoteId) {
            alert('Please record audio first');
            return;
        }

        const patient = patients.find(p => p.id === patientId);
        const doctor = doctors.find(d => d.id === doctorId);
        const selectedTemplate = templates.find(t => t.id === templateId);

        setIsGeneratingSummary(true);
        try {
            const payload = {
                transcript: liveTranscriptRef.current,
                patient_name: patient ? patient.name : '',
                doctor_name: doctor ? doctor.name : '',
                template: selectedTemplate ? selectedTemplate.details : description
            };

            const response = await aiScribeService.generateAiScribeSummary(voiceNoteId, payload);

            if (response.data && response.data.success && response.data.data) {
                setSummary(response.data.data.ai_summary);
            }
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            alert('Failed to generate AI summary. Try again.');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            disconnectWebSocket();
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, [mediaRecorder, wsConnection]);

    const handleCopySummary = () => {
        if (!summary) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(summary).catch(() => {
                // swallow clipboard errors in placeholder mode
            });
        }
    };

    const handleExportPdf = () => {
        // Placeholder only – no real export
        // Could be replaced with real export logic later
        // eslint-disable-next-line no-alert
        alert('PDF export is not implemented in this prototype.');
    };

    const handleSaveNewTemplate = async () => {
        if (!user?.id || !newTemplateName.trim() || isSavingTemplate) return;

        setIsSavingTemplate(true);
        try {
            const { data, error } = await supabase
                .from('voice_notes_template')
                .insert({
                    user_id: user.id,
                    name: newTemplateName.trim(),
                    details: newTemplateDetails.trim() || null,
                })
                .select('id, name, details')
                .single();

            if (error) {
                // eslint-disable-next-line no-console
                console.error('Error saving template:', error);
                return;
            }

            if (data) {
                setTemplates((prev) => [...prev, data]);
                setTemplateId(data.id);
                setNewTemplateName('');
                setNewTemplateDetails('');
                setIsAddingTemplate(false);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Unexpected error saving template:', error);
        } finally {
            setIsSavingTemplate(false);
        }
    };

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <h2 className="voice-notes-title">Add Voice Notes</h2>
                </div>
            </div>
            <div className="voice-notes-content" style={{ paddingTop: 0 }}>
                <div className="voice-notes-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-body">
                        <div className="voice-notes-top-row">
                            <div className="voice-notes-field">
                                <SearchableDropdown
                                    label="Patient Name"
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading patients...' : 'Select patient'}
                                    options={patients}
                                    value={patientId}
                                    onChange={(opt) => setPatientId(opt?.id || '')}
                                    searchKeys={['name', 'phone', 'email']}
                                    renderOption={(p) => (
                                        <span>
                                            {p.name}
                                            {p.phone ? ` - ${p.phone}` : ''}
                                            {p.email ? ` (${p.email})` : ''}
                                        </span>
                                    )}
                                    displayValue={(p) => {
                                        if (!p) return '';
                                        return `${p.name}${p.phone ? ` - ${p.phone}` : ''}${p.email ? ` (${p.email})` : ''
                                            }`;
                                    }}
                                />
                            </div>

                            <div className="voice-notes-field">
                                <SearchableDropdown
                                    label="Doctor Name"
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading doctors...' : 'Select doctor'}
                                    options={doctors}
                                    value={doctorId}
                                    onChange={(opt) => setDoctorId(opt?.id || '')}
                                    searchKeys={['name']}
                                />
                            </div>

                            <div className="voice-notes-field">
                                <div className="sd-container">
                                    <label>Date Created</label>
                                    <input
                                        type="date"
                                        value={dateCreated}
                                        onChange={(e) => setDateCreated(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="voice-notes-field">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                    <label>Select Template</label>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{
                                            paddingInline: 10,
                                            fontSize: 12,
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            color: 'var(--primary)',
                                            backgroundColor: 'var(--primary-light)',
                                        }}
                                        onClick={() => setIsAddingTemplate(true)}
                                    >
                                        + New
                                    </button>
                                </div>
                                <SearchableDropdown
                                    label=""
                                    required={false}
                                    placeholder={isLoadingDropdowns ? 'Loading templates...' : 'Select template'}
                                    options={templates}
                                    value={templateId}
                                    onChange={(opt) => {
                                        const id = opt?.id || '';
                                        setTemplateId(id);
                                        if (id && opt?.details) {
                                            setDescription(opt.details);
                                        }
                                    }}
                                    searchKeys={['name']}
                                />
                            </div>
                        </div>

                        <div className="voice-notes-description">
                            <div className="voice-notes-field">
                                <label>Description</label>
                                <textarea
                                    placeholder="Add a description for this voice note..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="voice-notes-main-grid">
                            <VoiceTranscriptPanel
                                transcript={transcript}
                                onTranscriptChange={setTranscript}
                                isRecording={isRecording}
                                onToggleRecording={handleToggleRecording}
                            />
                            <AISummaryPanel
                                summary={summary}
                                onDelete={handleDeleteSummary}
                                onRegenerate={handleRegenerateSummary}
                                onCopy={handleCopySummary}
                                onExportPdf={handleExportPdf}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 11,
                                color: 'var(--text-secondary)',
                            }}
                        >
                            {selectedPatient && (
                                <span>
                                    <strong>Patient:</strong> {selectedPatient.name}{' '}
                                </span>
                            )}
                            {selectedDoctor && (
                                <span>
                                    &middot; <strong>Doctor:</strong> {selectedDoctor.name}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-save"
                            onClick={handleClose}
                            disabled={isSavingNote || isUploadingAudio || isGeneratingSummary}
                        >
                            <i className="fas fa-check" />
                            {isSavingNote || isUploadingAudio || isGeneratingSummary ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>

                <AddTemplateModal
                    isOpen={isAddingTemplate}
                    onClose={() => {
                        setIsAddingTemplate(false);
                        setNewTemplateName('');
                        setNewTemplateDetails('');
                    }}
                    templateName={newTemplateName}
                    onTemplateNameChange={setNewTemplateName}
                    templateDetails={newTemplateDetails}
                    onTemplateDetailsChange={setNewTemplateDetails}
                    onSave={handleSaveNewTemplate}
                    isSaving={isSavingTemplate}
                />
            </div>
        </div>
    );
};

export default AddVoiceNotePage;

