import { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import PeriodontalChart from '../../components/PeriodentalChart/PeriodontalChart';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import { supabase } from '../../config/supabase';
import { AuthContext } from '../../context/AuthContext';
import periodontalChartService from '../../service/periodontalChart';
import { useToast } from '../../components/Toast/Toast';

// Default tooth structure
const defaultTooth = (number) => ({
  id: number,
  number: number,
  isImplant: false,
  mobility: 0,
  furcation: 'None',
  furcationLingual: 'None',
  plaque: [false, false, false, false, false, false],
  bop: [false, false, false, false, false, false],
  gr: [0, 0, 0, 0, 0, 0],
  pd: [1, 1, 1, 1, 1, 1]
});

// Default chart data (32 teeth)
const defaultChartData = Array.from({ length: 32 }, (_, i) => defaultTooth(i + 1));

const AddPeriodentalChart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const showToast = useToast();

  // Get mode and chart data from location state
  const mode = location.state?.mode || 'create'; // 'create', 'view', 'edit'
  const originalChartData = location.state?.chartData || null;

  // Form fields
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateCreated, setDateCreated] = useState(new Date().toISOString().split('T')[0]);
  const [chartId, setChartId] = useState(null);

  // Chart data (32 teeth)
  const [chartData, setChartData] = useState(defaultChartData);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // WebSocket states
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Audio states
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [duration, setDuration] = useState(0);

  // Dropdown data
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Other states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [shouldUploadOnStop, setShouldUploadOnStop] = useState(false);

  // Refs
  const recordingIntervalRef = useRef(null);
  const summaryStatusIntervalRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch patients and doctors on mount
  useEffect(() => {
    fetchPatientsAndDoctors();
  }, [user]);

  // Load existing chart data in view/edit mode
  useEffect(() => {
    if ((mode === 'view' || mode === 'edit') && originalChartData) {
      setChartId(originalChartData.id);
      setSelectedPatient(originalChartData.patient_id?.toString() || '');
      setSelectedDoctor(originalChartData.doctor_id?.toString() || '');
      setDateOfBirth(originalChartData.dob || '');
      setDateCreated(originalChartData.chart_date || '');
      setChartData(originalChartData.tooth_data || defaultChartData);
      setAudioUrl(originalChartData.recording_url || '');
      setDuration(originalChartData.duration_seconds || 0);

      // Load transcript if exists
      if (originalChartData.transcript_url) {
        fetchTranscript(originalChartData.transcript_url);
      }

      // Check if summary is generating
      if (originalChartData.isSummaryGenerating) {
        setIsSummaryGenerating(true);
        pollSummaryStatus(originalChartData.id, (summary) => {
          if (summary && Array.isArray(summary)) {
            applyAISummaryToChart(summary);
          }
        });
      }
    }
  }, [originalChartData, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (summaryStatusIntervalRef.current) {
        clearInterval(summaryStatusIntervalRef.current);
      }
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch patients and doctors
  const fetchPatientsAndDoctors = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, name').eq('user_id', user.id),
        supabase.from('doctors').select('id, name').eq('user_id', user.id)
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (doctorsRes.data) setDoctors(doctorsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load patients and doctors', 'error');
    }
  };

  // Fetch transcript from URL
  const fetchTranscript = async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      const text = await response.text();
      setLiveTranscript(text);
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  };

  // Validation
  const validateForm = () => {
    if (!selectedPatient) {
      showToast('Please select a patient', 'error');
      return false;
    }
    if (!selectedDoctor) {
      showToast('Please select a doctor', 'error');
      return false;
    }
    if (!dateOfBirth) {
      showToast('Please select date of birth', 'error');
      return false;
    }
    if (!dateCreated) {
      showToast('Please select date created', 'error');
      return false;
    }
    if (new Date(dateOfBirth) > new Date()) {
      showToast('Date of birth cannot be in the future', 'error');
      return false;
    }
    if (new Date(dateCreated) > new Date()) {
      showToast('Date created cannot be in the future', 'error');
      return false;
    }
    return true;
  };

  // Save chart (create or update)
  const handleSaveChart = async (returnId = false) => {
    if (!validateForm()) return null;

    try {
      setIsSaving(true);

      const payload = {
        patient_id: parseInt(selectedPatient),
        doctor_id: parseInt(selectedDoctor),
        dob: dateOfBirth,
        chart_date: dateCreated,
        tooth_data: chartData,
      };

      let savedChart;
      if (chartId) {
        // Update existing chart
        const response = await periodontalChartService.updatePeriodontalChart(chartId, payload);
        savedChart = response.data.data;
        showToast('Chart updated successfully', 'success');
      } else {
        // Create new chart
        const response = await periodontalChartService.createPeriodontalChart(payload);
        savedChart = response.data.data;
        setChartId(savedChart.id);
        showToast('Chart created successfully', 'success');
      }

      if (returnId) {
        return savedChart.id;
      }

      if (mode === 'create') {
        navigate('/periodontal-charts');
      }
    } catch (error) {
      console.error('Error saving chart:', error);
      showToast(error.response?.data?.message || 'Failed to save chart', 'error');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Update chart (for edit mode)
  const handleUpdateChart = async (newChartData = chartData, chartIdToUse = chartId) => {
    if (!chartIdToUse) return;

    try {
      const payload = {
        patient_id: parseInt(selectedPatient),
        doctor_id: parseInt(selectedDoctor),
        dob: dateOfBirth,
        chart_date: dateCreated,
        tooth_data: newChartData,
      };

      await periodontalChartService.updatePeriodontalChart(chartIdToUse, payload);
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    let newChartId = chartId;
    setLiveTranscript('');

    // Create chart entry first if doesn't exist
    if (!chartId) {
      setIsRecordingLoading(true);
      newChartId = await handleSaveChart(true);
    }

    if (!newChartId) {
      setIsRecordingLoading(false);
      return;
    }
    setChartId(newChartId);

    // Connect WebSocket for live transcription
    try {
      const ws = await connectWebSocket(newChartId);
      setIsRecordingLoading(false);

      // Start media recorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks = [];
      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks([...chunks]);

          // Send to WebSocket for transcription
          if (ws && ws.readyState === WebSocket.OPEN) {
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

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setShouldUploadOnStop(true);

        // Stop stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000); // Send chunks every 1 second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast('Failed to start recording', 'error');
      setIsRecordingLoading(false);
    }
  };

  // Connect WebSocket
  const connectWebSocket = (chartId) => {
    return new Promise((resolve, reject) => {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const wsUrl = baseUrl.replace('http', 'ws') + `/ws/transcribe?voiceNoteId=${chartId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setWsConnection(ws);
        wsRef.current = ws;
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'transcript') {
            setLiveTranscript(prev => prev + ' ' + message.text);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setWsConnection(null);
        wsRef.current = null;
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  };

  // Upload audio when recording stops
  useEffect(() => {
    if (!isRecording && audioChunks.length > 0 && shouldUploadOnStop) {
      uploadAudioToBackend(audioBlob);
      setShouldUploadOnStop(false);
    }
  }, [isRecording, audioChunks, shouldUploadOnStop]);

  const uploadAudioToBackend = async (newBlob) => {
    if (!newBlob || !chartId) return;

    try {
      setIsUploadingAudio(true);

      const formData = new FormData();
      formData.append('audio', newBlob, `chart_${chartId}_${Date.now()}.webm`);
      formData.append('duration', recordingTime.toString());

      await periodontalChartService.uploadPeriodentalChartAudio(chartId, formData);

      // Generate AI summary from transcript
      if (liveTranscript.trim()) {
        await generateChartSummary(liveTranscript, chartId);
      }

      showToast('Audio uploaded successfully', 'success');
    } catch (error) {
      console.error('Error uploading audio:', error);
      showToast('Failed to upload audio', 'error');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Generate AI summary from transcript
  const generateChartSummary = async (transcript, chartId) => {
    if (!chartId || !transcript) return;

    try {
      setIsSummaryGenerating(true);

      await periodontalChartService.generateAIChartSummary(chartId, {
        transcript
      });

      // Start polling for summary status
      pollSummaryStatus(chartId, (summary) => {
        if (summary && Array.isArray(summary)) {
          applyAISummaryToChart(summary);
        }
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      showToast('Failed to generate AI summary', 'error');
      setIsSummaryGenerating(false);
    }
  };

  // Poll for AI summary status
  const pollSummaryStatus = (chartId, onComplete) => {
    summaryStatusIntervalRef.current = setInterval(async () => {
      try {
        const response = await periodontalChartService.getPeriodontalChartSummaryStatus(chartId);
        const { isSummaryGenerating, summary } = response.data.data;

        if (!isSummaryGenerating && summary) {
          clearInterval(summaryStatusIntervalRef.current);
          setIsSummaryGenerating(false);

          if (onComplete) {
            onComplete(summary);
          }
        }
      } catch (error) {
        console.error('Error polling summary status:', error);
        clearInterval(summaryStatusIntervalRef.current);
        setIsSummaryGenerating(false);
      }
    }, 10000); // Poll every 10 seconds
  };

  // Apply AI summary to chart
  const applyAISummaryToChart = (aiSummary) => {
    const newChartData = [...chartData];

    aiSummary.forEach(aiTooth => {
      const toothIndex = aiTooth.number - 1;
      if (toothIndex >= 0 && toothIndex < 32) {
        newChartData[toothIndex] = {
          ...newChartData[toothIndex],
          ...aiTooth,
          id: aiTooth.number,
          number: aiTooth.number,
        };
      }
    });

    setChartData(newChartData);
    handleUpdateChart(newChartData, chartId);
    showToast('AI summary applied to chart', 'success');
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      const doctor = doctors.find(d => d.id === parseInt(selectedDoctor));

      doc.setFontSize(18);
      doc.text('Periodontal Chart', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Patient: ${patient?.name || 'N/A'}`, 20, 40);
      doc.text(`Doctor: ${doctor?.name || 'N/A'}`, 20, 50);
      doc.text(`Date of Birth: ${dateOfBirth}`, 20, 60);
      doc.text(`Chart Date: ${dateCreated}`, 20, 70);

      doc.text('Chart data exported. See digital version for details.', 20, 90);

      doc.save(`periodontal_chart_${chartId}_${Date.now()}.pdf`);
      showToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF', 'error');
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const isReadOnly = mode === 'view';

  return (
    <div className={`add-periodontal-chart-page ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/periodontal-charts')}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>
            {mode === 'create' && 'Add New Periodontal Chart'}
            {mode === 'view' && 'View Periodontal Chart'}
            {mode === 'edit' && 'Edit Periodontal Chart'}
          </h2>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
            <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
          </button>
          {!isReadOnly && (
            <button
              className="save-btn"
              onClick={() => handleSaveChart()}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (chartId ? 'Update Chart' : 'Save Chart')}
            </button>
          )}
          {mode === 'view' && (
            <button className="export-btn" onClick={handleExportPDF}>
              <i className="fas fa-file-pdf"></i> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Form and Recording Section Container */}
      <div className="form-recording-container">
        {/* Form Section */}
        <div className="form-section">
          <div className="form-row">
            <SearchableDropdown
              label="Patient Name"
              required={true}
              options={patients}
              value={selectedPatient}
              onChange={(patient) => setSelectedPatient(patient.id.toString())}
              placeholder="Select Patient"
              disabled={isReadOnly}
            />

            <SearchableDropdown
              label="Doctor Name"
              required={true}
              options={doctors}
              value={selectedDoctor}
              onChange={(doctor) => setSelectedDoctor(doctor.id.toString())}
              placeholder="Select Doctor"
              disabled={isReadOnly}
            />

            <div className="form-group">
              <label>Date of Birth <span className="required">*</span></label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="form-group">
              <label>Date Created <span className="required">*</span></label>
              <input
                type="date"
                value={dateCreated}
                onChange={(e) => setDateCreated(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={isReadOnly}
                required
              />
            </div>
          </div>
        </div>

        {/* Voice Input Section */}
        {!isReadOnly && (
          <div className="voice-input-section">
            <div className="voice-input-header">
              <span>Voice Input</span>
            </div>
            <div className="recording-controls">
              {!isRecording ? (
                <button
                  className="record-btn-circle"
                  onClick={startRecording}
                  disabled={isRecordingLoading}
                  title="Start Recording"
                >
                  {isRecordingLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-microphone"></i>
                  )}
                </button>
              ) : (
                <>
                  <div className="recording-time">{formatTime(recordingTime)}</div>
                  <button className="stop-btn-circle" onClick={stopRecording} title="Stop Recording">
                    <i className="fas fa-check"></i>
                  </button>
                </>
              )}
            </div>

            {isRecording && (
              <div className="recording-status">
                <span className="recording-dot"></span>
                <span>Recording...</span>
              </div>
            )}

            {liveTranscript && (
              <div className="transcript-preview">
                <p>{liveTranscript}</p>
              </div>
            )}

            {audioUrl && (
              <div className="audio-player-compact">
                <audio controls src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {isUploadingAudio && (
              <div className="status-message">
                <i className="fas fa-spinner fa-spin"></i> Uploading...
              </div>
            )}

            {isSummaryGenerating && (
              <div className="status-message">
                <i className="fas fa-spinner fa-spin"></i> Generating summary...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="chart-section-cover">
        <div className="chart-section">
          <PeriodontalChart
            chartData={chartData}
            setChartData={setChartData}
            mode={mode}
          />
        </div>
      </div>
    </div>
  );
};

export default AddPeriodentalChart;
