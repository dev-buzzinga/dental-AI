import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import '../../styles/VoiceNotes.css';
import VoiceTranscriptPanel from '../../components/VoiceNotes/VoiceTranscriptPanel';
import AISummaryPanel from '../../components/VoiceNotes/AISummaryPanel';
import AddTemplateModal from '../../components/VoiceNotes/AddTemplateModal';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import aiScribeService from '../../service/ai-scribe';
import { useToast } from '../../components/Toast/Toast';
const AddVoiceNotePage = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const showToast = useToast();

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
    const [sessionId, setSessionId] = useState(null); // Changed from voiceNoteId to sessionId
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);

    const liveTranscriptRef = useRef(transcript);
    const recordingIntervalRef = useRef(null);
    const shouldUploadOnStopRef = useRef(false);
    const mediaRecorderRef = useRef(null);
    const wsConnectionRef = useRef(null);

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
    }, []);

    const connectWebSocket = (newSessionId) => {
        return new Promise((resolve, reject) => {
            if (!newSessionId) {
                console.error('❌ No sessionId available');
                reject('No sessionId');
                return;
            }

            const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('http', 'ws')}/ws/transcribe?voiceNoteId=${newSessionId}`;
            console.log('📡 Connecting to:', wsUrl);
            const ws = new WebSocket(wsUrl);

            let connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.error('⏱️ WebSocket connection timeout');
                    ws.close();
                    reject('Connection timeout');
                }
            }, 10000); // 10 second timeout

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ WebSocket connected successfully');
                setIsConnected(true);
                setWsConnection(ws);
                wsConnectionRef.current = ws;
                resolve(ws);
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('❌ WebSocket error:', error);
                reject(error);
            };

            ws.onclose = (event) => {
                console.log('🔌 WebSocket closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                setIsConnected(false);

                // Warning but don't stop recording - user can still save the audio
                console.warn('⚠️ WebSocket closed - Live transcription unavailable, but recording continues');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'connected') {
                        console.log('✅ Transcription service connected');
                    } else if (data.type === 'transcript') {
                        // Use accumulated transcript (already cleaned by backend)
                        // Backend sends accumulated text with only final transcripts
                        if (data.accumulated) {
                            console.log('📝 Final transcript:', data.accumulated);
                            setTranscript(data.accumulated);
                        }
                    } else if (data.type === 'error') {
                        console.error('❌ Server error:', data.message);
                    }
                } catch (err) {
                    console.error('❌ Error parsing ws message:', err);
                }
            };
        });
    };

    const disconnectWebSocket = () => {
        const ws = wsConnectionRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('🔌 Manually closing WebSocket');
            ws.close();
            wsConnectionRef.current = null;
            setWsConnection(null);
            setIsConnected(false);
        }
    };

    // Generate a UUID v4 for temporary session
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const startRecording = async () => {
        // Generate a temporary session ID (UUID) for this recording
        // No database entry is created at this point
        let newSessionId = sessionId;
        if (!sessionId) {
            newSessionId = generateUUID();
            setSessionId(newSessionId);
            console.log('📝 Generated session ID:', newSessionId);
        }

        // Reset flag - don't upload until user explicitly saves
        shouldUploadOnStopRef.current = false;

        try {
            // Step 1: Connect WebSocket for live transcription
            console.log('📡 Step 1: Connecting WebSocket for sessionId:', newSessionId);
            const ws = await connectWebSocket(newSessionId);
            console.log('✅ Step 1 Complete: WebSocket connected and ready');

            // Wait a bit for Deepgram to be ready on backend
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('⏱️ Waited for backend setup');

            // Step 2: Get microphone access
            console.log('🎤 Step 2: Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Step 2 Complete: Microphone access granted');
            // Step 3: Create MediaRecorder
            console.log('🎙️ Step 3: Creating MediaRecorder...');
            let recorder;
            let mimeType = 'audio/webm;codecs=opus';

            try {
                if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    console.warn('⚠️ audio/webm;codecs=opus not supported');
                    mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported('audio/webm')) {
                        throw new Error('Browser does not support audio/webm recording');
                    }
                }

                recorder = new MediaRecorder(stream, { mimeType });
                console.log('✅ Step 3 Complete: MediaRecorder created with', mimeType);
            } catch (err) {
                console.error('❌ MediaRecorder creation failed:', err);
                ws.close();
                stream.getTracks().forEach(track => track.stop());
                throw new Error(`MediaRecorder not supported: ${err.message}`);
            }

            const chunks = [];
            console.log('📦 Audio chunks array initialized');

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
                    } else {
                        console.warn('⚠️ WebSocket not open, state:', ws.readyState);
                    }
                } else {
                    console.warn('⚠️ Audio data size is 0 - No chunk collected!');
                }
            };

            recorder.onerror = (error) => {
                console.error('❌ MediaRecorder error:', error);
            };

            recorder.onstart = () => {
                console.log('▶️ MediaRecorder started');
            };

            // Step 4: When recording stops
            recorder.onstop = () => {
                console.log('🛑 Recording stopped');
                // console.log('📊 MediaRecorder state:', recorder.state);
                // console.log('📦 Total chunks collected:', chunks.length);
                
                // // Debug chunk details
                // chunks.forEach((chunk, idx) => {
                //     console.log(`  Chunk ${idx}: size=${chunk.size} bytes, type=${chunk.type}`);
                // });

                const audioBlob = new Blob(chunks, { type: 'audio/webm' });

                setAudioChunks(chunks);
                setAudioBlob(audioBlob);

                // Only upload and generate summary if user explicitly saved (green tick)
                if (shouldUploadOnStopRef.current && chunks.length > 0) {
                    console.log('✅ User saved - uploading audio and generating summary');
                    uploadAudioAndGenerateSummary(audioBlob, newSessionId);
                } else {
                    console.log('❌ Recording cancelled or no audio. Chunks:', chunks.length, ', Should upload:', shouldUploadOnStopRef.current);
                }

                // Stop all tracks
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log('🛑 Track stopped:', track.kind);
                });
            };

            // Step 5: Start recording
            console.log('▶️ Step 5: Starting MediaRecorder...');
            try {
                recorder.start(1000); // Capture data every 1 second
                console.log('✅ recorder.start() called successfully');
            } catch (startError) {
                console.error('❌ recorder.start() failed:', startError);
                ws.close();
                stream.getTracks().forEach(track => track.stop());
                throw startError;
            }

            mediaRecorderRef.current = recorder;
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            console.log('🎤 Step 5 Complete: Recording started successfully');
            console.log('📊 MediaRecorder state:', recorder.state);

            // Timer for recording duration
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            console.log('✅ ALL STEPS COMPLETE - Recording in progress!');

        } catch (error) {
            console.error('❌ RECORDING START FAILED');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            // console.error('Error stack:', error.stack);

            // Cleanup
            disconnectWebSocket();
            setIsRecording(false);
            setIsSavingNote(false);

            // User-friendly error message
            let errorMsg = 'Failed to start recording.';
            if (error.name === 'NotAllowedError') {
                errorMsg = 'Microphone permission denied. Please allow microphone access.';
            } else if (error.name === 'NotFoundError') {
                errorMsg = 'No microphone found. Please connect a microphone.';
            } else if (error.message.includes('MediaRecorder')) {
                errorMsg = 'Your browser does not support audio recording.';
            } else if (error.message.includes('WebSocket')) {
                errorMsg = 'Failed to connect to transcription service.';
            } else {
                errorMsg = `Error: ${error.message}`;
            }

            alert(errorMsg);
        }
    };

    const pauseRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'recording') {
            recorder.pause();
            setIsPaused(true);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const resumeRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'paused') {
            recorder.resume();
            setIsPaused(false);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const stopRecording = () => {
        console.log('🛑 Stopping recording...');
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            
            // Request final data before stopping (important for capturing last chunk)
            try {
                recorder.requestData();
                console.log('✅ requestData() called - forcing final chunk');
            } catch (e) {
                console.warn('⚠️ requestData() failed:', e);
            }
            
            recorder.stop();
            setIsRecording(false);
            setIsPaused(false);
            clearInterval(recordingIntervalRef.current);
            disconnectWebSocket();
        } else {
            console.warn('⚠️ MediaRecorder is null or already inactive');
        }
    };

    // Stop and Save - Green Tick
    const stopAndSaveRecording = () => {
        console.log('💾 User clicked save (green tick)');
        shouldUploadOnStopRef.current = true;
        stopRecording();
    };

    // Stop and Cancel - Red Tick
    const stopAndCancelRecording = () => {
        console.log('🗑️ User clicked cancel (red tick)');
        shouldUploadOnStopRef.current = false;
        stopRecording();
        // Clear transcript and audio
        setTranscript('');
        setAudioChunks([]);
        setAudioBlob(null);
    };

    const handleToggleRecording = () => {
        // Start recording: validate required dropdowns
        if (!isRecording) {
            if (!patientId || !doctorId || !templateId) {
                showToast('Patient Name, Doctor Name, and Select Template are required before recording.', 'error');
                return;
            }
            startRecording();
            return;
        }

        // Already recording: toggle pause / resume
        if (isPaused) {
            resumeRecording();
        } else {
            pauseRecording();
        }
    };

    const uploadAudioAndGenerateSummary = async (blob, currentSessionId) => {
        if (!blob || !currentSessionId) {
            console.error('❌ Cannot upload - missing blob or sessionId');
            return;
        }

        console.log('🤖 Generating AI Summary after recording stopped...');

        // Generate AI summary preview (without saving to database)
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

            console.log('📤 Calling AI Summary API...');
            const response = await aiScribeService.generateAiScribeSummaryPreview(payload);

            if (response.data && response.data.success && response.data.data) {
                console.log('✅ AI Summary generated successfully');
                setSummary(response.data.data.ai_summary);
            } else {
                console.warn('⚠️ AI Summary response invalid:', response.data);
            }
        } catch (error) {
            console.error('❌ Failed to generate AI summary:', error);
            showToast('Failed to generate AI summary. You can regenerate it later.', 'error');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleClose = () => {
        navigate('/voice-notes');
    };

    // New function: Save complete voice note to database
    const handleSaveCompleteVoiceNote = async () => {
        if (!patientId || !doctorId || !templateId) {
            showToast('Patient Name, Doctor Name, and Select Template are required.', 'error');
            return;
        }

        if (!transcript || !audioBlob) {
            showToast('Please record audio before saving.', 'error');
            return;
        }

        setIsSavingNote(true);

        try {
            // Step 1: Create voice note entry with transcript and summary
            console.log('💾 Step 1: Creating voice note entry with transcript and AI summary...');
            const payload = {
                sessionId: sessionId, // Backend will get transcript from memory
                user_id: user.id,
                patient_id: patientId,
                doctor_id: doctorId,
                template_id: templateId || null,
                description: description || null,
                date_created: dateCreated,
                transcript: transcript, // Pass transcript explicitly
                ai_summary: summary || null, // Pass existing AI summary (already generated on green tick)
            };

            const response = await aiScribeService.saveCompleteVoiceNote(payload);

            if (!response.data || !response.data.success || !response.data.data) {
                throw new Error('Failed to create voice note entry');
            }

            const newVoiceNoteId = response.data.data.id;
            console.log('✅ Voice note created with ID:', newVoiceNoteId);

            // Step 2: Upload audio file
            if (audioBlob) {
                console.log('📤 Step 2: Uploading audio file...');
                setIsUploadingAudio(true);
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');
                formData.append('duration', recordingTime.toString());

                const audioResponse = await aiScribeService.uploadAiScribeAudio(newVoiceNoteId, formData);
                if (audioResponse.data && audioResponse.data.url) {
                    console.log('✅ Audio uploaded successfully');
                }
                setIsUploadingAudio(false);
            }

            // Step 3: AI Summary already saved in Step 1
            // No need to save again - summary was passed in initial payload
            console.log('✅ Step 3: AI summary already saved with voice note entry (no regeneration)');
            if (summary) {
                console.log('ℹ️ Summary that was shown to user is now in database');
            } else {
                console.log('ℹ️ No summary was generated - user can generate later');
            }

            // Success!
            showToast('Voice note saved successfully!', 'success');
            navigate('/voice-notes');
        } catch (error) {
            console.error('Error saving voice note:', error);
            showToast('Failed to save voice note. Please try again.', 'error');
        } finally {
            setIsSavingNote(false);
            setIsUploadingAudio(false);
            setIsGeneratingSummary(false);
        }
    };

    const handleDeleteSummary = () => {
        setSummary('');
    };

    const handleRegenerateSummary = async () => {
        if (!transcript) {
            showToast('Please record audio first', 'error');
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

            const response = await aiScribeService.generateAiScribeSummaryPreview(payload);

            if (response.data && response.data.success && response.data.data) {
                setSummary(response.data.data.ai_summary);
                showToast('AI Summary regenerated successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            showToast('Failed to generate AI summary. Try again.', 'error');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Cleanup on unmount ONLY - no dependencies to prevent premature cleanup
    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting - cleanup started');

            // Stop recording if active
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state !== 'inactive') {
                console.log('🛑 Stopping active recorder on unmount');
                recorder.stop();
                recorder.stream.getTracks().forEach(track => track.stop());
            }

            // Disconnect WebSocket
            const ws = wsConnectionRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('🔌 Disconnecting WebSocket on unmount');
                ws.close();
            }

            // Clear timer
            if (recordingIntervalRef.current) {
                console.log('⏱️ Clearing recording timer on unmount');
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []); // Empty dependency array - cleanup ONLY on unmount

    const handleCopySummary = async () => {
        if (!summary) return;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(summary);
                showToast('Copied to clipboard!', 'success');
            } else {
                showToast('Copy not supported in this browser.', 'error');
            }
        } catch {
            showToast('Failed to copy. Please try again.', 'error');
        }
    };

    const handleExportPdf = () => {
        if (!summary) {
            showToast('No AI summary to export.', 'error');
            return;
        }

        try {
            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4',
            });

            const marginLeft = 40;
            const marginTop = 40;
            const maxWidth = 515; // A4 width (595pt) - 2 * 40 margin
            const lineHeight = 18;

            // Use plain text version of the summary
            const plainSummary = summary.replace(/\r\n/g, '\n');
            const lines = doc.splitTextToSize(plainSummary, maxWidth);

            let cursorY = marginTop;

            lines.forEach((line) => {
                if (cursorY > 800) {
                    doc.addPage();
                    cursorY = marginTop;
                }
                doc.text(line, marginLeft, cursorY);
                cursorY += lineHeight;
            });

            const fileName = `dental-summary-${dateCreated || 'note'}.pdf`;
            doc.save(fileName);
            showToast('PDF downloaded successfully.', 'success');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('PDF export failed:', error);
            showToast('Failed to export PDF. Please try again.', 'error');
        }
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

    const handleBack = () => {
        navigate('/voice-notes');
    };

    return (
        <div className="voice-notes-page">
            <div className="voice-notes-header">
                <div className="voice-notes-header-left">
                    <button className="patient-detail-back" onClick={handleBack}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <h2 className="voice-notes-title">Add Voice Notes</h2>
                </div>
                <div className="voice-notes-header-actions">
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
                        onClick={handleSaveCompleteVoiceNote}
                        disabled={isSavingNote || isUploadingAudio || isGeneratingSummary || !transcript || !audioBlob}
                    >
                        <i className="fas fa-check" />
                        {isSavingNote ? 'Saving...' : 'Save Note'}
                    </button>
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
                                recordingTime={recordingTime}
                                onToggleRecording={handleToggleRecording}
                                onSaveRecording={stopAndSaveRecording}
                                onCancelRecording={stopAndCancelRecording}
                            />
                            <AISummaryPanel
                                summary={summary}
                                onDelete={handleDeleteSummary}
                                onRegenerate={handleRegenerateSummary}
                                onCopy={handleCopySummary}
                                onExportPdf={handleExportPdf}
                                isGenerating={isGeneratingSummary}
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

